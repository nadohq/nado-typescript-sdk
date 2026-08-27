import BigNumber from 'bignumber.js';

/**
 * Every {@link NuanzeMarketVenue} the API can report, for callers that need the values at runtime
 * (validation, filters, UI enumeration).
 */
export const NUANZE_MARKET_VENUES = ['perp', 'spot'] as const;

/**
 * Venue a market is listed on. Perpetuals use even product IDs, spot markets odd ones.
 */
export type NuanzeMarketVenue = (typeof NUANZE_MARKET_VENUES)[number];

/**
 * Every {@link NuanzeMarketTradingStatus} the API can report, for callers that need the values at
 * runtime (validation, filters, UI enumeration).
 */
export const NUANZE_MARKET_TRADING_STATUSES = [
  'live',
  'notTradable',
  'reduceOnly',
  'postOnly',
  'softReduceOnly',
] as const;

/**
 * Normalized tradability state of a market. The API camelCases the engine's snake_case source values,
 * so `not_tradable` arrives as `notTradable`.
 */
export type NuanzeMarketTradingStatus =
  (typeof NUANZE_MARKET_TRADING_STATUSES)[number];

/**
 * Every {@link NuanzeNewsSentiment} the API can report.
 */
export const NUANZE_NEWS_SENTIMENTS = [
  'bearish',
  'bullish',
  'neutral',
] as const;

/**
 * Editorial sentiment of a published news story.
 */
export type NuanzeNewsSentiment = (typeof NUANZE_NEWS_SENTIMENTS)[number];

/**
 * Every {@link NuanzeNewsEventType} the API can report.
 */
export const NUANZE_NEWS_EVENT_TYPES = [
  'earnings',
  'guidance',
  'ma',
  'regulatory',
  'product',
  'analyst',
  'macro',
  'personnel',
  'legal',
  'other',
] as const;

/**
 * Editorial event classification of a published news story.
 */
export type NuanzeNewsEventType = (typeof NUANZE_NEWS_EVENT_TYPES)[number];

/**
 * Every {@link NuanzeNewsTier} the API can report.
 */
export const NUANZE_NEWS_TIERS = ['core', 'us', 'global'] as const;

/**
 * Geographic/priority tier of a published news story, or null when unassigned.
 */
export type NuanzeNewsTier = (typeof NUANZE_NEWS_TIERS)[number];

/**
 * Every {@link NuanzeNewsEntityRole} the API can report. Values are the wire strings; `read_across`
 * is not camelCased.
 */
export const NUANZE_NEWS_ENTITY_ROLES = ['subject', 'read_across'] as const;

/**
 * Role of a market entity on a news story.
 */
export type NuanzeNewsEntityRole = (typeof NUANZE_NEWS_ENTITY_ROLES)[number];

/**
 * Every {@link NuanzePnlWindow} the API can report.
 */
export const NUANZE_PNL_WINDOWS = ['24h', '7d', '30d', '90d', 'all'] as const;

/**
 * Account PnL lookback window.
 */
export type NuanzePnlWindow = (typeof NUANZE_PNL_WINDOWS)[number];

/**
 * Every {@link NuanzeLeaderboardTimeframe} the API can report.
 */
export const NUANZE_LEADERBOARD_TIMEFRAMES = [
  '24h',
  '7d',
  '30d',
  'all',
] as const;

/**
 * Leaderboard ranking window. All-time analytics cost five rate-limit units.
 */
export type NuanzeLeaderboardTimeframe =
  (typeof NUANZE_LEADERBOARD_TIMEFRAMES)[number];

/**
 * Every {@link NuanzePlatformWindow} the API can report.
 */
export const NUANZE_PLATFORM_WINDOWS = ['7d', '30d', '90d'] as const;

/**
 * Selected comparison window for platform activity aggregates.
 */
export type NuanzePlatformWindow = (typeof NUANZE_PLATFORM_WINDOWS)[number];

/**
 * Every {@link NuanzeFlowTimeframe} the API can report.
 */
export const NUANZE_FLOW_TIMEFRAMES = ['24h', '7d', '30d', 'all'] as const;

/**
 * Collateral-flow lookback window.
 */
export type NuanzeFlowTimeframe = (typeof NUANZE_FLOW_TIMEFRAMES)[number];

/**
 * Every {@link NuanzeFlowEventTypeFilter} the API accepts as a query filter.
 */
export const NUANZE_FLOW_EVENT_TYPE_FILTERS = [
  'all',
  'deposit',
  'withdrawal',
] as const;

/**
 * Collateral event type filter. `all` includes both deposits and withdrawals.
 */
export type NuanzeFlowEventTypeFilter =
  (typeof NUANZE_FLOW_EVENT_TYPE_FILTERS)[number];

/**
 * Every {@link NuanzeFlowEventType} a collateral event can have.
 */
export const NUANZE_FLOW_EVENT_TYPES = ['deposit', 'withdrawal'] as const;

/**
 * On-chain collateral event kind.
 */
export type NuanzeFlowEventType = (typeof NUANZE_FLOW_EVENT_TYPES)[number];

/**
 * Every {@link NuanzeFlowBucket} the API can report.
 */
export const NUANZE_FLOW_BUCKETS = ['hour', 'day'] as const;

/**
 * UTC bucket size for collateral flow series. Allowed pairs are 24h/hour, 7d/hour or day
 * (default hour), 30d/day, and all/day.
 */
export type NuanzeFlowBucket = (typeof NUANZE_FLOW_BUCKETS)[number];

/**
 * Every {@link NuanzeCandleInterval} the API can report.
 */
export const NUANZE_CANDLE_INTERVALS = ['1h', '4h', '1d'] as const;

/**
 * Candle bar interval. Source storage is 1h; 4h and 1d are UTC-aligned rollups.
 */
export type NuanzeCandleInterval = (typeof NUANZE_CANDLE_INTERVALS)[number];

/**
 * Every {@link NuanzeSeriesMetric} the API can report.
 */
export const NUANZE_SERIES_METRICS = ['pnl', 'equity', 'volume'] as const;

/**
 * Wallet series metric.
 */
export type NuanzeSeriesMetric = (typeof NUANZE_SERIES_METRICS)[number];

/**
 * Every {@link NuanzeCoverage} the API can report.
 */
export const NUANZE_COVERAGES = ['complete', 'partial'] as const;

/**
 * Whether a snapshot or window has full historical coverage.
 */
export type NuanzeCoverage = (typeof NUANZE_COVERAGES)[number];

/**
 * Every {@link NuanzePositionSide} the API can report.
 */
export const NUANZE_POSITION_SIDES = ['long', 'short'] as const;

/**
 * Direction of an open position.
 */
export type NuanzePositionSide = (typeof NUANZE_POSITION_SIDES)[number];

/**
 * Every {@link NuanzeTradeSide} the API can report.
 */
export const NUANZE_TRADE_SIDES = ['buy', 'sell'] as const;

/**
 * Aggressor side of a match.
 */
export type NuanzeTradeSide = (typeof NUANZE_TRADE_SIDES)[number];

/**
 * Every {@link NuanzeMarginKind} the API can report.
 */
export const NUANZE_MARGIN_KINDS = ['cross', 'isolated'] as const;

/**
 * Margin mode of a perpetual position leg.
 */
export type NuanzeMarginKind = (typeof NUANZE_MARGIN_KINDS)[number];

/**
 * Every {@link NuanzePositioningGroupBy} the API can report.
 */
export const NUANZE_POSITIONING_GROUP_BYS = [
  'side',
  'cohort',
  'notionalBucket',
] as const;

/**
 * Positioning cell grouping.
 */
export type NuanzePositioningGroupBy =
  (typeof NUANZE_POSITIONING_GROUP_BYS)[number];

/**
 * Every {@link NuanzeMinPositionUsd} the API accepts. Values are USD threshold strings, not numbers.
 */
export const NUANZE_MIN_POSITION_USDS = [
  '10',
  '100',
  '1000',
  '10000',
  '100000',
] as const;

/**
 * Fixed USD inclusion threshold. Qualification is strictly `abs(netNotional) > minPositionUsd`.
 */
export type NuanzeMinPositionUsd = (typeof NUANZE_MIN_POSITION_USDS)[number];

/**
 * Every {@link NuanzeCohortKey} the API can report. Values are the wire strings.
 */
export const NUANZE_COHORT_KEYS = [
  'extremely_profitable',
  'very_profitable',
  'profitable',
  'unprofitable',
  'very_unprofitable',
  'rekt',
] as const;

/**
 * Wallet cohort label used by positioning cells.
 */
export type NuanzeCohortKey = (typeof NUANZE_COHORT_KEYS)[number];

/**
 * Every {@link NuanzeNotionalBucket} the API can report. Frozen USD ranges are small [10, 1000),
 * medium [1000, 10000), large [10000, 100000), and whale [100000, +infinity).
 */
export const NUANZE_NOTIONAL_BUCKETS = [
  'small',
  'medium',
  'large',
  'whale',
] as const;

/**
 * Notional-bucket key used by positioning cells.
 */
export type NuanzeNotionalBucket = (typeof NUANZE_NOTIONAL_BUCKETS)[number];

/**
 * Every {@link NuanzeFundamentalsSource} the API can report.
 */
export const NUANZE_FUNDAMENTALS_SOURCES = ['yahoo', 'coingecko'] as const;

/**
 * Provider that populated a fundamentals projection.
 */
export type NuanzeFundamentalsSource =
  (typeof NUANZE_FUNDAMENTALS_SOURCES)[number];

/**
 * Every {@link NuanzeSourceInterval} the API can report.
 */
export const NUANZE_SOURCE_INTERVALS = ['hour', 'day', 'mixed'] as const;

/**
 * Snapshot grain used for a wallet PnL window or series.
 */
export type NuanzeSourceInterval = (typeof NUANZE_SOURCE_INTERVALS)[number];

/**
 * Canonical market identity shared by market-derived objects. `productId` is unambiguous; ticker
 * is a case-insensitive display lookup.
 */
export interface NuanzeMarketIdentity {
  /** Public product ID. Perpetuals are even, spot markets odd. */
  productId: number;
  /** Venue-native symbol, for example `ETH-PERP`. */
  symbol: string;
  /** Canonical ticker, for example `ETH`. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
}

/**
 * Latest price snapshot for a market. Every field is null until the first snapshot for that market
 * lands; prices refresh about every minute.
 */
export interface NuanzeLatestTicker {
  /** Mid price, or null when no quote is available. */
  midPrice: BigNumber | null;
  /** Best bid, or null when no quote is available. */
  bidPrice: BigNumber | null;
  /** Best ask, or null when no quote is available. */
  askPrice: BigNumber | null;
  /** Rolling 24-hour traded volume, or null when unknown. */
  volume24h: BigNumber | null;
  /** Open interest, or null when unknown. */
  openInterest: BigNumber | null;
  /** Rolling 24-hour price change in percent, or null when unknown. */
  priceChange24hPct: BigNumber | null;
  /** When the snapshot was taken, as a UTC ISO 8601 string. */
  updatedAt: string;
}

/**
 * A market listed on Nado, as served by Nuanze. Timestamps stay UTC ISO 8601 strings rather than
 * `Date`, matching the API contract.
 */
export interface NuanzeMarket extends NuanzeMarketIdentity {
  /** Normalized tradability state. */
  tradingStatus: NuanzeMarketTradingStatus;
  /** Minimum price step. */
  priceIncrement: BigNumber;
  /** Minimum size step. */
  sizeIncrement: BigNumber;
  /** Minimum order size. */
  minSize: BigNumber;
  /** Latest price snapshot, or null when none exists yet. */
  latest: NuanzeLatestTicker | null;
  /** When market metadata was last synced, as a UTC ISO 8601 string. */
  updatedAt: string;
}

/**
 * Latest funding observation for a perpetual.
 */
export interface NuanzeFundingObservation {
  /** Instantaneous funding rate. */
  rate: BigNumber;
  /** Annualized funding rate. */
  annualizedRate: BigNumber;
  /** When the observation was taken, as a UTC ISO 8601 string. */
  observedAt: string;
}

/**
 * Latest funding rate for an active perpetual market.
 */
export interface NuanzeFundingRate
  extends NuanzeMarketIdentity, NuanzeFundingObservation {}

/**
 * Market entity referenced by a published news story. No decimals.
 */
export interface NuanzeNewsEntity {
  /** Stable entity key. */
  key: string;
  /** Display name. */
  name: string;
  /** Whether the entity is the story subject or a read-across market. */
  role: NuanzeNewsEntityRole;
  /** Linked product ID, or null when the entity is not a listed market. */
  productId: number | null;
}

/**
 * Published editorial story. Raw ingestion, scoring, queue, and newsdesk fields are excluded.
 */
export interface NuanzeNewsStory {
  /** Story ID. */
  id: string;
  /** Short headline, or null when unpublished as a headline. */
  headline: string | null;
  /** Story title. */
  title: string;
  /** Short blurb, or null when absent. */
  blurb: string | null;
  /** Canonical story URL. */
  url: string;
  /** Publisher name, or null when unknown. */
  publisher: string | null;
  /** Publication time as a UTC ISO 8601 string, or null when unscheduled. */
  publishedAt: string | null;
  /** Thumbnail URL, or null when absent. */
  thumbnailUrl: string | null;
  /** Event classification, or null when unassigned. */
  eventType: NuanzeNewsEventType | null;
  /** Editorial sentiment. */
  sentiment: NuanzeNewsSentiment;
  /** Geographic/priority tier, or null when unassigned. */
  tier: NuanzeNewsTier | null;
  /** Number of contributing sources. */
  sourceCount: number;
  /** Public entity references only. */
  entities: NuanzeNewsEntity[];
}

/**
 * Nested key-data block of a fundamentals projection. Employee count stays an integer; every other
 * numeric field is a decimal.
 */
export interface NuanzeFundamentalsKeyData {
  /** Dividend yield, or null when unknown. */
  dividendYield: BigNumber | null;
  /** Employee count, or null when unknown. */
  employees: number | null;
  /** Enterprise value, or null when unknown. */
  enterpriseValue: BigNumber | null;
  /** Shares outstanding, or null when unknown. */
  sharesOutstanding: BigNumber | null;
  /** Beta, or null when unknown. */
  beta: BigNumber | null;
  /** 52-week high, or null when unknown. */
  fiftyTwoWeekHigh: BigNumber | null;
  /** 52-week low, or null when unknown. */
  fiftyTwoWeekLow: BigNumber | null;
  /** Volume, or null when unknown. */
  volume: BigNumber | null;
  /** Average volume, or null when unknown. */
  averageVolume: BigNumber | null;
  /** Circulating supply, or null when unknown. */
  circulatingSupply: BigNumber | null;
  /** Total supply, or null when unknown. */
  totalSupply: BigNumber | null;
  /** Max supply, or null when unknown. */
  maxSupply: BigNumber | null;
  /** Fully diluted valuation, or null when unknown. */
  fullyDilutedValuation: BigNumber | null;
  /** All-time high, or null when unknown. */
  ath: BigNumber | null;
  /** All-time low, or null when unknown. */
  atl: BigNumber | null;
  /** 24-hour high, or null when unknown. */
  high24h: BigNumber | null;
  /** 24-hour low, or null when unknown. */
  low24h: BigNumber | null;
}

/**
 * Valuation ratios of a fundamentals projection.
 */
export interface NuanzeFundamentalsValuation {
  /** Trailing P/E, or null when unknown. */
  trailingPE: BigNumber | null;
  /** Forward P/E, or null when unknown. */
  forwardPE: BigNumber | null;
  /** Price to book, or null when unknown. */
  priceToBook: BigNumber | null;
  /** Enterprise value to revenue, or null when unknown. */
  enterpriseToRevenue: BigNumber | null;
  /** Enterprise value to EBITDA, or null when unknown. */
  enterpriseToEbitda: BigNumber | null;
  /** Revenue, or null when unknown. */
  revenue: BigNumber | null;
  /** Profit margins, or null when unknown. */
  profitMargins: BigNumber | null;
}

/**
 * Performance returns of a fundamentals projection.
 */
export interface NuanzeFundamentalsPerformance {
  /** One-month return, or null when unknown. */
  oneMonth: BigNumber | null;
  /** Three-month return, or null when unknown. */
  threeMonth: BigNumber | null;
  /** Year-to-date return, or null when unknown. */
  ytd: BigNumber | null;
  /** One-year return, or null when unknown. */
  oneYear: BigNumber | null;
}

/**
 * Social/link fields of a fundamentals projection. No decimals.
 */
export interface NuanzeFundamentalsSocial {
  /** Website URL, or null when unknown. */
  website: string | null;
  /** X/Twitter URL, or null when unknown. */
  x: string | null;
  /** LinkedIn URL, or null when unknown. */
  linkedin: string | null;
}

/**
 * Approved stock/token fundamentals projection. The entire value is null when no row exists.
 */
export interface NuanzeStockFundamentals {
  /** Product the projection belongs to. */
  productId: number;
  /** Provider, or null when unknown. */
  source: NuanzeFundamentalsSource | null;
  /** Quote type, or null when unknown. */
  quoteType: string | null;
  /** Quote currency, or null when unknown. */
  currency: string | null;
  /** Display name, or null when unknown. */
  name: string | null;
  /** Description, or null when unknown. */
  description: string | null;
  /** Sector, or null when unknown. */
  sector: string | null;
  /** Industry, or null when unknown. */
  industry: string | null;
  /** Website URL, or null when unknown. */
  website: string | null;
  /** Employee count, or null when unknown. */
  employees: number | null;
  /** Market cap, or null when unknown. */
  marketCap: BigNumber | null;
  /** Nested key-data decimals. */
  keyData: NuanzeFundamentalsKeyData;
  /** Nested valuation decimals. */
  valuation: NuanzeFundamentalsValuation;
  /** Nested performance decimals. */
  performance: NuanzeFundamentalsPerformance;
  /** Nested social links. */
  social: NuanzeFundamentalsSocial;
  /** When the projection was last updated, as a UTC ISO 8601 string. */
  updatedAt: string;
}

/**
 * Per-component freshness timestamps on a resolved market detail.
 */
export interface NuanzeMarketComponentUpdatedAt {
  /** When market metadata was last synced. */
  market: string;
  /** When the latest ticker was last synced. */
  ticker: string;
  /** When funding was last observed, or null when absent. */
  funding: string | null;
  /** When fundamentals were last updated, or null when absent. */
  fundamentals: string | null;
  /** When related news was last updated, or null when absent. */
  news: string | null;
}

/**
 * Resolved market detail: list market fields plus venue resolution, funding, fundamentals, and
 * recent published news.
 */
export interface NuanzeMarketDetail extends NuanzeMarket {
  /** Primary product ID for the asset. */
  primaryProductId: number;
  /** Venues the asset currently lists on. */
  availableVenues: NuanzeMarketVenue[];
  /** Venue used when the request omitted one. */
  primaryVenue: NuanzeMarketVenue;
  /** Latest funding observation, or null for spot or when none exists. */
  funding: NuanzeFundingObservation | null;
  /** Fundamentals projection, or null when no row exists. */
  fundamentals: NuanzeStockFundamentals | null;
  /** Recent published stories, capped by `newsLimit`. */
  news: NuanzeNewsStory[];
  /** Mixed-source freshness timestamps. */
  componentUpdatedAt: NuanzeMarketComponentUpdatedAt;
}

/**
 * Per-subaccount row from `POST /wallets/leaderboard`. Unknown or window-younger
 * subaccounts are backfilled with `pnl: null`, `globalRank: null`, zero counts, and
 * an empty `productIds`.
 */
export interface NuanzeFollowedLeaderboardItem {
  /**
   * Lowercase bytes32 subaccount hex (owner + name), the SDK `subaccountToHex` form.
   */
  subaccountHex: string;
  /**
   * Equity-basis account PnL for the requested timeframe, or null when the subaccount
   * has no data in the window.
   */
  pnl: BigNumber | null;
  /** Close-derived win count. */
  wins: number;
  /** Close-derived loss count. */
  losses: number;
  /** Win rate, or null when there are no closed trades. */
  winRate: BigNumber | null;
  /** Perp fill count in the window. */
  trades: number;
  /** Traded product IDs, sorted by fill count descending. */
  productIds: number[];
  /** Number of distinct traded products. Equals `productIds.length`. */
  productCount: number;
  /**
   * Rank among all subaccounts by this timeframe's PnL (`1` = highest), or null when
   * the subaccount has no PnL in the window.
   */
  globalRank: number | null;
}

/**
 * Leaderboard row. PnL is equity-basis account PnL, not realized PnL.
 */
export interface NuanzeLeaderboardItem {
  /** Rank in the selected timeframe. */
  rank: number;
  /** Rank change versus the prior window, or null when unknown. */
  rankDelta: number | null;
  /** Lowercased wallet address. */
  address: string;
  /** Account PnL for the selected timeframe. */
  accountPnl: BigNumber;
  /** Rolling 24-hour account PnL, or null when uncovered. */
  pnl24h: BigNumber | null;
  /** 7-day account PnL, or null when uncovered. */
  pnl7d: BigNumber | null;
  /** 30-day account PnL, or null when uncovered. */
  pnl30d: BigNumber | null;
  /** All-time account PnL. */
  pnlAll: BigNumber;
  /** Close-derived win count. */
  wins: number;
  /** Close-derived loss count. */
  losses: number;
  /** Win rate, or null when there are no closed trades. */
  winRate: BigNumber | null;
}

/**
 * Prior-window percentage deltas on the platform summary.
 */
export interface NuanzePlatformDeltas {
  /** Volume change versus the prior equal window, or null when unavailable. */
  volumePct: BigNumber | null;
  /** Trade-count change versus the prior equal window, or null when unavailable. */
  tradesPct: BigNumber | null;
  /** Trader-count change versus the prior equal window, or null when unavailable. */
  tradersPct: BigNumber | null;
}

/**
 * Replica-backed wallet position snapshot. Not an execution-grade live feed.
 */
export interface NuanzeWalletPosition {
  /** Subaccount that owns the row. */
  subaccountName: string;
  /** Public product ID. */
  productId: number;
  /** Venue-native symbol. */
  symbol: string;
  /** Canonical ticker. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
  /** Position direction. */
  side: NuanzePositionSide;
  /** Whether the row is a spot balance. */
  isSpot: boolean;
  /** Signed position size. */
  amount: BigNumber;
  /** Oracle price at snapshot time. */
  oraclePrice: BigNumber;
  /** Absolute notional. */
  notional: BigNumber;
  /** Unrealized PnL. */
  unrealizedPnl: BigNumber;
  /** When the snapshot was taken, as a UTC ISO 8601 string. */
  snapshotAt: string;
}

/**
 * Taker-side market tape row. Wallet identity is absent.
 */
export interface NuanzeMarketTrade {
  /** Match row ID. */
  id: number;
  /** Public product ID. */
  productId: number;
  /** Venue-native symbol. */
  symbol: string;
  /** Canonical ticker. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
  /** Aggressor side. */
  side: NuanzeTradeSide;
  /** Fill price. */
  price: BigNumber;
  /** Fill size. */
  amount: BigNumber;
  /** Notional. */
  notional: BigNumber;
  /** Match time as a UTC ISO 8601 string. */
  matchedAt: string;
}

/**
 * Open perpetual position leg for a resolved market. Wallet addresses are returned.
 */
export interface NuanzeMarketPosition {
  /** Lowercased owner address. */
  subaccountOwner: string;
  /** Subaccount name. */
  subaccountName: string;
  /** Venue-native symbol. */
  symbol: string;
  /** Margin mode. Isolated margin is isolated equity and is null when non-positive. */
  marginKind: NuanzeMarginKind;
  /** Position direction. */
  side: NuanzePositionSide;
  /** Absolute notional. Legs below $10 are excluded by the API. */
  notional: BigNumber;
  /** Unrealized PnL. */
  upnl: BigNumber;
  /**
   * Cross: market implied initial requirement. Isolated: isolated equity, or null when
   * non-positive or unavailable.
   */
  margin: BigNumber | null;
  /** Entry price, or null when unavailable. */
  entryPrice: BigNumber | null;
}

/**
 * OHLCV candle. Missing source bars are not interpolated. A current bucket has `complete=false`.
 */
export interface NuanzeCandle {
  /** Bar open time as a UTC ISO 8601 string. */
  openTime: string;
  /** Open price. */
  open: BigNumber;
  /** High price. */
  high: BigNumber;
  /** Low price. */
  low: BigNumber;
  /** Close price. */
  close: BigNumber;
  /** Traded volume. */
  volume: BigNumber;
  /** False when the bar is still accumulating. */
  complete: boolean;
}

/**
 * Wallet-owned execution row. Unlike market tape, both maker and taker fills are included.
 */
export interface NuanzeWalletTrade {
  /** Match row ID. */
  id: number;
  /** Subaccount that filled. */
  subaccountName: string;
  /** Public product ID. */
  productId: number;
  /** Venue-native symbol. */
  symbol: string;
  /** Canonical ticker. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
  /** Side of this wallet's fill. */
  side: NuanzeTradeSide;
  /** Whether this wallet was the maker. */
  isMaker: boolean;
  /** Fill price. */
  price: BigNumber;
  /** Fill size. */
  amount: BigNumber;
  /** Notional. */
  notional: BigNumber;
  /** Match time as a UTC ISO 8601 string. */
  matchedAt: string;
}

/**
 * Sampled wallet series point. Synthetic points are the boundary anchor or carried-forward tip.
 */
export interface NuanzeSeriesPoint {
  /** Point time as a UTC ISO 8601 string. */
  timestamp: string;
  /** Metric value, or null when the bucket has no observation. */
  value: BigNumber | null;
  /** True when the point is a synthetic anchor or tip. */
  synthetic: boolean;
  /** True when the latest bucket is still provisional. */
  provisional: boolean;
}

/**
 * Public tags on a collateral event. No identity beyond the event's own owner.
 */
export interface NuanzeFlowTags {
  /** Whether the owner is tagged as a whale. */
  whale: boolean;
  /** Whether the owner is tagged as smart money. */
  smartMoney: boolean;
  /** Whether the owner is tagged as a fresh wallet. */
  freshWallet: boolean;
}

/**
 * Public on-chain collateral event. Product 0 and 11 may use fallback symbols.
 */
export interface NuanzeCollateralFlow {
  /** Event ID. */
  id: number;
  /** Deposit or withdrawal. */
  eventType: NuanzeFlowEventType;
  /** Public product ID. */
  productId: number;
  /** Asset symbol. */
  symbol: string;
  /** Exact asset amount. */
  assetAmount: BigNumber;
  /** Oracle price at event time, or null when unvalued. */
  oraclePrice: BigNumber | null;
  /** USD valuation, or null when unvalued. */
  usdValue: BigNumber | null;
  /** Lowercased owner address. */
  owner: string;
  /** Subaccount name. */
  subaccountName: string;
  /** Event time as a UTC ISO 8601 string. */
  timestamp: string;
  /** Public tags. */
  tags: NuanzeFlowTags;
}

/**
 * UTC-bucketed collateral flow point.
 */
export interface NuanzeCollateralFlowPoint {
  /** Bucket start as a UTC ISO 8601 string. */
  timestamp: string;
  /** Deposited USD in the bucket. */
  deposited: BigNumber;
  /** Withdrawn USD in the bucket. */
  withdrawn: BigNumber;
  /** Net USD in the bucket. */
  net: BigNumber;
  /** Cumulative net USD through this bucket. */
  cumulativeNet: BigNumber;
  /** Event count. */
  eventCount: number;
  /** Count of valued events. */
  valuedCount: number;
  /** Count of unvalued events. */
  unvaluedCount: number;
}

/**
 * Aggregate long/short totals for a positioning response. All reversible fields are null when any
 * contributing cell required by the grouping is suppressed.
 */
export interface NuanzePositioningTotals {
  /** Long position count at the owner/subaccount grain, or null if suppressed. */
  longPositions: number | null;
  /** Short position count at the owner/subaccount grain, or null if suppressed. */
  shortPositions: number | null;
  /** Distinct long owners, or null if suppressed. */
  longOwners: number | null;
  /** Distinct short owners, or null if suppressed. */
  shortOwners: number | null;
  /** Owners netted flat, or null if suppressed. */
  netFlatOwners: number | null;
  /** Long notional, or null if suppressed. */
  longNotional: BigNumber | null;
  /** Short notional, or null if suppressed. */
  shortNotional: BigNumber | null;
  /** Long share of positions, or null if suppressed. */
  longPositionPct: BigNumber | null;
  /** Short share of positions, or null if suppressed. */
  shortPositionPct: BigNumber | null;
  /** Long/short ratio, or null if suppressed. */
  longShortRatio: BigNumber | null;
}

/**
 * Shared fields of a privacy-preserving positioning cell. For a suppressed cell every reversible
 * value is null; only the label, key, suppressed flag, and threshold remain.
 */
export interface NuanzePositioningCellBase {
  /** Display label. */
  label: string;
  /** Side this cell describes, or null when the grouping is not by side. */
  side: NuanzePositionSide | null;
  /** True when complementary or cross-request suppression nulls reversible metrics. */
  suppressed: boolean;
  /** Owner-count suppression threshold. Always 20. */
  suppressionThreshold: 20;
  /** Position count, or null if suppressed. */
  positions: number | null;
  /** Distinct contributing owners, or null if suppressed. */
  owners: number | null;
  /** Cell notional, or null if suppressed. */
  notional: BigNumber | null;
  /** Average notional, or null if suppressed. */
  averageNotional: BigNumber | null;
  /** Share of the grouping, or null if suppressed. */
  percentage: BigNumber | null;
}

/**
 * Positioning cell grouped by side.
 */
export interface NuanzeSidePositioningCell extends NuanzePositioningCellBase {
  /** Side key. */
  key: NuanzePositionSide;
}

/**
 * Positioning cell grouped by wallet cohort.
 */
export interface NuanzeCohortPositioningCell extends NuanzePositioningCellBase {
  /** Cohort key. */
  key: NuanzeCohortKey;
}

/**
 * Positioning cell grouped by frozen USD notional bucket. Empty buckets are omitted rather than
 * returned with zeros.
 */
export interface NuanzeNotionalBucketPositioningCell extends NuanzePositioningCellBase {
  /** Notional-bucket key. */
  key: NuanzeNotionalBucket;
}

/**
 * Shared fields of every positioning response. Identity, entry price, PnL, margin, and leverage
 * are never returned.
 */
export interface NuanzeMarketPositioningBase extends NuanzeMarketIdentity {
  /** Effective inclusion threshold after request validation. */
  effectiveMinPositionUsd: NuanzeMinPositionUsd;
  /** Owner-count suppression threshold. Always 20. */
  suppressionThreshold: 20;
  /** Grouping totals; reversible fields are null when any required cell is suppressed. */
  totals: NuanzePositioningTotals;
  /** Newest contributing snapshot, or null when none. */
  newestSnapshotAt: string | null;
  /** Oldest contributing snapshot, or null when none. */
  oldestSnapshotAt: string | null;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}

/**
 * Positioning grouped by side. Always two cells, long then short.
 */
export interface NuanzeMarketPositioningSideResponse extends NuanzeMarketPositioningBase {
  /** Grouping discriminator. */
  groupBy: 'side';
  /** Long and short cells. */
  cells: NuanzeSidePositioningCell[];
}

/**
 * Positioning grouped by wallet cohort.
 */
export interface NuanzeMarketPositioningCohortResponse extends NuanzeMarketPositioningBase {
  /** Grouping discriminator. */
  groupBy: 'cohort';
  /** Cohort cells. */
  cells: NuanzeCohortPositioningCell[];
}

/**
 * Positioning grouped by notional bucket.
 */
export interface NuanzeMarketPositioningNotionalBucketResponse extends NuanzeMarketPositioningBase {
  /** Grouping discriminator. */
  groupBy: 'notionalBucket';
  /** Notional-bucket cells. Empty buckets omitted. */
  cells: NuanzeNotionalBucketPositioningCell[];
}
