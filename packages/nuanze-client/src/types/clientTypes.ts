import {
  NuanzeMarket,
  NuanzeMarketTradingStatus,
  NuanzeMarketVenue,
} from './clientModelTypes';

/**
 * Params for `NuanzeClient.getMarkets`. All filters are optional and combine with AND.
 */
export interface GetNuanzeMarketsParams {
  /** Restrict to one venue. Omit for both. */
  venue?: NuanzeMarketVenue;
  /** Restrict to one tradability state. Omit for all states. */
  tradingStatus?: NuanzeMarketTradingStatus;
  /** Exact canonical ticker, matched case-insensitively. */
  ticker?: string;
}

/**
 * Response of `NuanzeClient.getMarkets`.
 */
export interface GetNuanzeMarketsResponse {
  /**
   * Complete matching universe, ordered by `productId` ascending. Never truncated, so there is no
   * cursor and `count` always equals this length.
   */
  markets: NuanzeMarket[];
  /** Number of markets returned. */
  count: number;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}
