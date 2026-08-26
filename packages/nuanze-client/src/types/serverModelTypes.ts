import {
  NuanzeMarketTradingStatus,
  NuanzeMarketVenue,
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
export interface NuanzeServerMarket {
  productId: number;
  symbol: string;
  ticker: string;
  venue: NuanzeMarketVenue;
  tradingStatus: NuanzeMarketTradingStatus;
  priceIncrement: string;
  sizeIncrement: string;
  minSize: string;
  latest: NuanzeServerLatestTicker | null;
  updatedAt: string;
}
