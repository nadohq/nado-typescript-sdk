import { BigDecimal, MarketWithProduct } from '@nadohq/shared';
import { createTestClients } from './createTestClients';
import { withRetry } from './withRetry';

export type { TestClients } from './createTestClients';

let _clients: ReturnType<typeof createTestClients> | undefined;
let _cachedMarkets: MarketWithProduct[] | undefined;

/**
 * Returns a lazily-created, run-wide {@link TestClients} singleton
 * containing engine, indexer, trigger, wallet and context references.
 */
export function getSharedClients(): ReturnType<typeof createTestClients> {
  if (!_clients) {
    _clients = createTestClients();
  }
  return _clients;
}

/**
 * Fetches all markets once per test run and caches the result.
 * Subsequent calls return the cached array without a network request.
 */
export async function getCachedMarkets(): Promise<MarketWithProduct[]> {
  if (!_cachedMarkets) {
    const { engine } = getSharedClients();
    _cachedMarkets = await withRetry(() => engine.getAllMarkets());
  }
  return _cachedMarkets;
}

/**
 * Returns the oracle price for a given product from the cached market data.
 *
 * @param productId - The product ID to look up.
 * @throws If the product is not found in the cached markets.
 */
export async function getCachedOraclePrice(
  productId: number,
): Promise<BigDecimal> {
  const markets = await getCachedMarkets();
  const market = markets.find((m) => m.productId === productId);
  if (!market) {
    throw new Error(`Market not found for product ${productId}`);
  }
  return market.product.oraclePrice;
}
