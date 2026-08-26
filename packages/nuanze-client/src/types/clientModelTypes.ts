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
export interface NuanzeMarket {
  /** Public product ID. Perpetuals are even, spot markets odd. */
  productId: number;
  /** Venue-native symbol, for example `ETH-PERP`. */
  symbol: string;
  /** Canonical ticker, for example `ETH`. */
  ticker: string;
  /** Venue the product trades on. */
  venue: NuanzeMarketVenue;
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
