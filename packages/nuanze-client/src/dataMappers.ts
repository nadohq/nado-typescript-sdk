import { toBigNumber } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { NuanzeLatestTicker, NuanzeMarket } from './types/clientModelTypes';
import { GetNuanzeMarketsResponse } from './types/clientTypes';
import {
  NuanzeServerLatestTicker,
  NuanzeServerMarket,
} from './types/serverModelTypes';
import { NuanzeServerMarketsResponse } from './types/serverQueryTypes';

function mapNuanzeDecimal(value: string | null): BigNumber | null {
  return value === null ? null : toBigNumber(value);
}

/**
 * Maps a server-side latest ticker to its client-side representation, converting decimal strings to
 * `BigNumber`.
 */
export function mapNuanzeLatestTicker(
  server: NuanzeServerLatestTicker,
): NuanzeLatestTicker {
  return {
    midPrice: mapNuanzeDecimal(server.midPrice),
    bidPrice: mapNuanzeDecimal(server.bidPrice),
    askPrice: mapNuanzeDecimal(server.askPrice),
    volume24h: mapNuanzeDecimal(server.volume24h),
    openInterest: mapNuanzeDecimal(server.openInterest),
    priceChange24hPct: mapNuanzeDecimal(server.priceChange24hPct),
    updatedAt: server.updatedAt,
  };
}

/**
 * Maps a server-side market to its client-side representation. Only the decimal fields change: IDs,
 * enums, and timestamps keep their wire types.
 */
export function mapNuanzeMarket(server: NuanzeServerMarket): NuanzeMarket {
  return {
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    tradingStatus: server.tradingStatus,
    priceIncrement: toBigNumber(server.priceIncrement),
    sizeIncrement: toBigNumber(server.sizeIncrement),
    minSize: toBigNumber(server.minSize),
    latest:
      server.latest === null ? null : mapNuanzeLatestTicker(server.latest),
    updatedAt: server.updatedAt,
  };
}

/**
 * Maps a server-side `GET /markets` response to its client-side representation.
 */
export function mapNuanzeMarketsResponse(
  server: NuanzeServerMarketsResponse,
): GetNuanzeMarketsResponse {
  return {
    markets: server.markets.map(mapNuanzeMarket),
    count: server.count,
    asOf: server.asOf,
  };
}
