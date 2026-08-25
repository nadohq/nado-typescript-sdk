import BigNumber from 'bignumber.js';
import {
  NuanzeCandle,
  NuanzeCandleInterval,
  NuanzeCollateralFlow,
  NuanzeCollateralFlowPoint,
  NuanzeCoverage,
  NuanzeFlowBucket,
  NuanzeFlowEventTypeFilter,
  NuanzeFlowTimeframe,
  NuanzeFundingRate,
  NuanzeLeaderboardItem,
  NuanzeLeaderboardTimeframe,
  NuanzeMarket,
  NuanzeMarketDetail,
  NuanzeMarketPosition,
  NuanzeMarketPositioningCohortResponse,
  NuanzeMarketPositioningNotionalBucketResponse,
  NuanzeMarketPositioningSideResponse,
  NuanzeMarketTrade,
  NuanzeMarketTradingStatus,
  NuanzeMarketVenue,
  NuanzeMinPositionUsd,
  NuanzeNewsEventType,
  NuanzeNewsSentiment,
  NuanzeNewsStory,
  NuanzePlatformDeltas,
  NuanzePlatformWindow,
  NuanzePnlWindow,
  NuanzePositioningGroupBy,
  NuanzeSeriesMetric,
  NuanzeSeriesPoint,
  NuanzeSourceInterval,
  NuanzeWalletPosition,
  NuanzeWalletTrade,
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

/**
 * Response of `NuanzeClient.getOpenApiDocument`. Pass-through OpenAPI 3.1 JSON.
 */
export interface GetNuanzeOpenApiDocumentResponse {
  /** OpenAPI version. The deployed contract is `3.1.0`. */
  openapi: string;
  /** Document info object. */
  info: Record<string, unknown>;
  /** Path item object map. */
  paths: Record<string, unknown>;
  /** Additional OpenAPI fields such as `components`. */
  [key: string]: unknown;
}

/**
 * Params for `NuanzeClient.getNews`. All filters are optional.
 */
export interface GetNuanzeNewsParams {
  /** Page size, 1-100, default 30. */
  limit?: number;
  /** Restrict to one sentiment. */
  sentiment?: NuanzeNewsSentiment;
  /** Restrict to one event type. */
  eventType?: NuanzeNewsEventType;
  /** When true, only stories that reference a currently tradable market. Default false. */
  tradableOnly?: boolean;
  /** Opaque exclusive cursor bound to the normalized filters. */
  cursor?: string;
}

/**
 * Response of `NuanzeClient.getNews`.
 */
export interface GetNuanzeNewsResponse {
  /** Published stories, newest first. */
  stories: NuanzeNewsStory[];
  /** Cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getMarketByTicker`.
 */
export interface GetNuanzeMarketByTickerParams {
  /** Case-insensitive canonical ticker or accepted legacy source symbol. */
  ticker: string;
  /** Restrict to one venue. Omit to use the asset's primary venue. */
  venue?: NuanzeMarketVenue;
  /** Pin an exact product; must match ticker and venue. */
  productId?: number;
  /**
   * When true and `venue` is omitted, reject a multi-venue canonical ticker with
   * `AMBIGUOUS_MARKET`. Default false.
   */
  strictVenue?: boolean;
  /** Max published stories to include, 1-30, default 12. */
  newsLimit?: number;
}

/**
 * Response of `NuanzeClient.getMarketByTicker`.
 */
export type GetNuanzeMarketByTickerResponse = NuanzeMarketDetail;

/**
 * Params for `NuanzeClient.getFundingRates`.
 */
export interface GetNuanzeFundingRatesParams {
  /** Repeatable product ID filter with OR semantics. */
  productId?: number | number[];
  /** If supplied, only `perp` is valid. */
  venue?: 'perp';
}

/**
 * Response of `NuanzeClient.getFundingRates`.
 */
export interface GetNuanzeFundingRatesResponse {
  /** Latest observation per matching active perpetual. */
  rates: NuanzeFundingRate[];
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getLeaderboard`.
 */
export interface GetNuanzeLeaderboardParams {
  /** Ranking window, default `30d`. All-time costs five rate-limit units. */
  timeframe?: NuanzeLeaderboardTimeframe;
  /** Page size, 1-200, default 100. */
  limit?: number;
  /** Offset, 0-10000, default 0. */
  offset?: number;
}

/**
 * Response of `NuanzeClient.getLeaderboard`.
 */
export interface GetNuanzeLeaderboardResponse {
  /** Echoed timeframe. */
  timeframe: NuanzeLeaderboardTimeframe;
  /** Ranked rows for this page. */
  items: NuanzeLeaderboardItem[];
  /** Requested page size. */
  limit: number;
  /** Requested offset. */
  offset: number;
  /** Total ranked rows. */
  total: number;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getPlatformSummary`.
 */
export interface GetNuanzePlatformSummaryParams {
  /** Comparison window, default `30d`. */
  window?: NuanzePlatformWindow;
}

/**
 * Response of `NuanzeClient.getPlatformSummary`.
 */
export interface GetNuanzePlatformSummaryResponse {
  /** Echoed window. */
  window: NuanzePlatformWindow;
  /** Rolling 24-hour volume. */
  volume24h: BigNumber;
  /** Rolling 24-hour trade count. */
  trades24h: number;
  /** Rolling 24-hour trader count. */
  traders24h: number;
  /** Volume over the selected window. */
  windowVolume: BigNumber;
  /** Trade count over the selected window. */
  windowTrades: number;
  /** Trader count over the selected window. */
  windowTraders: number;
  /** Prior-window percentage deltas. */
  deltas: NuanzePlatformDeltas;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getWalletSummary`.
 */
export interface GetNuanzeWalletSummaryParams {
  /** EVM address; mixed case is accepted and normalized to lowercase. */
  address: string;
  /** Exact subaccount. Omit to sum latest cumulative values across known subaccounts. */
  subaccountName?: string;
  /** PnL lookback, default `30d`. */
  pnlWindow?: NuanzePnlWindow;
}

/**
 * Response of `NuanzeClient.getWalletSummary`.
 */
export interface GetNuanzeWalletSummaryResponse {
  /** Lowercased address. */
  address: string;
  /** Selected subaccount, or null when aggregated. */
  subaccountName: string | null;
  /** Number of known subaccounts contributing to the snapshot. */
  subaccountCount: number;
  /** Echoed PnL window. */
  pnlWindow: NuanzePnlWindow;
  /** Latest cumulative account PnL. */
  accountPnl: BigNumber;
  /** Account PnL over the selected window. */
  windowPnl: BigNumber;
  /** Equity when available. */
  equity: BigNumber | null;
  /** Cumulative traded volume. */
  cumulativeVolume: BigNumber;
  /** Volume over the selected window. */
  windowVolume: BigNumber;
  /** Lifetime trade count. */
  totalTrades: number;
  /** Close-derived win count. */
  wins: number;
  /** Close-derived loss count. */
  losses: number;
  /** Win rate, or null when there are no closed trades. */
  winRate: BigNumber | null;
  /** Latest snapshot time as a UTC ISO 8601 string. */
  snapshotAt: string;
  /** Whether the window has full historical coverage. */
  coverage: NuanzeCoverage;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getWalletPositions`.
 */
export interface GetNuanzeWalletPositionsParams {
  /** EVM address; mixed case is accepted and normalized to lowercase. */
  address: string;
  /** Exact subaccount. Omit to list all known subaccounts. */
  subaccountName?: string;
  /** Repeatable product ID filter with OR semantics. */
  productId?: number | number[];
  /** Include spot rows. Default false. */
  includeSpot?: boolean;
}

/**
 * Response of `NuanzeClient.getWalletPositions`.
 */
export interface GetNuanzeWalletPositionsResponse {
  /** Lowercased address. */
  address: string;
  /** Snapshot rows, at most 500. */
  positions: NuanzeWalletPosition[];
  /** Number of rows returned. */
  count: number;
  /** Newest row snapshot time, or null when empty. */
  newestSnapshotAt: string | null;
  /** Oldest row snapshot time, or null when empty. */
  oldestSnapshotAt: string | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getMarketTrades`.
 */
export interface GetNuanzeMarketTradesParams {
  /** Case-insensitive canonical ticker or accepted legacy source symbol. */
  ticker: string;
  /** Restrict to one venue. Omit to use the asset's primary venue. */
  venue?: NuanzeMarketVenue;
  /** Pin an exact product; must match ticker and venue. */
  productId?: number;
  /**
   * When true and `venue` is omitted, reject a multi-venue canonical ticker with
   * `AMBIGUOUS_MARKET`. Default false.
   */
  strictVenue?: boolean;
  /** Page size, 1-200, default 50. */
  limit?: number;
  /** Inclusive start as a UTC ISO 8601 string. */
  from?: string;
  /** Exclusive end as a UTC ISO 8601 string. */
  to?: string;
  /** Opaque exclusive cursor bound to the normalized filters. */
  cursor?: string;
}

/**
 * Response of `NuanzeClient.getMarketTrades`.
 */
export interface GetNuanzeMarketTradesResponse {
  /** Public product ID. */
  productId: number;
  /** Venue-native symbol. */
  symbol: string;
  /** Canonical ticker. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
  /** Taker-side rows, newest first. */
  trades: NuanzeMarketTrade[];
  /** Cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getMarketCandles`.
 */
export interface GetNuanzeMarketCandlesParams {
  /** Case-insensitive canonical ticker or accepted legacy source symbol. */
  ticker: string;
  /** Restrict to one venue. Omit to use the asset's primary venue. */
  venue?: NuanzeMarketVenue;
  /** Pin an exact product; must match ticker and venue. */
  productId?: number;
  /**
   * When true and `venue` is omitted, reject a multi-venue canonical ticker with
   * `AMBIGUOUS_MARKET`. Default false.
   */
  strictVenue?: boolean;
  /** Bar interval, default `1h`. */
  interval?: NuanzeCandleInterval;
  /** Inclusive start as a UTC ISO 8601 string. */
  from?: string;
  /** Exclusive end as a UTC ISO 8601 string. */
  to?: string;
  /** Newest matching bars to return, 1-750, default 200. Returned oldest-to-newest. */
  limit?: number;
}

/**
 * Response of `NuanzeClient.getMarketCandles`.
 */
export interface GetNuanzeMarketCandlesResponse {
  /** Public product ID. */
  productId: number;
  /** Venue-native symbol. */
  symbol: string;
  /** Canonical ticker. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
  /** Echoed interval. */
  interval: NuanzeCandleInterval;
  /** Bars oldest-to-newest, at most 750. */
  candles: NuanzeCandle[];
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getWalletTrades`.
 */
export interface GetNuanzeWalletTradesParams {
  /** EVM address; mixed case is accepted and normalized to lowercase. */
  address: string;
  /** Exact subaccount. Omit to include all known subaccounts. */
  subaccountName?: string;
  /** Repeatable product ID filter with OR semantics. */
  productId?: number | number[];
  /** Inclusive start as a UTC ISO 8601 string. */
  from?: string;
  /** Exclusive end as a UTC ISO 8601 string. */
  to?: string;
  /** Page size, 1-200, default 50. */
  limit?: number;
  /** Opaque exclusive cursor bound to the normalized filters. */
  cursor?: string;
}

/**
 * Response of `NuanzeClient.getWalletTrades`.
 */
export interface GetNuanzeWalletTradesResponse {
  /** Lowercased address. */
  address: string;
  /** Maker and taker fills, newest first. */
  trades: NuanzeWalletTrade[];
  /** Cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getWalletPnl`.
 */
export interface GetNuanzeWalletPnlParams {
  /** EVM address; mixed case is accepted and normalized to lowercase. */
  address: string;
  /** Exact subaccount. Omit to sum latest cumulative values across known subaccounts. */
  subaccountName?: string;
  /** Lookback window, default `30d`. */
  window?: NuanzePnlWindow;
}

/**
 * Response of `NuanzeClient.getWalletPnl`.
 */
export interface GetNuanzeWalletPnlResponse {
  /** Lowercased address. */
  address: string;
  /** Selected subaccount, or null when aggregated. */
  subaccountName: string | null;
  /** Echoed window. */
  window: NuanzePnlWindow;
  /** Inclusive window start as a UTC ISO 8601 string. */
  windowStart: string;
  /** Exclusive window end as a UTC ISO 8601 string. */
  windowEnd: string;
  /** Cumulative account PnL at window start. */
  openingAccountPnl: BigNumber;
  /** Latest cumulative account PnL. */
  latestAccountPnl: BigNumber;
  /** Window delta. */
  windowPnl: BigNumber;
  /** Equity at window start, or null when unavailable. */
  openingEquity: BigNumber | null;
  /** Latest equity, or null when unavailable. */
  latestEquity: BigNumber | null;
  /** Volume over the window. */
  volumeDelta: BigNumber;
  /** Snapshot grain used for the window. */
  sourceInterval: NuanzeSourceInterval;
  /** Latest snapshot time as a UTC ISO 8601 string. */
  latestSnapshotAt: string;
  /** Whether the window has full historical coverage. */
  coverage: NuanzeCoverage;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getWalletPnlSeries`.
 */
export interface GetNuanzeWalletPnlSeriesParams {
  /** EVM address; mixed case is accepted and normalized to lowercase. */
  address: string;
  /** Exact subaccount. Omit to sum latest cumulative values across known subaccounts. */
  subaccountName?: string;
  /** Series metric, default `pnl`. */
  metric?: NuanzeSeriesMetric;
  /** Lookback window, default `30d`. */
  window?: NuanzePnlWindow;
}

/**
 * Response of `NuanzeClient.getWalletPnlSeries`.
 */
export interface GetNuanzeWalletPnlSeriesResponse {
  /** Lowercased address. */
  address: string;
  /** Selected subaccount, or null when aggregated. */
  subaccountName: string | null;
  /** Echoed metric. */
  metric: NuanzeSeriesMetric;
  /** Echoed window. */
  window: NuanzePnlWindow;
  /** At most 1,000 deterministically sampled points, oldest to newest. */
  points: NuanzeSeriesPoint[];
  /** Snapshot grain used for the series. */
  sourceInterval: NuanzeSourceInterval;
  /** Whether the window has full historical coverage. */
  coverage: NuanzeCoverage;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getCollateralFlows`.
 */
export interface GetNuanzeCollateralFlowsParams {
  /** Event type filter, default `all`. */
  eventType?: NuanzeFlowEventTypeFilter;
  /** Exclude events with USD valuation below this decimal string. Unvalued events remain without it. */
  minUsd?: string;
  /** Repeatable product ID filter with OR semantics. */
  productId?: number | number[];
  /** Lookback window, default `24h`. */
  timeframe?: NuanzeFlowTimeframe;
  /** Page size, 1-200, default 50. */
  limit?: number;
  /** Opaque exclusive cursor bound to the normalized filters. */
  cursor?: string;
}

/**
 * Response of `NuanzeClient.getCollateralFlows`.
 */
export interface GetNuanzeCollateralFlowsResponse {
  /** Events, newest first. */
  events: NuanzeCollateralFlow[];
  /** Cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getCollateralFlowSummary`.
 */
export interface GetNuanzeCollateralFlowSummaryParams {
  /** Lookback window, default `24h`. */
  timeframe?: NuanzeFlowTimeframe;
  /** Repeatable product ID filter with OR semantics. */
  productId?: number | number[];
  /** Exclude events with USD valuation below this decimal string. */
  minUsd?: string;
}

/**
 * Response of `NuanzeClient.getCollateralFlowSummary`.
 */
export interface GetNuanzeCollateralFlowSummaryResponse {
  /** Echoed timeframe. */
  timeframe: NuanzeFlowTimeframe;
  /** Deposited USD. */
  deposited: BigNumber;
  /** Withdrawn USD. */
  withdrawn: BigNumber;
  /** Net USD. */
  net: BigNumber;
  /** Gross USD. */
  gross: BigNumber;
  /** Deposit event count. */
  depositCount: number;
  /** Withdrawal event count. */
  withdrawalCount: number;
  /** Count of valued events. */
  valuedCount: number;
  /** Count of unvalued events. */
  unvaluedCount: number;
  /** Prior equal-window net, or null for `all`. */
  priorNet: BigNumber | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getCollateralFlowSeries`.
 */
export interface GetNuanzeCollateralFlowSeriesParams {
  /** Lookback window, default `24h`. */
  timeframe?: NuanzeFlowTimeframe;
  /** Repeatable product ID filter with OR semantics. */
  productId?: number | number[];
  /** Exclude events with USD valuation below this decimal string. */
  minUsd?: string;
  /** UTC bucket. Defaults are hour for 24h/7d and day for 30d/all. */
  bucket?: NuanzeFlowBucket;
}

/**
 * Response of `NuanzeClient.getCollateralFlowSeries`.
 */
export interface GetNuanzeCollateralFlowSeriesResponse {
  /** Echoed timeframe. */
  timeframe: NuanzeFlowTimeframe;
  /** Echoed bucket. */
  bucket: NuanzeFlowBucket;
  /** UTC buckets, at most 1,000. */
  points: NuanzeCollateralFlowPoint[];
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Params for `NuanzeClient.getMarketPositioning`. Resolves only an active perpetual.
 */
export interface GetNuanzeMarketPositioningParams {
  /** Case-insensitive canonical ticker or accepted legacy source symbol. */
  ticker: string;
  /** If supplied, only `perp` is valid. */
  venue?: 'perp';
  /** Pin an exact product; must match ticker and venue. */
  productId?: number;
  /**
   * When true and `venue` is omitted, reject a multi-venue canonical ticker with
   * `AMBIGUOUS_MARKET`. Default false.
   */
  strictVenue?: boolean;
  /** Cell grouping, default `side`. */
  groupBy?: NuanzePositioningGroupBy;
  /** Inclusion threshold as a USD string, default `'10'`. */
  minPositionUsd?: NuanzeMinPositionUsd;
}

/**
 * Response of `NuanzeClient.getMarketPositioning`. Discriminated by `groupBy`.
 */
export type GetNuanzeMarketPositioningResponse =
  | NuanzeMarketPositioningSideResponse
  | NuanzeMarketPositioningCohortResponse
  | NuanzeMarketPositioningNotionalBucketResponse;

/**
 * Params for `NuanzeClient.getMarketPositions`. Resolves only an active perpetual.
 */
export interface GetNuanzeMarketPositionsParams {
  /** Case-insensitive canonical ticker or accepted legacy source symbol. */
  ticker: string;
  /** If supplied, only `perp` is valid. */
  venue?: 'perp';
  /** Pin an exact product; must match ticker and venue. */
  productId?: number;
  /** Page size, 1-200, default 50. */
  limit?: number;
  /** Opaque exclusive cursor bound to the resolved product. */
  cursor?: string;
}

/**
 * Response of `NuanzeClient.getMarketPositions`.
 */
export interface GetNuanzeMarketPositionsResponse {
  /** Public product ID. */
  productId: number;
  /** Venue-native symbol. */
  symbol: string;
  /** Canonical ticker. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
  /** Open legs ordered by absolute notional descending. */
  positions: NuanzeMarketPosition[];
  /** Cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  /** When position snapshots were last updated, or null when unknown. */
  dataUpdatedAt: string | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}
