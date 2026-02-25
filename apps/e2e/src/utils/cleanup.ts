import {
  EngineClient,
  SubaccountIsolatedPosition,
} from '@nadohq/engine-client';
import {
  BigDecimal,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  PerpBalanceWithProduct,
  ProductEngineType,
} from '@nadohq/shared';
import { TriggerClient } from '@nadohq/trigger-client';
import { delay } from './delay';
import { getExpiration } from './getExpiration';
import {
  PENDING_TRIGGER_STATUS_TYPES,
  TEST_SUBACCOUNT_NAME,
} from './testConstants';

export interface CleanupOptions {
  subaccountOwner: string;
  subaccountName?: string;
  verifyingAddr: string;
  chainId: number;
}

/** Engine rejects orders outside 80%-120% of oracle price; use 19% to stay within bounds. */
const CLOSE_SLIPPAGE_FACTOR = 0.19;

/** Delay between sequential execute operations to stay within rate limits. */
const EXECUTE_DELAY_MS = 3500;

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
): Promise<void> {
  const subaccountName = opts.subaccountName ?? TEST_SUBACCOUNT_NAME;
  const errors: unknown[] = [];

  // Query all open state up-front
  const [triggerOrders, subaccountSummary, isolatedPositions] =
    await Promise.all([
      clients.trigger
        .listOrders({
          chainId: opts.chainId,
          subaccountName,
          subaccountOwner: opts.subaccountOwner,
          verifyingAddr: opts.verifyingAddr,
          statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        })
        .catch((err) => {
          errors.push(err);
          return null;
        }),
      clients.engine
        .getSubaccountSummary({
          subaccountOwner: opts.subaccountOwner,
          subaccountName,
        })
        .catch((err) => {
          errors.push(err);
          return null;
        }),
      clients.engine
        .getIsolatedPositions({
          subaccountOwner: opts.subaccountOwner,
          subaccountName,
        })
        .catch((err) => {
          errors.push(err);
          return null;
        }),
    ]);

  // 1. Cancel pending trigger orders by digest (arrays must be parallel)
  if (triggerOrders && triggerOrders.orders.length > 0) {
    const digests = triggerOrders.orders.map((o) => o.order.digest);
    const productIds = triggerOrders.orders.map((o) => o.order.productId);

    await delay(EXECUTE_DELAY_MS);
    await safeRun(errors, async () => {
      try {
        await clients.trigger.cancelTriggerOrders({
          digests,
          productIds,
          subaccountName,
          subaccountOwner: opts.subaccountOwner,
          verifyingAddr: opts.verifyingAddr,
          chainId: opts.chainId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('could not be found')) return;
        throw err;
      }
    });
  }

  // 2. Cancel all engine orders by product for every product that has a balance
  if (subaccountSummary) {
    const tradeableProductIds = subaccountSummary.balances
      .filter((b) => b.type !== ProductEngineType.SPOT || b.productId !== 0)
      .map((b) => b.productId);

    if (tradeableProductIds.length > 0) {
      await delay(EXECUTE_DELAY_MS);
      await safeRun(errors, () =>
        clients.engine.cancelProductOrders({
          subaccountName,
          subaccountOwner: opts.subaccountOwner,
          productIds: tradeableProductIds,
          verifyingAddr: opts.verifyingAddr,
          chainId: opts.chainId,
        }),
      );
    }
  }

  // 3. Close open cross perp positions
  if (subaccountSummary) {
    await delay(EXECUTE_DELAY_MS);
    await safeRun(errors, () =>
      closeCrossPositions(clients.engine, subaccountSummary, {
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
        chainId: opts.chainId,
      }),
    );
  }

  // 4. Close open isolated perp positions
  if (isolatedPositions && isolatedPositions.length > 0) {
    await delay(EXECUTE_DELAY_MS);
    await safeRun(errors, () =>
      closeIsolatedPositions(clients.engine, isolatedPositions, {
        subaccountOwner: opts.subaccountOwner,
        subaccountName,
        chainId: opts.chainId,
      }),
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
 * Places reduce-only IOC orders to flatten open cross-margin perp positions.
 */
async function closeCrossPositions(
  engine: EngineClient,
  summary: Awaited<ReturnType<EngineClient['getSubaccountSummary']>>,
  opts: { subaccountOwner: string; subaccountName: string; chainId: number },
): Promise<void> {
  const openPerps = summary.balances.filter(
    (b) => b.type === ProductEngineType.PERP && !b.amount.isZero(),
  );

  if (openPerps.length === 0) {
    return;
  }

  const priceByProduct = await fetchPriceMap(
    engine,
    openPerps.map((b) => b.productId),
  );

  for (const balance of openPerps as PerpBalanceWithProduct[]) {
    await delay(EXECUTE_DELAY_MS);
    await placeCloseOrder(engine, balance, priceByProduct, {
      ...opts,
      appendix: REDUCE_ONLY_IOC_APPENDIX,
    });
  }
}

/**
 * Places reduce-only IOC orders to flatten open isolated perp positions.
 * Uses the parent subaccount with the isolated appendix (margin 0 since we're closing).
 */
async function closeIsolatedPositions(
  engine: EngineClient,
  positions: SubaccountIsolatedPosition[],
  opts: { subaccountOwner: string; subaccountName: string; chainId: number },
): Promise<void> {
  const openPositions = positions.filter((p) => !p.baseBalance.amount.isZero());

  if (openPositions.length === 0) {
    return;
  }

  const priceByProduct = await fetchPriceMap(
    engine,
    openPositions.map((p) => p.baseBalance.productId),
  );

  for (const position of openPositions) {
    await delay(EXECUTE_DELAY_MS);
    await placeCloseOrder(engine, position.baseBalance, priceByProduct, {
      ...opts,
      appendix: REDUCE_ONLY_IOC_ISOLATED_APPENDIX,
    });
  }
}

async function fetchPriceMap(engine: EngineClient, productIds: number[]) {
  const { marketPrices } = await engine.getMarketPrices({ productIds });
  return new Map(marketPrices.map((mp) => [mp.productId, mp]));
}

async function placeCloseOrder(
  engine: EngineClient,
  balance: PerpBalanceWithProduct,
  priceByProduct: Map<number, { bid: BigDecimal; ask: BigDecimal }>,
  opts: {
    subaccountOwner: string;
    subaccountName: string;
    chainId: number;
    appendix: bigint;
  },
): Promise<void> {
  const mp = priceByProduct.get(balance.productId);
  if (!mp) return;

  const isLong = balance.amount.gt(0);
  const closeAmount = isLong ? balance.amount.negated() : balance.amount.abs();
  const closePrice = isLong
    ? mp.bid.multipliedBy(1 - CLOSE_SLIPPAGE_FACTOR)
    : mp.ask.multipliedBy(1 + CLOSE_SLIPPAGE_FACTOR);

  await engine.placeOrder({
    productId: balance.productId,
    verifyingAddr: getOrderVerifyingAddress(balance.productId),
    chainId: opts.chainId,
    order: {
      subaccountOwner: opts.subaccountOwner,
      subaccountName: opts.subaccountName,
      amount: closeAmount.toFixed(0),
      price: closePrice.decimalPlaces(0),
      expiration: getExpiration(),
      appendix: opts.appendix,
    },
    nonce: getOrderNonce(),
  });
}
