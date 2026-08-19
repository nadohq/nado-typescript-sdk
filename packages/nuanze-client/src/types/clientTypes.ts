import type { NuanzeDecimal } from './decimal';
import type { NuanzeMarketTradingStatus, NuanzeMarketVenue } from './enums';

/**
 * Client-facing request parameters and mapped responses.
 *
 * Documented decimal fields become {@link NuanzeDecimal}. Timestamps stay UTC
 * ISO 8601 strings and calendar days stay `YYYY-MM-DD` strings, deliberately
 * preserving the canonical API contract instead of mapping to `Date`.
 */

/** Parameters for `NuanzeClient.listMarkets`. */
export interface NuanzeListMarketsParams {
  /** Restrict to one venue. Omit for both. */
  venue?: NuanzeMarketVenue;
  /** Restrict to one tradability state. Omit for all states. */
  tradingStatus?: NuanzeMarketTradingStatus;
  /** Exact canonical ticker, matched case-insensitively. */
  ticker?: string;
}

/** Latest ticker snapshot for a market. */
export interface NuanzeLatestTicker {
  /** Mid price, or null when no quote is available. */
  midPrice: NuanzeDecimal | null;
  /** Best bid, or null when no quote is available. */
  bidPrice: NuanzeDecimal | null;
  /** Best ask, or null when no quote is available. */
  askPrice: NuanzeDecimal | null;
  /** Rolling 24-hour traded volume, or null when unknown. */
  volume24h: NuanzeDecimal | null;
  /** Open interest, or null when unknown. */
  openInterest: NuanzeDecimal | null;
  /** Rolling 24-hour price change in percent, or null when unknown. */
  priceChange24hPct: NuanzeDecimal | null;
  /** When the snapshot was taken, as a UTC ISO 8601 string. */
  updatedAt: string;
}

/** A market listed on Nuanze. */
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
  priceIncrement: NuanzeDecimal;
  /** Minimum size step. */
  sizeIncrement: NuanzeDecimal;
  /** Minimum order size. */
  minSize: NuanzeDecimal;
  /** Latest ticker, or null when no price snapshot exists yet. */
  latest: NuanzeLatestTicker | null;
  /** When market metadata was last synced, as a UTC ISO 8601 string. */
  updatedAt: string;
}

/** Response of `NuanzeClient.listMarkets`. */
export interface NuanzeMarketListResponse {
  /**
   * Complete matching universe, ordered by `productId` ascending. Metadata
   * refreshes about every five minutes and prices about every minute.
   */
  markets: NuanzeMarket[];
  /** Length of `markets`; the API never truncates the list. */
  count: number;
  /** When the response was generated, as a UTC ISO 8601 string. */
  asOf: string;
}
