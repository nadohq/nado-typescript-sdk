import {
  NuanzeCohortKey,
  NuanzeFlowEventType,
  NuanzeFundamentalsSource,
  NuanzeMarginKind,
  NuanzeMarketComponentUpdatedAt,
  NuanzeMarketIdentity,
  NuanzeMarketTradingStatus,
  NuanzeMarketVenue,
  NuanzeMinPositionUsd,
  NuanzeNewsStory,
  NuanzeNotionalBucket,
  NuanzePositionSide,
  NuanzeTradeSide,
} from './clientModelTypes';

/**
 * Latest price snapshot as returned on the wire. Decimals are finite base-10 strings and timestamps
 * are UTC ISO 8601 strings; `dataMappers.ts` produces the client-facing shapes.
 */
export interface NuanzeServerLatestTicker {
  midPrice: string | null;
  bidPrice: string | null;
  askPrice: string | null;
  volume24h: string | null;
  openInterest: string | null;
  priceChange24hPct: string | null;
  updatedAt: string;
}

/**
 * Market entry as returned on the wire. Unlike the other Nado services, Nuanze already serves
 * camelCase keys and normalized enum values, so only decimals need mapping.
 */
export interface NuanzeServerMarket extends NuanzeMarketIdentity {
  tradingStatus: NuanzeMarketTradingStatus;
  priceIncrement: string;
  sizeIncrement: string;
  minSize: string;
  latest: NuanzeServerLatestTicker | null;
  updatedAt: string;
}

/**
 * Funding observation as returned on the wire.
 */
export interface NuanzeServerFundingObservation {
  rate: string;
  annualizedRate: string;
  observedAt: string;
}

/**
 * Funding rate row as returned on the wire.
 */
export interface NuanzeServerFundingRate
  extends NuanzeMarketIdentity, NuanzeServerFundingObservation {}

/**
 * Nested key-data block as returned on the wire.
 */
export interface NuanzeServerFundamentalsKeyData {
  dividendYield: string | null;
  employees: number | null;
  enterpriseValue: string | null;
  sharesOutstanding: string | null;
  beta: string | null;
  fiftyTwoWeekHigh: string | null;
  fiftyTwoWeekLow: string | null;
  volume: string | null;
  averageVolume: string | null;
  circulatingSupply: string | null;
  totalSupply: string | null;
  maxSupply: string | null;
  fullyDilutedValuation: string | null;
  ath: string | null;
  atl: string | null;
  high24h: string | null;
  low24h: string | null;
}

/**
 * Valuation block as returned on the wire.
 */
export interface NuanzeServerFundamentalsValuation {
  trailingPE: string | null;
  forwardPE: string | null;
  priceToBook: string | null;
  enterpriseToRevenue: string | null;
  enterpriseToEbitda: string | null;
  revenue: string | null;
  profitMargins: string | null;
}

/**
 * Performance block as returned on the wire.
 */
export interface NuanzeServerFundamentalsPerformance {
  oneMonth: string | null;
  threeMonth: string | null;
  ytd: string | null;
  oneYear: string | null;
}

/**
 * Social/link block as returned on the wire. Identical to the client shape.
 */
export interface NuanzeServerFundamentalsSocial {
  website: string | null;
  x: string | null;
  linkedin: string | null;
}

/**
 * Fundamentals projection as returned on the wire.
 */
export interface NuanzeServerStockFundamentals {
  productId: number;
  source: NuanzeFundamentalsSource | null;
  quoteType: string | null;
  currency: string | null;
  name: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  employees: number | null;
  marketCap: string | null;
  keyData: NuanzeServerFundamentalsKeyData;
  valuation: NuanzeServerFundamentalsValuation;
  performance: NuanzeServerFundamentalsPerformance;
  social: NuanzeServerFundamentalsSocial;
  updatedAt: string;
}

/**
 * Resolved market detail as returned on the wire.
 */
export interface NuanzeServerMarketDetail extends NuanzeServerMarket {
  primaryProductId: number;
  availableVenues: NuanzeMarketVenue[];
  primaryVenue: NuanzeMarketVenue;
  funding: NuanzeServerFundingObservation | null;
  fundamentals: NuanzeServerStockFundamentals | null;
  news: NuanzeNewsStory[];
  componentUpdatedAt: NuanzeMarketComponentUpdatedAt;
}

/**
 * Leaderboard row as returned on the wire.
 */
export interface NuanzeServerLeaderboardItem {
  rank: number;
  rankDelta: number | null;
  address: string;
  accountPnl: string;
  pnl24h: string | null;
  pnl7d: string | null;
  pnl30d: string | null;
  pnlAll: string;
  wins: number;
  losses: number;
  winRate: string | null;
}

/**
 * Followed-leaderboard row as returned on the wire.
 */
export interface NuanzeServerFollowedLeaderboardItem {
  subaccountHex: string;
  pnl: string | null;
  wins: number;
  losses: number;
  winRate: string | null;
  trades: number;
  productIds: number[];
  productCount: number;
  globalRank: number | null;
}

/**
 * Platform percentage deltas as returned on the wire.
 */
export interface NuanzeServerPlatformDeltas {
  volumePct: string | null;
  tradesPct: string | null;
  tradersPct: string | null;
}

/**
 * Wallet position snapshot as returned on the wire.
 */
export interface NuanzeServerWalletPosition {
  subaccountName: string;
  productId: number;
  symbol: string;
  ticker: string;
  venue: NuanzeMarketVenue;
  side: NuanzePositionSide;
  isSpot: boolean;
  amount: string;
  oraclePrice: string;
  notional: string;
  unrealizedPnl: string;
  snapshotAt: string;
}

/**
 * Market tape row as returned on the wire.
 */
export interface NuanzeServerMarketTrade {
  id: number;
  productId: number;
  symbol: string;
  ticker: string;
  venue: NuanzeMarketVenue;
  side: NuanzeTradeSide;
  price: string;
  amount: string;
  notional: string;
  matchedAt: string;
}

/**
 * Per-trader market position leg as returned on the wire.
 */
export interface NuanzeServerMarketPosition {
  subaccountOwner: string;
  subaccountName: string;
  symbol: string;
  marginKind: NuanzeMarginKind;
  side: NuanzePositionSide;
  notional: string;
  upnl: string;
  margin: string | null;
  entryPrice: string | null;
}

/**
 * Candle as returned on the wire.
 */
export interface NuanzeServerCandle {
  openTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  complete: boolean;
}

/**
 * Wallet trade as returned on the wire.
 */
export interface NuanzeServerWalletTrade {
  id: number;
  subaccountName: string;
  productId: number;
  symbol: string;
  ticker: string;
  venue: NuanzeMarketVenue;
  side: NuanzeTradeSide;
  isMaker: boolean;
  price: string;
  amount: string;
  notional: string;
  matchedAt: string;
}

/**
 * Wallet series point as returned on the wire.
 */
export interface NuanzeServerSeriesPoint {
  timestamp: string;
  value: string | null;
  synthetic: boolean;
  provisional: boolean;
}

/**
 * Collateral event as returned on the wire. Tags have no decimals.
 */
export interface NuanzeServerCollateralFlow {
  id: number;
  eventType: NuanzeFlowEventType;
  productId: number;
  symbol: string;
  assetAmount: string;
  oraclePrice: string | null;
  usdValue: string | null;
  owner: string;
  subaccountName: string;
  timestamp: string;
  tags: {
    whale: boolean;
    smartMoney: boolean;
    freshWallet: boolean;
  };
}

/**
 * Collateral flow series point as returned on the wire.
 */
export interface NuanzeServerCollateralFlowPoint {
  timestamp: string;
  deposited: string;
  withdrawn: string;
  net: string;
  cumulativeNet: string;
  eventCount: number;
  valuedCount: number;
  unvaluedCount: number;
}

/**
 * Positioning totals as returned on the wire.
 */
export interface NuanzeServerPositioningTotals {
  longPositions: number | null;
  shortPositions: number | null;
  longOwners: number | null;
  shortOwners: number | null;
  netFlatOwners: number | null;
  longNotional: string | null;
  shortNotional: string | null;
  longPositionPct: string | null;
  shortPositionPct: string | null;
  longShortRatio: string | null;
}

/**
 * Shared positioning cell fields as returned on the wire.
 */
export interface NuanzeServerPositioningCellBase {
  label: string;
  side: NuanzePositionSide | null;
  suppressed: boolean;
  suppressionThreshold: 20;
  positions: number | null;
  owners: number | null;
  notional: string | null;
  averageNotional: string | null;
  percentage: string | null;
}

/**
 * Side positioning cell as returned on the wire.
 */
export interface NuanzeServerSidePositioningCell extends NuanzeServerPositioningCellBase {
  key: NuanzePositionSide;
}

/**
 * Cohort positioning cell as returned on the wire.
 */
export interface NuanzeServerCohortPositioningCell extends NuanzeServerPositioningCellBase {
  key: NuanzeCohortKey;
}

/**
 * Notional-bucket positioning cell as returned on the wire.
 */
export interface NuanzeServerNotionalBucketPositioningCell extends NuanzeServerPositioningCellBase {
  key: NuanzeNotionalBucket;
}

/**
 * Shared positioning response fields as returned on the wire.
 */
export interface NuanzeServerMarketPositioningBase extends NuanzeMarketIdentity {
  effectiveMinPositionUsd: NuanzeMinPositionUsd;
  suppressionThreshold: 20;
  totals: NuanzeServerPositioningTotals;
  newestSnapshotAt: string | null;
  oldestSnapshotAt: string | null;
  asOf: string;
}

/**
 * Side-grouped positioning response as returned on the wire.
 */
export interface NuanzeServerMarketPositioningSideResponse extends NuanzeServerMarketPositioningBase {
  groupBy: 'side';
  cells: NuanzeServerSidePositioningCell[];
}

/**
 * Cohort-grouped positioning response as returned on the wire.
 */
export interface NuanzeServerMarketPositioningCohortResponse extends NuanzeServerMarketPositioningBase {
  groupBy: 'cohort';
  cells: NuanzeServerCohortPositioningCell[];
}

/**
 * Notional-bucket positioning response as returned on the wire.
 */
export interface NuanzeServerMarketPositioningNotionalBucketResponse extends NuanzeServerMarketPositioningBase {
  groupBy: 'notionalBucket';
  cells: NuanzeServerNotionalBucketPositioningCell[];
}

/**
 * Discriminated positioning response as returned on the wire.
 */
export type NuanzeServerMarketPositioningResponse =
  | NuanzeServerMarketPositioningSideResponse
  | NuanzeServerMarketPositioningCohortResponse
  | NuanzeServerMarketPositioningNotionalBucketResponse;
