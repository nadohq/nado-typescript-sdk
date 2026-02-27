import {
  EngineClient,
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
  PENDING_TRIGGER_STATUS_TYPES,
  TEST_DELAYS,
  TEST_SUBACCOUNT_NAME,
} from './testConstants';
import { withRetry } from './withRetry';

export interface CleanupOptions {
  subaccountOwner: string;
  subaccountName?: string;
  endpointAddr: string;
  chainId: number;
}

export interface CleanupHints {
  /** Set to true if the test placed trigger orders. */
  hasTriggerOrders?: boolean;
  /** Set to true if the test placed engine orders. */
  hasEngineOrders?: boolean;
  /** Set to true if the test opened perp positions. */
  hasPerpPositions?: boolean;
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
 * Queries all open state (trigger orders, engine orders, perp positions) and cleans everything.
 * Each step is independent — failures are collected and re-thrown after all steps complete
 * so that one broken step never prevents the others from running.
 *
 * @param clients - Engine and trigger client instances.
 * @param opts - Subaccount and chain identification.
 */
export async function cleanupTestState(
  clients: { engine: EngineClient; trigger: TriggerClient },
  opts: CleanupOptions,
  hints?: CleanupHints,
): Promise<void> {
  await delay(TEST_DELAYS.CLEANUP_EXECUTE_DELAY);

  const subaccountName = opts.subaccountName ?? TEST_SUBACCOUNT_NAME;
  const errors: unknown[] = [];

  const shouldCancelTriggers = !hints || hints.hasTriggerOrders === true;
  const shouldCancelEngineOrders = !hints || hints.hasEngineOrders === true;
  const shouldClosePositions = !hints || hints.hasPerpPositions === true;
  const needSubaccountSummary = shouldClosePositions;
  const needMarkets = shouldCancelEngineOrders || shouldClosePositions;

  // Query only the state types the test actually mutated
  const [triggerOrders, subaccountSummary, isolatedPositions, allMarkets] =
    await Promise.all([
      shouldCancelTriggers
        ? withRetry(() =>
            clients.trigger.listOrders({
              chainId: opts.chainId,
              subaccountName,
              subaccountOwner: opts.subaccountOwner,
              verifyingAddr: opts.endpointAddr,
              statusTypes: PENDING_TRIGGER_STATUS_TYPES,
            }),
          ).catch((err) => {
            errors.push(err);
            return null;
          })
        : null,
      needSubaccountSummary
        ? withRetry(() =>
            clients.engine.getSubaccountSummary({
              subaccountOwner: opts.subaccountOwner,
              subaccountName,
            }),
          ).catch((err) => {
            errors.push(err);
            return null;
          })
        : null,
      shouldClosePositions
        ? withRetry(() =>
            clients.engine.getIsolatedPositions({
              subaccountOwner: opts.subaccountOwner,
              subaccountName,
            }),
          ).catch((err) => {
            errors.push(err);
            return null;
          })
        : null,
      needMarkets
        ? getCachedMarkets().catch((err) => {
            errors.push(err);
            return null;
          })
        : null,
    ]);

  const marketByProductId = new Map(
    allMarkets?.map((m) => [m.productId, m]) ?? [],
  );

  // 1. Cancel pending trigger orders by digest (arrays must be parallel)
  if (triggerOrders && triggerOrders.orders.length > 0) {
    const digests = triggerOrders.orders.map((o) => o.order.digest);
    const productIds = triggerOrders.orders.map((o) => o.order.productId);

    await delay(TEST_DELAYS.CLEANUP_EXECUTE_DELAY);
    await safeRun(errors, async () => {
      try {
        await withRetry(() =>
          clients.trigger.cancelTriggerOrders({
            digests,
            productIds,
            subaccountName,
            subaccountOwner: opts.subaccountOwner,
            verifyingAddr: opts.endpointAddr,
            chainId: opts.chainId,
          }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('could not be found')) return;
        throw err;
      }
    });
  }

  // 2. Cancel all engine orders across every tradeable market
  const allTradeableProductIds = allMarkets
    ? allMarkets.map((m) => m.productId)
    : [];

  if (shouldCancelEngineOrders && allTradeableProductIds.length > 0) {
    await delay(TEST_DELAYS.CLEANUP_EXECUTE_DELAY);
    await safeRun(errors, () =>
      withRetry(() =>
        clients.engine.cancelProductOrders({
          subaccountName,
          subaccountOwner: opts.subaccountOwner,
          productIds: allTradeableProductIds,
          verifyingAddr: opts.endpointAddr,
          chainId: opts.chainId,
        }),
      ),
    );
  }

  // 3 & 4. Close open perp positions (cross + isolated)
  const crossPerps = subaccountSummary
    ? subaccountSummary.balances.filter(
        (b) => b.type === ProductEngineType.PERP && !b.amount.isZero(),
      )
    : [];
  const openIsolated = isolatedPositions
    ? isolatedPositions.filter((p) => !p.baseBalance.amount.isZero())
    : [];

  if (crossPerps.length > 0 || openIsolated.length > 0) {
    const productIds = [
      ...crossPerps.map((b) => b.productId),
      ...openIsolated.map((p) => p.baseBalance.productId),
    ];
    const uniqueProductIds = [...new Set(productIds)];

    const priceByProduct = await fetchPriceMap(
      clients.engine,
      uniqueProductIds,
    );

    if (crossPerps.length > 0) {
      await delay(TEST_DELAYS.CLEANUP_EXECUTE_DELAY);
      await safeRun(errors, () =>
        closeCrossPositions(
          clients.engine,
          crossPerps as PerpBalanceWithProduct[],
          marketByProductId,
          priceByProduct,
          {
            subaccountOwner: opts.subaccountOwner,
            subaccountName,
            chainId: opts.chainId,
          },
        ),
      );
    }

    if (openIsolated.length > 0) {
      await delay(TEST_DELAYS.CLEANUP_EXECUTE_DELAY);
      await safeRun(errors, () =>
        closeIsolatedPositions(
          clients.engine,
          openIsolated,
          marketByProductId,
          priceByProduct,
          {
            subaccountOwner: opts.subaccountOwner,
            subaccountName,
            chainId: opts.chainId,
          },
        ),
      );
    }
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

async function closeCrossPositions(
  engine: EngineClient,
  openPerps: PerpBalanceWithProduct[],
  marketByProductId: Map<number, MarketWithProduct>,
  priceByProduct: Map<number, { bid: BigDecimal; ask: BigDecimal }>,
  opts: { subaccountOwner: string; subaccountName: string; chainId: number },
): Promise<void> {
  for (const balance of openPerps) {
    await delay(TEST_DELAYS.CLEANUP_EXECUTE_DELAY);
    await placeCloseOrder(engine, balance, priceByProduct, marketByProductId, {
      ...opts,
      appendix: REDUCE_ONLY_IOC_APPENDIX,
    });
  }
}

async function closeIsolatedPositions(
  engine: EngineClient,
  openPositions: SubaccountIsolatedPosition[],
  marketByProductId: Map<number, MarketWithProduct>,
  priceByProduct: Map<number, { bid: BigDecimal; ask: BigDecimal }>,
  opts: { subaccountOwner: string; subaccountName: string; chainId: number },
): Promise<void> {
  for (const position of openPositions) {
    await delay(TEST_DELAYS.CLEANUP_EXECUTE_DELAY);
    await placeCloseOrder(
      engine,
      position.baseBalance,
      priceByProduct,
      marketByProductId,
      {
        ...opts,
        appendix: REDUCE_ONLY_IOC_ISOLATED_APPENDIX,
      },
    );
  }
}

async function fetchPriceMap(engine: EngineClient, productIds: number[]) {
  const { marketPrices } = await withRetry(() =>
    engine.getMarketPrices({ productIds }),
  );
  return new Map(marketPrices.map((mp) => [mp.productId, mp]));
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

async function placeCloseOrder(
  engine: EngineClient,
  balance: PerpBalanceWithProduct,
  priceByProduct: Map<number, { bid: BigDecimal; ask: BigDecimal }>,
  marketByProductId: Map<number, MarketWithProduct>,
  opts: {
    subaccountOwner: string;
    subaccountName: string;
    chainId: number;
    appendix: bigint;
  },
): Promise<void> {
  const mp = priceByProduct.get(balance.productId);
  if (!mp) return;

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

  const rawPrice = isLong
    ? mp.bid.multipliedBy(1 - CLOSE_SLIPPAGE_FACTOR)
    : mp.ask.multipliedBy(1 + CLOSE_SLIPPAGE_FACTOR);
  const closePrice = roundToIncrement(rawPrice, priceIncrement);

  if (closeAmount.isZero()) return;

  try {
    await withRetry(() =>
      engine.placeOrder({
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
      }),
    );
  } catch (err) {
    // Position may already be closed or dust-sized; don't fail cleanup.
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('increases position')) return;
    throw err;
  }
}
