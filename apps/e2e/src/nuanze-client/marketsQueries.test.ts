import {
  NUANZE_MARKET_TRADING_STATUSES,
  NUANZE_MARKET_VENUES,
  NuanzeMarket,
  NuanzeMarketVenue,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
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

void describe(
  '[nuanze-client]: markets',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(() => {
      tc = createTestContext();
    });

    void test('fetches the full market universe', async () => {
      const response = await tc.nuanze.getMarkets();
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
      const response = await tc.nuanze.getMarkets({ venue: 'perp' });
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
      const [first] = (await tc.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(first, 'expected at least one perp market to filter on');

      const response = await tc.nuanze.getMarkets({
        ticker: first.ticker.toLowerCase(),
      });
      debugPrint('Ticker-filtered markets', response);

      assert.ok(
        response.markets.some((market) => market.ticker === first.ticker),
        `markets should include ${first.ticker} when queried in lower case`,
      );
    });

    void test('rejects an unknown venue with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getMarkets({
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
      const [first] = (await tc.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(first, 'expected at least one perp market to resolve');

      const response = await tc.nuanze.getMarketByTicker({
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

    void test('resolves the same market by ticker or productId', async () => {
      const [market] = (await tc.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(market, 'expected at least one perp market to resolve');

      const byTicker = await tc.nuanze.getMarketByTicker({
        ticker: market.ticker,
        venue: 'perp',
      });
      const byProductId = await tc.nuanze.getMarketByTicker({
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
      const [market] = (await tc.nuanze.getMarkets()).markets;
      assert.ok(market, 'expected at least one market to resolve');
      const createSelector = (): { ticker: string; productId?: number } => ({
        ticker: market.ticker,
      });
      const selector: { ticker: string; productId?: number } = createSelector();

      const response = await tc.nuanze.getMarketByTicker(selector);

      assert.equal(response.ticker, market.ticker);
      assertMarketShape(response, 'market');
    });

    void test('accepts an existing productId selector parameter shape', async () => {
      const [market] = (await tc.nuanze.getMarkets()).markets;
      assert.ok(market, 'expected at least one market to resolve');
      const createSelector = (): { productId: number; ticker?: string } => ({
        productId: market.productId,
      });
      const selector: { productId: number; ticker?: string } = createSelector();

      const response = await tc.nuanze.getMarketByTicker(selector);

      assertSameMarketIdentity(response, market, 'market');
      assertMarketShape(response, 'market');
    });

    void test('prefers productId when ticker and productId disagree', async () => {
      const markets = (await tc.nuanze.getMarkets({ venue: 'perp' })).markets;
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

      const byProductId = await tc.nuanze.getMarketByTicker({
        productId: productIdMarket.productId,
        venue: 'perp',
      });
      const byPrecedence = await tc.nuanze.getMarketByTicker({
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
        await tc.nuanze.getMarketByTicker({ ticker: 'NOTAREALTICKERXYZ' });
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
