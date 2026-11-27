import {
  NUANZE_MARKET_TRADING_STATUSES,
  NUANZE_MARKET_VALUE_KINDS,
  NUANZE_MARKET_VENUES,
  NuanzeMarket,
  NuanzeMarketSortBy,
  NuanzeMarketSortDirection,
  NuanzeMarketVenue,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertBigNumberPositive,
  assertEnumMember,
  assertNonEmptyString,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** `getMarkets` sort keys read from each market's `latest` ticker block. */
const LATEST_TICKER_SORT_KEYS = [
  'volume24h',
  'openInterest',
  'priceChange24hPct',
] as const satisfies readonly NuanzeMarketSortBy[];

void describe(
  '[nuanze-client]: markets',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let ctx: RunContext;

    before(() => {
      ctx = createTestContext();
    });

    void test('fetches the full market universe', async () => {
      const response = await ctx.nuanze.getMarkets();
      debugPrint('Markets', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.ok(response.markets.length > 0, 'markets should not be empty');
      // The endpoint never truncates, so a mismatch means the universe was cut short.
      assert.equal(
        response.count,
        response.markets.length,
        'count should equal the number of markets returned',
      );
      assertArrayElements(response.markets, assertMarketShape, 'markets');

      const productIds = response.markets.map((market) => market.productId);
      assert.deepEqual(
        productIds,
        [...productIds].sort((a, b) => a - b),
        'markets should be ordered by productId ascending',
      );
    });

    void test('filters by venue', async () => {
      const response = await ctx.nuanze.getMarkets({ venue: 'perp' });
      debugPrint('Perp markets', response);

      assert.ok(
        response.markets.length > 0,
        'perp markets should not be empty',
      );
      for (const market of response.markets) {
        assert.equal(market.venue, 'perp', `${market.ticker} should be a perp`);
        // Perps use even product IDs.
        assert.equal(market.productId % 2, 0, `${market.ticker} productId`);
      }
    });

    void test('matches a ticker case-insensitively', async () => {
      const [first] = (await ctx.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(first, 'expected at least one perp market to filter on');

      const response = await ctx.nuanze.getMarkets({
        ticker: first.ticker.toLowerCase(),
      });
      debugPrint('Ticker-filtered markets', response);

      assert.ok(
        response.markets.some((market) => market.ticker === first.ticker),
        `markets should include ${first.ticker} when queried in lower case`,
      );
    });

    void test('reports a null or valid marketValue on every market', async () => {
      const response = await ctx.nuanze.getMarkets();
      debugPrint(
        'Market values',
        response.markets.map(({ productId, ticker, marketValue }) => ({
          productId,
          ticker,
          marketValue,
        })),
      );

      // `assertMarketShape` checks each marketValue is null or has a valid kind, positive usd,
      // and a UTC asOf.
      assertArrayElements(response.markets, assertMarketShape, 'markets');
      assert.ok(
        response.markets.some((market) => market.marketValue !== null),
        'at least one market should carry a marketValue',
      );
    });

    void test('sorts markets by marketValue descending with nulls last by default', async () => {
      const response = await ctx.nuanze.getMarkets({ sortBy: 'marketValue' });
      debugPrint('Markets by marketValue', response);

      assert.equal(response.count, response.markets.length);
      assertArrayElements(response.markets, assertMarketShape, 'markets');
      assert.ok(
        response.markets.some((market) => market.marketValue !== null),
        'at least one market should carry a marketValue to order by',
      );
      assertMarketsSorted(response.markets, 'marketValue', 'desc', 'markets');
    });

    void test('sorts markets by marketValue ascending with nulls still last', async () => {
      const response = await ctx.nuanze.getMarkets({
        sortBy: 'marketValue',
        sortDirection: 'asc',
      });
      debugPrint('Markets by marketValue ascending', response);

      assert.ok(
        response.markets.some((market) => market.marketValue !== null),
        'at least one market should carry a marketValue to order by',
      );
      assertMarketsSorted(response.markets, 'marketValue', 'asc', 'markets');
    });

    void test('sorts markets by latest ticker fields descending with nulls last by default', async () => {
      for (const sortBy of LATEST_TICKER_SORT_KEYS) {
        const response = await ctx.nuanze.getMarkets({ sortBy });
        debugPrint(`Markets by ${sortBy}`, response);

        assert.ok(
          response.markets.some(
            (market) => marketSortValue(market, sortBy) !== null,
          ),
          `at least one market should carry latest.${sortBy} to order by`,
        );
        assertMarketsSorted(response.markets, sortBy, 'desc', sortBy);
      }
    });

    void test('rejects an unknown venue with BAD_REQUEST', async () => {
      try {
        await ctx.nuanze.getMarkets({
          // Only reachable from untyped callers, but the API is the contract we care about here.
          venue: 'options' as NuanzeMarketVenue,
        });
        assert.fail('expected BAD_REQUEST for an unknown venue');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'BAD_REQUEST');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });

    void test('resolves a market by ticker', async () => {
      const [first] = (await ctx.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(first, 'expected at least one perp market to resolve');

      const response = await ctx.nuanze.getMarketByTicker({
        ticker: first.ticker.toLowerCase(),
        venue: 'perp',
      });
      debugPrint('Market by ticker', response);

      assert.equal(response.ticker, first.ticker);
      assert.equal(response.venue, 'perp');
      assertMarketShape(response, 'market');
      assert.ok(
        response.availableVenues.includes('perp'),
        'availableVenues should include perp',
      );
      assert.match(
        response.componentUpdatedAt.market,
        ISO_UTC,
        'componentUpdatedAt.market',
      );
    });

    void test('carries the list marketValue on a resolved market', async () => {
      const valued = (await ctx.nuanze.getMarkets()).markets.find(
        (market) => market.marketValue !== null,
      );
      assert.ok(
        valued?.marketValue,
        'expected at least one market with a marketValue to resolve',
      );

      const response = await ctx.nuanze.getMarketByTicker({
        productId: valued.productId,
      });
      debugPrint('Market by productId with marketValue', response);

      assertMarketShape(response, 'market');
      assert.ok(
        response.marketValue,
        `${valued.ticker} detail should carry its marketValue`,
      );
      // Only the kind is compared: usd and asOf may refresh between the two requests.
      assert.equal(response.marketValue.kind, valued.marketValue.kind);
    });

    void test('resolves the same market by ticker or productId', async () => {
      const [market] = (await ctx.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(market, 'expected at least one perp market to resolve');

      const byTicker = await ctx.nuanze.getMarketByTicker({
        ticker: market.ticker,
        venue: 'perp',
      });
      const byProductId = await ctx.nuanze.getMarketByTicker({
        productId: market.productId,
        venue: 'perp',
      });
      debugPrint('Market by ticker selector', byTicker);
      debugPrint('Market by productId selector', byProductId);

      assertSameMarketIdentity(byTicker, market, 'byTicker');
      assertSameMarketIdentity(byProductId, market, 'byProductId');
      assertSameMarketIdentity(byTicker, byProductId, 'selectors');
      assertMarketShape(byTicker, 'byTicker');
      assertMarketShape(byProductId, 'byProductId');
    });

    void test('accepts an existing ticker selector parameter shape', async () => {
      const [market] = (await ctx.nuanze.getMarkets()).markets;
      assert.ok(market, 'expected at least one market to resolve');
      const createSelector = (): { ticker: string; productId?: number } => ({
        ticker: market.ticker,
      });
      const selector: { ticker: string; productId?: number } = createSelector();

      const response = await ctx.nuanze.getMarketByTicker(selector);

      assert.equal(response.ticker, market.ticker);
      assertMarketShape(response, 'market');
    });

    void test('accepts an existing productId selector parameter shape', async () => {
      const [market] = (await ctx.nuanze.getMarkets()).markets;
      assert.ok(market, 'expected at least one market to resolve');
      const createSelector = (): { productId: number; ticker?: string } => ({
        productId: market.productId,
      });
      const selector: { productId: number; ticker?: string } = createSelector();

      const response = await ctx.nuanze.getMarketByTicker(selector);

      assertSameMarketIdentity(response, market, 'market');
      assertMarketShape(response, 'market');
    });

    void test('prefers productId when ticker and productId disagree', async () => {
      const markets = (await ctx.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(
        markets.length >= 2,
        'expected at least two perp markets for precedence',
      );
      const [tickerMarket, productIdMarket] = markets;
      assert.notEqual(
        tickerMarket.productId,
        productIdMarket.productId,
        'precedence test needs distinct productIds',
      );

      const byProductId = await ctx.nuanze.getMarketByTicker({
        productId: productIdMarket.productId,
        venue: 'perp',
      });
      const byPrecedence = await ctx.nuanze.getMarketByTicker({
        ticker: tickerMarket.ticker,
        productId: productIdMarket.productId,
        venue: 'perp',
      });
      debugPrint('Market by conflicting selectors', byPrecedence);

      assertSameMarketIdentity(byPrecedence, byProductId, 'precedence');
      assertSameMarketIdentity(
        byPrecedence,
        productIdMarket,
        'productIdMarket',
      );
      assert.notEqual(
        byPrecedence.productId,
        tickerMarket.productId,
        'productId should override the ticker selector',
      );
    });

    void test('rejects an unknown ticker with MARKET_NOT_FOUND', async () => {
      try {
        await ctx.nuanze.getMarketByTicker({ ticker: 'NOTAREALTICKERXYZ' });
        assert.fail('expected MARKET_NOT_FOUND for an unknown ticker');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'MARKET_NOT_FOUND');
        assert.equal(error.httpStatus, 404);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });
  },
);

/**
 * Asserts the invariants a market holds regardless of market conditions. Prices move constantly, so
 * only shapes, types, and relations are checked, never exact values.
 */
function assertSameMarketIdentity(
  actual: Pick<NuanzeMarket, 'productId' | 'ticker' | 'venue'>,
  expected: Pick<NuanzeMarket, 'productId' | 'ticker' | 'venue'>,
  label: string,
): void {
  assert.equal(actual.productId, expected.productId, `${label}.productId`);
  assert.equal(actual.ticker, expected.ticker, `${label}.ticker`);
  assert.equal(actual.venue, expected.venue, `${label}.venue`);
}

function assertMarketShape(market: NuanzeMarket, label: string): void {
  assertNumber(market.productId, `${label}.productId`);
  assertNonEmptyString(market.symbol, `${label}.symbol`);
  assertNonEmptyString(market.ticker, `${label}.ticker`);
  assertEnumMember(market.venue, NUANZE_MARKET_VENUES, `${label}.venue`);
  assertEnumMember(
    market.tradingStatus,
    NUANZE_MARKET_TRADING_STATUSES,
    `${label}.tradingStatus`,
  );
  assertBigNumberPositive(market.priceIncrement, `${label}.priceIncrement`);
  assertBigNumberPositive(market.sizeIncrement, `${label}.sizeIncrement`);
  assertBigNumberPositive(market.minSize, `${label}.minSize`);
  if (market.marketValue !== null) {
    assertEnumMember(
      market.marketValue.kind,
      NUANZE_MARKET_VALUE_KINDS,
      `${label}.marketValue.kind`,
    );
    assertBigNumberPositive(market.marketValue.usd, `${label}.marketValue.usd`);
    assert.match(market.marketValue.asOf, ISO_UTC, `${label}.marketValue.asOf`);
  }
  if (market.skew !== null) {
    assertBigNumberFinite(market.skew, `${label}.skew`);
  }
  if (market.skewUpdatedAt !== null) {
    assert.match(market.skewUpdatedAt, ISO_UTC, `${label}.skewUpdatedAt`);
  }
  assert.match(market.updatedAt, ISO_UTC, `${label}.updatedAt`);

  if (market.latest === null) {
    return;
  }

  assert.match(market.latest.updatedAt, ISO_UTC, `${label}.latest.updatedAt`);
  // Every ticker field is nullable, so each is only checked when populated.
  for (const [field, value] of Object.entries(market.latest)) {
    if (field === 'updatedAt' || value === null) {
      continue;
    }
    assertBigNumberFinite(value, `${label}.latest.${field}`);
  }
}

/**
 * Reads the value `getMarkets` orders by for a non-`productId` key: `marketValue.usd`, or the
 * same-named `latest` field. A null `marketValue` or `latest` counts as a null key.
 */
function marketSortValue(
  market: NuanzeMarket,
  sortBy: Exclude<NuanzeMarketSortBy, 'productId'>,
): BigNumber | null {
  if (sortBy === 'marketValue') {
    return market.marketValue?.usd ?? null;
  }
  return market.latest?.[sortBy] ?? null;
}

/**
 * Asserts the `getMarkets` sort contract: markets with a key come first in `direction` order,
 * every market with a null key comes after them whatever the direction, and equal keys (nulls
 * included) break on `productId` ascending.
 */
function assertMarketsSorted(
  markets: NuanzeMarket[],
  sortBy: Exclude<NuanzeMarketSortBy, 'productId'>,
  direction: NuanzeMarketSortDirection,
  label: string,
): void {
  for (let i = 1; i < markets.length; i++) {
    const previous = markets[i - 1];
    const current = markets[i];
    const previousValue = marketSortValue(previous, sortBy);
    const currentValue = marketSortValue(current, sortBy);
    const pair = `${label}[${i - 1}] ${previous.ticker} -> ${label}[${i}] ${current.ticker}`;

    assert.ok(
      !(previousValue === null && currentValue !== null),
      `${pair}: markets with a null ${sortBy} should come last`,
    );
    if (previousValue !== null && currentValue !== null) {
      if (!previousValue.eq(currentValue)) {
        assert.ok(
          direction === 'desc'
            ? previousValue.gt(currentValue)
            : previousValue.lt(currentValue),
          `${pair}: ${sortBy} should be ${direction === 'desc' ? 'non-increasing' : 'non-decreasing'}`,
        );
        continue;
      }
    } else if (previousValue !== currentValue) {
      continue;
    }
    assert.ok(
      previous.productId < current.productId,
      `${pair}: equal ${sortBy} should break ties on productId ascending`,
    );
  }
}
