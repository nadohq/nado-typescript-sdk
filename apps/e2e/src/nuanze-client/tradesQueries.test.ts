import {
  NUANZE_MARKET_VENUES,
  NUANZE_TRADE_SIDES,
  NuanzeMarketTrade,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertEnumMember,
  assertNonEmptyString,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: trades',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;
    let ticker: string;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
      const [first] = (await tc.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(first, 'expected at least one perp market');
      ticker = first.ticker;
    });

    void test('lists one page of taker-side market trades', async () => {
      const response = await tc.nuanze.getMarketTrades({
        ticker,
        venue: 'perp',
        limit: 20,
      });
      debugPrint('Market trades', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(response.ticker, ticker);
      assert.equal(response.venue, 'perp');
      assertArrayElements(response.trades, assertMarketTradeShape, 'trades');

      for (let i = 1; i < response.trades.length; i++) {
        const prev = response.trades[i - 1];
        const cur = response.trades[i];
        assert.ok(
          prev.matchedAt > cur.matchedAt ||
            (prev.matchedAt === cur.matchedAt && prev.id > cur.id),
          'trades should be ordered by matchedAt then id descending',
        );
      }
    });

    void test('rejects an unknown ticker with MARKET_NOT_FOUND', async () => {
      try {
        await tc.nuanze.getMarketTrades({ ticker: 'NOTAREALTICKERXYZ' });
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

function assertMarketTradeShape(trade: NuanzeMarketTrade, label: string): void {
  assertNumber(trade.id, `${label}.id`);
  assertNumber(trade.productId, `${label}.productId`);
  assertNonEmptyString(trade.symbol, `${label}.symbol`);
  assertNonEmptyString(trade.ticker, `${label}.ticker`);
  assertEnumMember(trade.venue, NUANZE_MARKET_VENUES, `${label}.venue`);
  assertEnumMember(trade.side, NUANZE_TRADE_SIDES, `${label}.side`);
  assertBigNumberFinite(trade.price, `${label}.price`);
  assertBigNumberFinite(trade.amount, `${label}.amount`);
  assertBigNumberFinite(trade.notional, `${label}.notional`);
  assert.match(trade.matchedAt, ISO_UTC, `${label}.matchedAt`);
}
