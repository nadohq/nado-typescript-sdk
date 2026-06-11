import { mapValues, MarketWithProduct } from '@nadohq/shared';
import { EngineBaseClient } from './EngineBaseClient';
import {
  EngineCachedTimeParams,
  EnginePingParams,
  EnginePingResponse,
  EngineServerStatusResponse,
  EngineSymbolsResponse,
  GetEngineAllMarketsResponse,
  GetEngineCachedBboHistoryParams,
  GetEngineCachedBboHistoryResponse,
  GetEngineCachedMarketPricesParams,
  GetEngineContractsResponse,
  GetEngineHealthGroupsResponse,
  GetEngineMarketPricesResponse,
  GetEngineNlpPoolInfoResponse,
  GetEngineSymbolsParams,
} from './types';
import { mapProductEngineType } from './utils/productEngineTypeMappers';
import {
  mapEngineBboHistory,
  mapEngineMarketPrice,
  mapEngineServerNlpPoolInfo,
  mapEngineServerPerpProduct,
  mapEngineServerSpotProduct,
  mapEngineServerSymbols,
} from './utils/queryDataMappers';

/**
 * "Edge" queries hit the gateway's in-memory cache via `/edge/query`. They are lower latency
 * than the live {@link EngineQueryClient} queries but eventually consistent — do not use them
 * for order, margin, or settlement decisions.
 *
 * Each `getCached*` method mirrors the data shape of its live counterpart; only the request
 * type and refresh semantics differ.
 *
 * @see https://docs.nado.xyz/developer-resources/api/gateway/edge
 */
export class EngineEdgeQueryClient extends EngineBaseClient {
  /**
   * Cached highest bid / lowest ask per product. Products with no cached best-bid/offer yet are
   * silently omitted, so the returned array may be shorter than `productIds`.
   *
   * @param params Omit `productIds` to return every product currently in the cache
   */
  async getCachedMarketPrices(
    params: GetEngineCachedMarketPricesParams = {},
  ): Promise<GetEngineMarketPricesResponse> {
    const baseResponse = await this.edgeQuery('cached_prices', {
      product_ids: params.productIds,
    });
    return {
      marketPrices: baseResponse.market_prices.map(mapEngineMarketPrice),
    };
  }

  /**
   * Cached product metadata and trading config (increments, fees, weights, trading status).
   *
   * @param params Optional `productIds` / `productType` filters
   */
  async getCachedSymbols(
    params: GetEngineSymbolsParams = {},
  ): Promise<EngineSymbolsResponse> {
    const baseResponse = await this.edgeQuery('cached_symbols', {
      product_ids: params.productIds,
      product_type:
        params.productType != null
          ? mapProductEngineType(params.productType)
          : undefined,
    });
    return mapEngineServerSymbols(baseResponse);
  }

  /**
   * Cached chain ID and on-chain contract addresses for the current chain. Always available: if
   * the cache is cold the gateway falls back to its live contract config.
   */
  async getCachedContracts(): Promise<GetEngineContractsResponse> {
    const baseResponse = await this.edgeQuery('cached_contracts', {});
    return {
      chainId: Number(baseResponse.chain_id),
      endpointAddr: baseResponse.endpoint_addr,
    };
  }

  /**
   * Cached engine status (e.g. `active`, `syncing`). Refreshed every 500ms.
   */
  async getCachedStatus(): Promise<EngineServerStatusResponse> {
    return this.edgeQuery('cached_status', {});
  }

  /**
   * Cached full config, risk, and on-chain state for every spot and perp product.
   */
  async getCachedAllMarkets(): Promise<GetEngineAllMarketsResponse> {
    const markets: MarketWithProduct[] = [];

    const baseResponse = await this.edgeQuery('cached_all_products', {});
    baseResponse.spot_products.forEach((spotProduct) => {
      markets.push(mapEngineServerSpotProduct(spotProduct));
    });
    baseResponse.perp_products.forEach((perpProduct) => {
      markets.push(mapEngineServerPerpProduct(perpProduct));
    });

    return markets;
  }

  /**
   * Cached all products grouped per edge market, keyed by chain ID.
   */
  async getCachedEdgeAllMarkets(): Promise<
    Record<number, MarketWithProduct[]>
  > {
    const baseResponse = await this.edgeQuery('cached_edge_all_products', {});

    return mapValues(baseResponse.edge_all_products, (allProducts) => {
      const markets: MarketWithProduct[] = [];

      allProducts.spot_products.forEach((spotProduct) => {
        markets.push(mapEngineServerSpotProduct(spotProduct));
      });

      allProducts.perp_products.forEach((perpProduct) => {
        markets.push(mapEngineServerPerpProduct(perpProduct));
      });

      return markets;
    });
  }

  /**
   * Cached spot/perp product pairings used for health grouping.
   */
  async getCachedHealthGroups(): Promise<GetEngineHealthGroupsResponse> {
    const baseResponse = await this.edgeQuery('cached_health_groups', {});

    return {
      healthGroups: baseResponse.health_groups.map(
        ([spotProductId, perpProductId]) => ({
          spotProductId,
          perpProductId,
        }),
      ),
    };
  }

  /**
   * Cached NLP pool information. Refreshed every 5s.
   */
  async getCachedNlpPoolInfo(): Promise<GetEngineNlpPoolInfoResponse> {
    const baseResponse = await this.edgeQuery('cached_nlp_pool_info', {});
    return mapEngineServerNlpPoolInfo(baseResponse);
  }

  /**
   * A rolling, down-samplable time series of best-bid/offer snapshots per product. The gateway
   * samples the live price cache every 500ms and retains up to 30 minutes of history per product.
   *
   * @param params
   */
  async getCachedBboHistory(
    params: GetEngineCachedBboHistoryParams = {},
  ): Promise<GetEngineCachedBboHistoryResponse> {
    const baseResponse = await this.edgeQuery('cached_bbo_history', {
      product_ids: params.productIds,
      interval_ms: params.intervalMs,
      max_time_ms: params.maxTimeMs,
      limit: params.limit,
    });
    return mapEngineBboHistory(baseResponse);
  }

  /**
   * Latency / clock-sync helper. Echoes `clientTime` back alongside the server time so the caller
   * can measure round-trip latency and clock offset in one call.
   *
   * @param params
   */
  async ping(params: EnginePingParams = {}): Promise<EnginePingResponse> {
    const baseResponse = await this.edgeControlQuery('ping', {
      id: params.id,
      client_time:
        params.clientTime != null ? String(params.clientTime) : undefined,
    });
    return {
      id: baseResponse.id,
      serverTime: Number(baseResponse.server_time),
      clientTime:
        baseResponse.client_time != null
          ? Number(baseResponse.client_time)
          : undefined,
    };
  }

  /**
   * Returns the current server time (epoch ms) from the gateway clock.
   *
   * @param params
   */
  async getEdgeControlTime(
    params: EngineCachedTimeParams = {},
  ): Promise<number> {
    const baseResponse = await this.edgeControlQuery('time', {
      id: params.id,
    });
    return Number(baseResponse.server_time);
  }
}
