import type {
  NuanzeCandleInterval,
  NuanzeCoverage,
  NuanzeFlowBucket,
  NuanzeFlowTimeframe,
  NuanzeLeaderboardTimeframe,
  NuanzeMarketVenue,
  NuanzePlatformWindow,
  NuanzePnlWindow,
  NuanzeSeriesMetric,
  NuanzeSourceInterval,
} from './clientModelTypes';
import { NuanzeNewsStory } from './clientModelTypes';
import { NuanzeErrorCode } from './nuanzeErrorCodes';
import {
  NuanzeServerCandle,
  NuanzeServerCollateralFlow,
  NuanzeServerCollateralFlowPoint,
  NuanzeServerFundingRate,
  NuanzeServerLeaderboardItem,
  NuanzeServerMarket,
  NuanzeServerMarketDetail,
  NuanzeServerMarketPosition,
  NuanzeServerMarketTrade,
  NuanzeServerPlatformDeltas,
  NuanzeServerSeriesPoint,
  NuanzeServerWalletPosition,
  NuanzeServerWalletTrade,
} from './serverModelTypes';

/**
 * Failure envelope returned with every non-2xx response.
 *
 * Structurally unrelated to `BaseServerFailureResponse`: Nuanze nests a string `code` under `error`
 * instead of carrying a top-level numeric `error_code` and `status: 'failure'`.
 */
export interface NuanzeServerFailureResponse {
  error: {
    code: NuanzeErrorCode;
    message: string;
    requestId: string;
  };
}

/**
 * `GET /markets` response as returned on the wire.
 */
export interface NuanzeServerMarketsResponse {
  markets: NuanzeServerMarket[];
  count: number;
  asOf: string;
}

/**
 * `GET /news` response as returned on the wire. Stories have no decimals.
 */
export interface NuanzeServerNewsResponse {
  stories: NuanzeNewsStory[];
  nextCursor: string | null;
  asOf: string;
}

/**
 * `GET /markets/{ticker}` response as returned on the wire.
 */
export type NuanzeServerMarketByTickerResponse = NuanzeServerMarketDetail;

/**
 * `GET /funding/rates` response as returned on the wire.
 */
export interface NuanzeServerFundingRatesResponse {
  rates: NuanzeServerFundingRate[];
  asOf: string;
}

/**
 * `GET /leaderboard` response as returned on the wire.
 */
export interface NuanzeServerLeaderboardResponse {
  timeframe: NuanzeLeaderboardTimeframe;
  items: NuanzeServerLeaderboardItem[];
  limit: number;
  offset: number;
  total: number;
  asOf: string;
}

/**
 * `GET /platform/summary` response as returned on the wire.
 */
export interface NuanzeServerPlatformSummaryResponse {
  window: NuanzePlatformWindow;
  volume24h: string;
  trades24h: number;
  traders24h: number;
  windowVolume: string;
  windowTrades: number;
  windowTraders: number;
  deltas: NuanzeServerPlatformDeltas;
  asOf: string;
}

/**
 * `GET /wallets/{address}` response as returned on the wire.
 */
export interface NuanzeServerWalletSummaryResponse {
  address: string;
  subaccountName: string | null;
  subaccountCount: number;
  pnlWindow: NuanzePnlWindow;
  accountPnl: string;
  windowPnl: string;
  equity: string | null;
  cumulativeVolume: string;
  windowVolume: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: string | null;
  snapshotAt: string;
  coverage: NuanzeCoverage;
  asOf: string;
}

/**
 * `GET /wallets/{address}/positions` response as returned on the wire.
 */
export interface NuanzeServerWalletPositionsResponse {
  address: string;
  positions: NuanzeServerWalletPosition[];
  count: number;
  newestSnapshotAt: string | null;
  oldestSnapshotAt: string | null;
  asOf: string;
}

/**
 * `GET /markets/{ticker}/trades` response as returned on the wire.
 */
export interface NuanzeServerMarketTradesResponse {
  productId: number;
  symbol: string;
  ticker: string;
  venue: NuanzeMarketVenue;
  trades: NuanzeServerMarketTrade[];
  nextCursor: string | null;
  asOf: string;
}

/**
 * `GET /markets/{ticker}/candles` response as returned on the wire.
 */
export interface NuanzeServerMarketCandlesResponse {
  productId: number;
  symbol: string;
  ticker: string;
  venue: NuanzeMarketVenue;
  interval: NuanzeCandleInterval;
  candles: NuanzeServerCandle[];
  asOf: string;
}

/**
 * `GET /wallets/{address}/trades` response as returned on the wire.
 */
export interface NuanzeServerWalletTradesResponse {
  address: string;
  trades: NuanzeServerWalletTrade[];
  nextCursor: string | null;
  asOf: string;
}

/**
 * `GET /wallets/{address}/pnl` response as returned on the wire.
 */
export interface NuanzeServerWalletPnlResponse {
  address: string;
  subaccountName: string | null;
  window: NuanzePnlWindow;
  windowStart: string;
  windowEnd: string;
  openingAccountPnl: string;
  latestAccountPnl: string;
  windowPnl: string;
  openingEquity: string | null;
  latestEquity: string | null;
  volumeDelta: string;
  sourceInterval: NuanzeSourceInterval;
  latestSnapshotAt: string;
  coverage: NuanzeCoverage;
  asOf: string;
}

/**
 * `GET /wallets/{address}/pnl/series` response as returned on the wire.
 */
export interface NuanzeServerWalletPnlSeriesResponse {
  address: string;
  subaccountName: string | null;
  metric: NuanzeSeriesMetric;
  window: NuanzePnlWindow;
  points: NuanzeServerSeriesPoint[];
  sourceInterval: NuanzeSourceInterval;
  coverage: NuanzeCoverage;
  asOf: string;
}

/**
 * `GET /flows` response as returned on the wire.
 */
export interface NuanzeServerCollateralFlowsResponse {
  events: NuanzeServerCollateralFlow[];
  nextCursor: string | null;
  asOf: string;
}

/**
 * `GET /flows/summary` response as returned on the wire.
 */
export interface NuanzeServerCollateralFlowSummaryResponse {
  timeframe: NuanzeFlowTimeframe;
  deposited: string;
  withdrawn: string;
  net: string;
  gross: string;
  depositCount: number;
  withdrawalCount: number;
  valuedCount: number;
  unvaluedCount: number;
  priorNet: string | null;
  asOf: string;
}

/**
 * `GET /flows/series` response as returned on the wire.
 */
export interface NuanzeServerCollateralFlowSeriesResponse {
  timeframe: NuanzeFlowTimeframe;
  bucket: NuanzeFlowBucket;
  points: NuanzeServerCollateralFlowPoint[];
  asOf: string;
}

/**
 * `GET /markets/{ticker}/positions` response as returned on the wire.
 */
export interface NuanzeServerMarketPositionsResponse {
  productId: number;
  symbol: string;
  ticker: string;
  venue: NuanzeMarketVenue;
  positions: NuanzeServerMarketPosition[];
  nextCursor: string | null;
  dataUpdatedAt: string | null;
  asOf: string;
}

/**
 * Checks whether a response body is a Nuanze failure envelope. The `code` is not compared against
 * {@link NUANZE_ERROR_CODES}, so a code added by a newer API release still reaches the caller.
 */
export function isNuanzeServerFailureResponse(
  data: unknown,
): data is NuanzeServerFailureResponse {
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return false;
  }

  const { error } = data;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}
