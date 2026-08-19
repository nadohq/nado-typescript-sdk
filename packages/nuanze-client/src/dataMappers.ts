import { toBigNumber } from '@nadohq/shared';
import {
  arrayAt,
  decimalStringAt,
  enumAt,
  integerAt,
  isoTimestampAt,
  NuanzeSchemaViolationError,
  nullableAt,
  objectAt,
  stringAt,
} from './schema';
import type {
  NuanzeLatestTicker,
  NuanzeMarket,
  NuanzeMarketListResponse,
} from './types';
import { NUANZE_MARKET_TRADING_STATUSES, NUANZE_MARKET_VENUES } from './types';
import type { NuanzeDecimal } from './types/decimal';

/**
 * Convert a documented decimal field to {@link NuanzeDecimal}.
 *
 * Mapping is always field-specific: there is no recursive "convert every
 * numeric-looking string" pass, so IDs, counts, ranks, enums, addresses,
 * cursors, timestamps, and calendar days keep their wire types.
 *
 * @param value - Raw field value from the response body.
 * @param pointer - Path to the field, used in violation messages.
 * @returns The value as an exact decimal.
 * @throws {NuanzeSchemaViolationError} If the value is not a finite base-10 decimal string.
 */
export function nuanzeDecimalAt(
  value: unknown,
  pointer: string,
): NuanzeDecimal {
  return toBigNumber(decimalStringAt(value, pointer));
}

/**
 * Convert a documented nullable decimal field to {@link NuanzeDecimal}.
 *
 * @param value - Raw field value from the response body.
 * @param pointer - Path to the field, used in violation messages.
 * @returns The value as an exact decimal, or null when the API reported null.
 * @throws {NuanzeSchemaViolationError} If the value is neither null nor a finite base-10 decimal string.
 */
export function nullableNuanzeDecimalAt(
  value: unknown,
  pointer: string,
): NuanzeDecimal | null {
  return nullableAt(value, pointer, nuanzeDecimalAt);
}

function mapLatestTicker(value: unknown, pointer: string): NuanzeLatestTicker {
  const latest = objectAt(value, pointer);
  return {
    midPrice: nullableNuanzeDecimalAt(latest.midPrice, `${pointer}.midPrice`),
    bidPrice: nullableNuanzeDecimalAt(latest.bidPrice, `${pointer}.bidPrice`),
    askPrice: nullableNuanzeDecimalAt(latest.askPrice, `${pointer}.askPrice`),
    volume24h: nullableNuanzeDecimalAt(
      latest.volume24h,
      `${pointer}.volume24h`,
    ),
    openInterest: nullableNuanzeDecimalAt(
      latest.openInterest,
      `${pointer}.openInterest`,
    ),
    priceChange24hPct: nullableNuanzeDecimalAt(
      latest.priceChange24hPct,
      `${pointer}.priceChange24hPct`,
    ),
    updatedAt: isoTimestampAt(latest.updatedAt, `${pointer}.updatedAt`),
  };
}

function mapMarket(value: unknown, pointer: string): NuanzeMarket {
  const market = objectAt(value, pointer);
  return {
    productId: integerAt(market.productId, `${pointer}.productId`),
    symbol: stringAt(market.symbol, `${pointer}.symbol`),
    ticker: stringAt(market.ticker, `${pointer}.ticker`),
    venue: enumAt(market.venue, NUANZE_MARKET_VENUES, `${pointer}.venue`),
    tradingStatus: enumAt(
      market.tradingStatus,
      NUANZE_MARKET_TRADING_STATUSES,
      `${pointer}.tradingStatus`,
    ),
    priceIncrement: nuanzeDecimalAt(
      market.priceIncrement,
      `${pointer}.priceIncrement`,
    ),
    sizeIncrement: nuanzeDecimalAt(
      market.sizeIncrement,
      `${pointer}.sizeIncrement`,
    ),
    minSize: nuanzeDecimalAt(market.minSize, `${pointer}.minSize`),
    latest: nullableAt(market.latest, `${pointer}.latest`, mapLatestTicker),
    updatedAt: isoTimestampAt(market.updatedAt, `${pointer}.updatedAt`),
  };
}

/**
 * Validate and map a `GET /markets` body.
 *
 * @param body - Decoded JSON body from the response.
 * @returns The mapped market list.
 * @throws {NuanzeSchemaViolationError} If the body departs from the published
 * contract, including a `count` that disagrees with the list length, which would
 * mean the universe was truncated.
 */
export function mapNuanzeMarketListResponse(
  body: unknown,
): NuanzeMarketListResponse {
  const root = objectAt(body, 'body');

  const markets = arrayAt(root.markets, 'body.markets').map((market, index) =>
    mapMarket(market, `body.markets[${index}]`),
  );

  const count = integerAt(root.count, 'body.count');
  if (count !== markets.length) {
    throw new NuanzeSchemaViolationError(
      'body.count',
      `expected the market list length ${String(markets.length)}, received ${String(count)}`,
    );
  }

  return {
    markets,
    count,
    asOf: isoTimestampAt(root.asOf, 'body.asOf'),
  };
}
