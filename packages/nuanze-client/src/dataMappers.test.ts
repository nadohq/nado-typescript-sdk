import { describe, expect, it } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { mapNuanzeMarketListResponse } from './dataMappers';
import { NuanzeSchemaViolationError } from './schema';

/** A market exactly as `GET /markets` serializes one. */
const MARKET = {
  productId: 4,
  symbol: 'ETH-PERP',
  ticker: 'ETH',
  venue: 'perp',
  tradingStatus: 'live',
  priceIncrement: '0.1',
  sizeIncrement: '0.001',
  minSize: '100',
  latest: {
    midPrice: '1918.65',
    bidPrice: '1918.1',
    askPrice: '1919.2',
    volume24h: '27613524.82493527',
    openInterest: '11606376.0141',
    priceChange24hPct: '1.1021542225080914',
    updatedAt: '2026-08-19T10:43:33.447Z',
  },
  updatedAt: '2026-08-19T10:42:10.145Z',
};

/**
 * Wraps markets in a response body whose `count` agrees with the list.
 *
 * @param markets - Markets to include, possibly deliberately malformed.
 */
function body(markets: unknown[] = [MARKET]): Record<string, unknown> {
  return { markets, count: markets.length, asOf: '2026-08-19T10:44:18.947Z' };
}

/** Maps a market with one field replaced, returning the thrown violation. */
function violationFor(
  overrides: Record<string, unknown>,
): NuanzeSchemaViolationError {
  try {
    mapNuanzeMarketListResponse(body([{ ...MARKET, ...overrides }]));
  } catch (error) {
    return error as NuanzeSchemaViolationError;
  }
  throw new Error('expected the body to be rejected');
}

describe('mapNuanzeMarketListResponse', () => {
  it('converts documented decimal fields to decimals', () => {
    const { markets } = mapNuanzeMarketListResponse(body());
    const [market] = markets;

    expect(market.priceIncrement).toBeInstanceOf(BigNumber);
    expect(market.sizeIncrement).toBeInstanceOf(BigNumber);
    expect(market.minSize).toBeInstanceOf(BigNumber);
    expect(market.priceIncrement.toString()).toBe('0.1');
    expect(market.minSize.toString()).toBe('100');
  });

  it('preserves precision a float would round away', () => {
    const { markets } = mapNuanzeMarketListResponse(body());

    expect(markets[0].latest?.volume24h?.toString()).toBe('27613524.82493527');
    expect(markets[0].latest?.priceChange24hPct?.toString()).toBe(
      '1.1021542225080914',
    );
  });

  it('leaves timestamps as ISO strings rather than Date objects', () => {
    const response = mapNuanzeMarketListResponse(body());

    expect(response.asOf).toBe('2026-08-19T10:44:18.947Z');
    expect(response.markets[0].updatedAt).toBe('2026-08-19T10:42:10.145Z');
    expect(response.markets[0].latest?.updatedAt).toBe(
      '2026-08-19T10:43:33.447Z',
    );
    expect(response.asOf).not.toBeInstanceOf(Date);
  });

  it('leaves IDs, counts, enums, and symbols on their wire types', () => {
    const response = mapNuanzeMarketListResponse(body());
    const [market] = response.markets;

    expect(market.productId).toBe(4);
    expect(response.count).toBe(1);
    expect(market.venue).toBe('perp');
    expect(market.tradingStatus).toBe('live');
    expect(market.symbol).toBe('ETH-PERP');
    expect(market.ticker).toBe('ETH');
  });

  it('maps an absent price snapshot to null', () => {
    const { markets } = mapNuanzeMarketListResponse(
      body([{ ...MARKET, latest: null }]),
    );

    expect(markets[0].latest).toBeNull();
  });

  it('maps a nullable decimal reported as null to null', () => {
    const { markets } = mapNuanzeMarketListResponse(
      body([{ ...MARKET, latest: { ...MARKET.latest, openInterest: null } }]),
    );

    expect(markets[0].latest?.openInterest).toBeNull();
    expect(markets[0].latest?.midPrice).toBeInstanceOf(BigNumber);
  });

  it('accepts an empty universe', () => {
    const response = mapNuanzeMarketListResponse(body([]));

    expect(response.markets).toEqual([]);
    expect(response.count).toBe(0);
  });

  it('maps every market in order, pointing at the offending index on failure', () => {
    const response = mapNuanzeMarketListResponse(
      body([MARKET, { ...MARKET, productId: 6, ticker: 'SOL' }]),
    );
    expect(response.markets.map((market) => market.ticker)).toEqual([
      'ETH',
      'SOL',
    ]);

    try {
      mapNuanzeMarketListResponse(
        body([MARKET, { ...MARKET, minSize: '1,5' }]),
      );
      throw new Error('expected the body to be rejected');
    } catch (error) {
      expect((error as NuanzeSchemaViolationError).pointer).toBe(
        'body.markets[1].minSize',
      );
    }
  });

  describe('contract violations', () => {
    it('rejects a decimal that is not a finite base-10 string', () => {
      expect(violationFor({ minSize: '1,5' }).pointer).toBe(
        'body.markets[0].minSize',
      );
      expect(violationFor({ priceIncrement: 0.1 }).pointer).toBe(
        'body.markets[0].priceIncrement',
      );
      expect(violationFor({ sizeIncrement: null }).pointer).toBe(
        'body.markets[0].sizeIncrement',
      );
    });

    it('rejects a timestamp without the required UTC suffix', () => {
      expect(violationFor({ updatedAt: '2026-08-19 10:42:10' }).pointer).toBe(
        'body.markets[0].updatedAt',
      );
    });

    it('rejects an enum member outside the contract', () => {
      expect(violationFor({ venue: 'options' }).pointer).toBe(
        'body.markets[0].venue',
      );
      expect(violationFor({ tradingStatus: 'paused' }).pointer).toBe(
        'body.markets[0].tradingStatus',
      );
    });

    it('rejects a missing required field rather than yielding undefined', () => {
      const withoutMinSize: Record<string, unknown> = { ...MARKET };
      delete withoutMinSize.minSize;

      expect(() => mapNuanzeMarketListResponse(body([withoutMinSize]))).toThrow(
        NuanzeSchemaViolationError,
      );
    });

    it('rejects a missing nullable field, which is not an explicit null', () => {
      const withoutLatest: Record<string, unknown> = { ...MARKET };
      delete withoutLatest.latest;

      expect(() => mapNuanzeMarketListResponse(body([withoutLatest]))).toThrow(
        /latest.*received undefined/,
      );
    });

    it('rejects a count that disagrees with the list length', () => {
      // A mismatch would mean the universe was truncated, which the contract
      // promises never happens, so it must not be silently accepted.
      expect(() =>
        mapNuanzeMarketListResponse({ ...body([MARKET]), count: 7 }),
      ).toThrow(/body\.count/);
      expect(() =>
        mapNuanzeMarketListResponse({ ...body([MARKET]), count: 7 }),
      ).toThrow(/expected the market list length 1, received 7/);
    });

    it('rejects a body that is not the documented envelope', () => {
      for (const malformed of ['<html>', null, [], 42]) {
        expect(() => mapNuanzeMarketListResponse(malformed)).toThrow(
          NuanzeSchemaViolationError,
        );
      }
      expect(() => mapNuanzeMarketListResponse({ count: 0 })).toThrow(
        /body\.markets/,
      );
      expect(() =>
        mapNuanzeMarketListResponse({ markets: [], count: 0 }),
      ).toThrow(/body\.asOf/);
    });

    it('rejects a market entry that is not an object', () => {
      expect(() => mapNuanzeMarketListResponse(body(['ETH']))).toThrow(
        /body\.markets\[0\]/,
      );
    });
  });
});
