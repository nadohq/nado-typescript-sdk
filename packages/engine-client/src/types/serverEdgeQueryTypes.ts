import {
  EngineServerAllProductsResponse,
  EngineServerContractsResponse,
  EngineServerEdgeAllProductsResponse,
  EngineServerHealthGroupsResponse,
  EngineServerMarketPricesQueryParams,
  EngineServerMarketPricesResponse,
  EngineServerNlpPoolInfoResponse,
  EngineServerQueryFailureResponse,
  EngineServerStatusResponse,
  EngineServerSymbolsQueryParams,
  EngineServerSymbolsResponse,
} from './serverQueryTypes';

/**
 * "Edge" queries are fast, read-only market-data lookups served straight from the gateway's
 * in-memory cache (no round-trip to the matching engine). They share a single endpoint
 * (`/edge/query`), distinguished by the `type` field, and are eventually consistent — not
 * suitable for order, margin, or settlement decisions.
 *
 * The cached data queries (`cached_*`) mirror their live counterparts, so their request/response
 * types are reused here. Only `cached_bbo_history` is genuinely new.
 *
 * @see https://docs.nado.xyz/developer-resources/api/gateway/edge
 */

export interface EngineServerCachedBboHistoryQueryParams {
  product_ids?: number[];
  // Down-sampling stride. Default 500, must be >= 500, rounded up to the nearest multiple of 500
  interval_ms?: number;
  // Upper time bound (epoch ms). Omit for the most recent samples
  max_time_ms?: number;
  // Max samples per product. Default 500, capped at 3600
  limit?: number;
}

export interface EngineServerCachedQueryRequestByType {
  // Unlike the live `market_prices` query, `product_ids` is optional — omit to return every
  // product currently in the cache
  cached_prices: Partial<EngineServerMarketPricesQueryParams>;
  cached_symbols: EngineServerSymbolsQueryParams;
  cached_contracts: Record<string, never>;
  cached_status: Record<string, never>;
  cached_all_products: Record<string, never>;
  cached_edge_all_products: Record<string, never>;
  cached_health_groups: Record<string, never>;
  cached_nlp_pool_info: Record<string, never>;
  cached_bbo_history: EngineServerCachedBboHistoryQueryParams;
}

export type EngineServerCachedQueryRequestType =
  keyof EngineServerCachedQueryRequestByType;

export type EngineServerCachedQueryRequest<
  TRequestType extends EngineServerCachedQueryRequestType,
> = {
  type: TRequestType;
} & EngineServerCachedQueryRequestByType[TRequestType];

export interface EngineServerCachedBboHistorySample {
  product_id: number;
  // Sample time, epoch milliseconds
  timestamp: string;
  // Best bid at that sample, scaled by 10^18
  bid: string;
  // Best ask at that sample, scaled by 10^18
  ask: string;
}

export interface EngineServerCachedBboHistoryResponse {
  // The effective (normalized) sampling stride applied
  interval_ms: number;
  // The effective per-product sample cap applied
  limit: number;
  // Flat list of samples, sorted ascending by (timestamp, product_id)
  history: EngineServerCachedBboHistorySample[];
}

export interface EngineServerCachedQueryResponseByType {
  cached_prices: EngineServerMarketPricesResponse;
  cached_symbols: EngineServerSymbolsResponse;
  cached_contracts: EngineServerContractsResponse;
  cached_status: EngineServerStatusResponse;
  cached_all_products: EngineServerAllProductsResponse;
  cached_edge_all_products: EngineServerEdgeAllProductsResponse;
  cached_health_groups: EngineServerHealthGroupsResponse;
  cached_nlp_pool_info: EngineServerNlpPoolInfoResponse;
  cached_bbo_history: EngineServerCachedBboHistoryResponse;
}

export interface EngineServerCachedQuerySuccessResponse<
  TQueryType extends keyof EngineServerCachedQueryResponseByType =
    EngineServerCachedQueryRequestType,
> {
  status: 'success';
  data: EngineServerCachedQueryResponseByType[TQueryType];
  request_type: TQueryType;
}

export type EngineServerCachedQueryResponse<
  TQueryType extends keyof EngineServerCachedQueryResponseByType =
    EngineServerCachedQueryRequestType,
> =
  | EngineServerCachedQuerySuccessResponse<TQueryType>
  // The failure envelope is identical to the live query failure response
  | EngineServerQueryFailureResponse;

/**
 * `ping` / `time` control messages. These share the `/edge/query` endpoint but return immediately
 * from the server clock and use a different envelope than the cached data queries (no `data`
 * field).
 */

export interface EngineServerPingQueryParams {
  id?: number;
  // Echoed back so the caller can measure round-trip latency / clock offset. Epoch ms
  client_time?: string;
}

export interface EngineServerTimeQueryParams {
  id?: number;
}

export interface EngineServerEdgeControlRequestByType {
  ping: EngineServerPingQueryParams;
  time: EngineServerTimeQueryParams;
}

export type EngineServerEdgeControlRequestType =
  keyof EngineServerEdgeControlRequestByType;

export interface EngineServerPingResponse {
  status: 'success';
  method: 'pong';
  id?: number;
  // Epoch ms
  server_time: string;
  // Echoed from the request, only present when the request provided it
  client_time?: string;
}

export interface EngineServerControlTimeResponse {
  status: 'success';
  method: 'time';
  id?: number;
  // Epoch ms
  server_time: string;
}

export interface EngineServerEdgeControlResponseByType {
  ping: EngineServerPingResponse;
  time: EngineServerControlTimeResponse;
}
