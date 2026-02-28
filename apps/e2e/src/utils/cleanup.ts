import {
  EngineClient,
  EnginePlaceOrderParams,
  SubaccountIsolatedPosition,
} from '@nadohq/engine-client';
import {
  BigDecimal,
  getOrderNonce,
  getOrderVerifyingAddress,
  MarketWithProduct,
  packOrderAppendix,
  PerpBalanceWithProduct,
  ProductEngineType,
} from '@nadohq/shared';
import { TriggerClient } from '@nadohq/trigger-client';
import { delay } from './delay';
import { getExpiration } from './getExpiration';
import { getCachedMarkets } from './sharedTestSetup';
import {
  TEST_DELAYS,
  TEST_PRODUCT_ID_LIST,
  TEST_SUBACCOUNT_NAME,
} from './testConstants';
import { withRetry } from './withRetry';

export interface CleanupOptions {
  subaccountOwner: string;
  subaccountName?: string;
  endpointAddr: string;
  chainId: number;
}

/** Engine rejects orders outside 80%-120% of oracle price; use 19% to stay within bounds. */
const CLOSE_SLIPPAGE_FACTOR = 0.19;

const REDUCE_ONLY_IOC_APPENDIX = packOrderAppendix({
  orderExecutionType: 'ioc',
  reduceOnly: true,
});

const REDUCE_ONLY_IOC_ISOLATED_APPENDIX = packOrderAppendix({
  orderExecutionType: 'ioc',
  reduceOnly: true,
  isolated: { margin: 0n },
});

/**
 * Cancels all open orders (engine + trigger), then closes any remaining perp
 * positions in a single batch. Every step is fire-and-forget so one failure
 * never prevents later steps from running.
 *
 * @param clients - Engine and trigger client instances.
 * @param opts - Subaccount and chain identification.
 */
export async function cleanupTestState(
  clients: { engine: EngineClient; trigger: TriggerClient },
  opts: CleanupOptions,
): Promise<void> {
  const subaccountName = opts.subaccountName ?? TEST_SUBACCOUNT_NAME;
  const errors: unknown[] = [];

  const cancelParams = {
    subaccountName,
    subaccountOwner: opts.subaccountOwner,
    productIds: TEST_PRODUCT_ID_LIST,
    verifyingAddr: opts.endpointAddr,
    chainId: opts.chainId,
  };

  // 1. Cancel all engine + trigger orders in parallel (no queries needed)
  await Promise.all([
    safeRun(errors, () =>
      withRetry(() => clients.engine.cancelProductOrders(cancelParams)),
    ),
    safeRun(errors, () =>
      withRetry(() => clients.trigger.cancelProductOrders(cancelParams)),
    ),
  ]);

  // 2. Query subaccount summary + isolated positions in parallel
  const [subaccountSummary, isolatedPositions] = await Promise.all([
    withRetry(() =>
      clients.engine.getSubaccountSummary({
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
      }),
    ).catch((err) => {
      errors.push(err);
      return null;
    }),
    withRetry(() =>
      clients.engine.getIsolatedPositions({
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
      }),
    ).catch((err) => {
      errors.push(err);
      return null;
    }),
  ]);

  const crossPerps: PerpBalanceWithProduct[] = subaccountSummary
    ? (subaccountSummary.balances.filter(
        (b) => b.type === ProductEngineType.PERP && !b.amount.isZero(),
      ) as PerpBalanceWithProduct[])
    : [];
  const openIsolated: SubaccountIsolatedPosition[] = isolatedPositions
    ? isolatedPositions.filter((p) => !p.baseBalance.amount.isZero())
    : [];

  if (crossPerps.length === 0 && openIsolated.length === 0) {
    if (errors.length > 0) {
      throw new AggregateError(errors, 'cleanupTestState encountered errors');
    }
    return;
  }

  // 3. Fetch market increments, build close orders, batch execute
  const allMarkets = await getCachedMarkets().catch((err) => {
    errors.push(err);
    return null;
  });

  if (!allMarkets) {
    if (errors.length > 0) {
      throw new AggregateError(errors, 'cleanupTestState encountered errors');
    }
    return;
  }

  const marketByProductId = new Map(allMarkets.map((m) => [m.productId, m]));

  const closeOrders: EnginePlaceOrderParams[] = [
    ...crossPerps.flatMap((b) =>
      buildCloseOrder(b, marketByProductId, {
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
        chainId: opts.chainId,
        appendix: REDUCE_ONLY_IOC_APPENDIX,
      }),
    ),
    ...openIsolated.flatMap((p) =>
      buildCloseOrder(p.baseBalance, marketByProductId, {
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
        chainId: opts.chainId,
        appendix: REDUCE_ONLY_IOC_ISOLATED_APPENDIX,
      }),
    ),
  ];

  if (closeOrders.length > 0) {
    await delay(TEST_DELAYS.BETWEEN_CLEANUP_STEPS);
    await safeRun(errors, () =>
      withRetry(() => clients.engine.placeOrders({ orders: closeOrders })),
    );
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'cleanupTestState encountered errors');
  }
}

async function safeRun(
  errors: unknown[],
  fn: () => Promise<unknown>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    errors.push(err);
  }
}

/**
 * Rounds {@link value} down (toward zero) to the nearest multiple of {@link increment}.
 */
function roundToIncrement(
  value: BigDecimal,
  increment: BigDecimal,
): BigDecimal {
  if (increment.isZero()) return value;
  return value
    .div(increment)
    .integerValue(BigDecimal.ROUND_DOWN)
    .multipliedBy(increment);
}

/**
 * Builds a single close-order param for a perp position, or returns an empty
 * array if the position is dust-sized after rounding.
 */
function buildCloseOrder(
  balance: PerpBalanceWithProduct,
  marketByProductId: Map<number, MarketWithProduct>,
  opts: {
    subaccountOwner: string;
    subaccountName: string;
    chainId: number;
    appendix: bigint;
  },
): EnginePlaceOrderParams[] {
  const market = marketByProductId.get(balance.productId);
  const priceIncrement = market?.priceIncrement ?? new BigDecimal(1);
  const sizeIncrement = market?.sizeIncrement ?? new BigDecimal(1);

  const isLong = balance.amount.gt(0);
  const rawCloseAmount = isLong
    ? balance.amount.negated()
    : balance.amount.abs();
  const closeAmount = isLong
    ? roundToIncrement(rawCloseAmount, sizeIncrement)
    : roundToIncrement(rawCloseAmount, sizeIncrement).negated();

  if (closeAmount.isZero()) return [];

  const rawPrice = isLong
    ? balance.oraclePrice.multipliedBy(1 - CLOSE_SLIPPAGE_FACTOR)
    : balance.oraclePrice.multipliedBy(1 + CLOSE_SLIPPAGE_FACTOR);
  const closePrice = roundToIncrement(rawPrice, priceIncrement);

  return [
    {
      productId: balance.productId,
      verifyingAddr: getOrderVerifyingAddress(balance.productId),
      chainId: opts.chainId,
      order: {
        subaccountOwner: opts.subaccountOwner,
        subaccountName: opts.subaccountName,
        amount: closeAmount,
        price: closePrice,
        expiration: getExpiration(),
        appendix: opts.appendix,
      },
      nonce: getOrderNonce(),
    },
  ];
}
