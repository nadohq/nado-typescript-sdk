import type { NuanzeMarketTradingStatus, NuanzeMarketVenue } from './enums';

/**
 * Wire types mirroring the Nuanze API's JSON exactly.
 *
 * Decimals are finite base-10 strings, timestamps are UTC ISO 8601 strings,
 * addresses are lowercase, and cursors are opaque. Nothing here is converted:
 * `dataMappers.ts` produces the client-facing shapes.
 */

/** Latest ticker snapshot as returned on the wire. */
export interface NuanzeServerLatestTicker {
  /** Mid price, or null when no quote is available. */
  midPrice: string | null;
  /** Best bid, or null when no quote is available. */
  bidPrice: string | null;
  /** Best ask, or null when no quote is available. */
  askPrice: string | null;
  /** Rolling 24-hour traded volume, or null when unknown. */
  volume24h: string | null;
  /** Open interest, or null when unknown. */
  openInterest: string | null;
  /** Rolling 24-hour price change in percent, or null when unknown. */
  priceChange24hPct: string | null;
  /** When the snapshot was taken. */
  updatedAt: string;
}

/** Market entry as returned on the wire. */
export interface NuanzeServerMarket {
  /** Public product ID. */
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
  priceIncrement: string;
  /** Minimum size step. */
  sizeIncrement: string;
  /** Minimum order size. */
  minSize: string;
  /** Latest ticker, or null when no price snapshot exists yet. */
  latest: NuanzeServerLatestTicker | null;
  /** When the market metadata was last synced. */
  updatedAt: string;
}

/** `GET /markets` response as returned on the wire. */
export interface NuanzeServerMarketListResponse {
  /** Complete matching universe, ordered by `productId` ascending. */
  markets: NuanzeServerMarket[];
  /** Length of `markets`; the API never truncates the list. */
  count: number;
  /** When the response was generated. */
  asOf: string;
}
