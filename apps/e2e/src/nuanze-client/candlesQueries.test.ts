import {
  NUANZE_CANDLE_INTERVALS,
  NuanzeCandleInterval,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertBigNumberFinite,
  assertBoolean,
  assertEnumMember,
  assertNonEmptyString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: candles',
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

    void test('returns candles oldest to newest', async () => {
      const response = await tc.nuanze.getMarketCandles({
        ticker,
        venue: 'perp',
        interval: '1h',
        limit: 24,
      });
      debugPrint('Market candles', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(response.ticker, ticker);
      assertEnumMember(response.interval, NUANZE_CANDLE_INTERVALS, 'interval');
      assert.ok(response.candles.length > 0, 'candles should not be empty');
      assert.ok(response.candles.length <= 24, 'candles should respect limit');

      const openTimes = response.candles.map((candle) => candle.openTime);
      assert.deepEqual(
        openTimes,
        [...openTimes].sort(),
        'candles should be ordered oldest-to-newest',
      );

      for (const [i, candle] of response.candles.entries()) {
        const label = `candles[${i}]`;
        assert.match(candle.openTime, ISO_UTC, `${label}.openTime`);
        assertBigNumberFinite(candle.open, `${label}.open`);
        assertBigNumberFinite(candle.high, `${label}.high`);
        assertBigNumberFinite(candle.low, `${label}.low`);
        assertBigNumberFinite(candle.close, `${label}.close`);
        assertBigNumberFinite(candle.volume, `${label}.volume`);
        assertBoolean(candle.complete, `${label}.complete`);
      }

      const last = response.candles[response.candles.length - 1];
      if (last && !last.complete) {
        assert.equal(last.complete, false, 'current bucket is incomplete');
      }
    });

    void test('rejects an unknown interval with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getMarketCandles({
          ticker,
          interval: '1m' as NuanzeCandleInterval,
        });
        assert.fail('expected BAD_REQUEST for an unknown interval');
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
  },
);
