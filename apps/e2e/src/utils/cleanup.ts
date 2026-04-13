import {
  EngineCancelProductOrdersParams,
  EngineClient,
  EnginePlaceOrderParams,
} from '@nadohq/engine-client';
import {
  getOrderNonce,
  getOrderVerifyingAddress,
  MarketWithProduct,
  packOrderAppendix,
  PerpBalanceWithProduct,
  ProductEngineType,
} from '@nadohq/shared';
import { TriggerClient } from '@nadohq/trigger-client';
import BigNumber from 'bignumber.js';
import { delay } from './delay';
import { getExpiration } from './getExpiration';
import { retryWithBackoff } from './retry';
import {
  TEST_DELAYS,
  TEST_PRODUCT_ID_LIST,
  TEST_SUBACCOUNT_NAME,
} from './testConstants';

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
 * positions in a single batch. Throws on the first error so failures are
 * immediately visible and debuggable.
 *
 * @param clients - Engine and trigger client instances.
 * @param opts - Subaccount and chain identification.
 */
export async function cleanupTestState(
  clients: { engine: EngineClient; trigger: TriggerClient },
  opts: CleanupOptions,
): Promise<void> {
  await delay(TEST_DELAYS.LONG);

  const subaccountName = opts.subaccountName ?? TEST_SUBACCOUNT_NAME;

  const cancelParams: EngineCancelProductOrdersParams = {
    subaccountName,
    subaccountOwner: opts.subaccountOwner,
    productIds: TEST_PRODUCT_ID_LIST,
    verifyingAddr: opts.endpointAddr,
    chainId: opts.chainId,
  };

  // 1. Cancel all engine + trigger orders in parallel (no queries needed)
  await Promise.all([
    retryWithBackoff(() => clients.engine.cancelProductOrders(cancelParams)),
    retryWithBackoff(() => clients.trigger.cancelProductOrders(cancelParams)),
  ]);

  await delay(TEST_DELAYS.LONG);

  // 2. Query subaccount summary + isolated positions in parallel
  const [subaccountSummary, isolatedPositions] = await Promise.all([
    retryWithBackoff(() =>
      clients.engine.getSubaccountSummary({
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
      }),
    ),
    retryWithBackoff(() =>
      clients.engine.getIsolatedPositions({
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
      }),
    ),
  ]);

  const crossPerps = subaccountSummary.balances.filter(
    (b) => b.type === ProductEngineType.PERP && !b.amount.isZero(),
  ) as PerpBalanceWithProduct[];
  const openIsolated = isolatedPositions.filter(
    (p) => !p.baseBalance.amount.isZero(),
  );

  if (crossPerps.length === 0 && openIsolated.length === 0) return;

  // 3. Fetch market increments, build close orders, batch execute
  const allMarkets = await clients.engine.getAllMarkets();
  const marketByProductId = new Map(allMarkets.map((m) => [m.productId, m]));

  const closeOrders = [
    ...crossPerps.map((b) =>
      buildCloseOrder({
        balance: b,
        marketByProductId,
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
        chainId: opts.chainId,
        appendix: REDUCE_ONLY_IOC_APPENDIX,
      }),
    ),
    ...openIsolated.map((p) =>
      buildCloseOrder({
        balance: p.baseBalance,
        marketByProductId,
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
        chainId: opts.chainId,
        appendix: REDUCE_ONLY_IOC_ISOLATED_APPENDIX,
      }),
    ),
  ];

  if (closeOrders.length > 0) {
    await delay(TEST_DELAYS.LONG);
    await retryWithBackoff(() =>
      clients.engine.placeOrders({ orders: closeOrders }),
    );
  }
}

/**
 * Rounds {@link value} down (toward zero) to the nearest multiple of {@link increment}.
 */
function roundToIncrement(value: BigNumber, increment: BigNumber): BigNumber {
  if (increment.isZero()) return value;
  return value
    .div(increment)
    .integerValue(BigNumber.ROUND_DOWN)
    .multipliedBy(increment);
}

/**
 * Builds a single close-order param for a perp position.
 *
 * @throws If the market is not found or the close amount rounds to zero.
 */
function buildCloseOrder(params: {
  balance: PerpBalanceWithProduct;
  marketByProductId: Map<number, MarketWithProduct>;
  subaccountOwner: string;
  subaccountName: string;
  chainId: number;
  appendix: bigint;
}): EnginePlaceOrderParams {
  const { balance, marketByProductId } = params;
  const market = marketByProductId.get(balance.productId);

  if (!market) {
    throw new Error(
      `No market found for productId ${balance.productId.toString()}`,
    );
  }

  const { priceIncrement, sizeIncrement } = market;

  const closeAmount = roundToIncrement(balance.amount.negated(), sizeIncrement);

  if (closeAmount.isZero()) {
    throw new Error(
      `Close amount is zero after rounding for productId ${balance.productId.toString()}`,
    );
  }

  const isBuy = closeAmount.isPositive();
  const slippageMultiplier = isBuy
    ? 1 + CLOSE_SLIPPAGE_FACTOR
    : 1 - CLOSE_SLIPPAGE_FACTOR;
  const rawPrice = balance.oraclePrice.multipliedBy(slippageMultiplier);
  const closePrice = roundToIncrement(rawPrice, priceIncrement);

  return {
    productId: balance.productId,
    verifyingAddr: getOrderVerifyingAddress(balance.productId),
    chainId: params.chainId,
    order: {
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
      amount: closeAmount,
      price: closePrice,
      expiration: getExpiration(),
      appendix: params.appendix,
    },
    nonce: getOrderNonce(),
  };
}
