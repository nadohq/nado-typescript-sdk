import {
  MOBILE_ERROR_CODES,
  MOBILE_FEED_MARGIN_MODES,
  MOBILE_FEED_MAX_PAGE_SIZE,
  MOBILE_FEED_MIN_NOTIONAL_FLOOR,
  MOBILE_FEED_TRADE_POSITION_DIRECTIONS,
  MOBILE_FEED_TRADE_POSITION_EFFECTS,
  MobileFeedPage,
  MobileFeedTrade,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertEnumMember,
  assertHexString,
  assertNullableString,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: feed',
  // Feed queries are still slow server-side, and an unfiltered page on a cold cache is the worst case, so
  // these get the long timeout rather than the default.
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('fetches an unfiltered page of the global feed', async () => {
      const page = await tc.mobile.getFeed();
      debugPrint('Global feed page', page);
      assertFeedPageShape(page);
    });

    void test('honors a minimum notional and page limit', async () => {
      const limit = 5;
      const page = await tc.mobile.getFeed({
        minimumNotional: MOBILE_FEED_MIN_NOTIONAL_FLOOR,
        limit,
      });
      debugPrint('Filtered feed page', page);
      assertFeedPageShape(page);
      assert.ok(
        page.trades.length <= limit,
        `feed page should respect the requested limit of ${limit}`,
      );
      assert.ok(
        limit <= MOBILE_FEED_MAX_PAGE_SIZE,
        'test limit should not exceed the backend page cap',
      );
    });

    void test('rejects a malformed cursor with INVALID_FEED_CURSOR', async () => {
      try {
        await tc.mobile.getFeed({ cursor: 'not-a-feed-cursor' });
        assert.fail('expected INVALID_FEED_CURSOR for a malformed cursor');
      } catch (error) {
        assert.ok(
          error instanceof MobileServerFailureError,
          'should throw MobileServerFailureError',
        );
        assert.equal(
          error.responseData.error_code,
          MOBILE_ERROR_CODES.INVALID_FEED_CURSOR,
        );
      }
    });
  },
);

/**
 * Asserts the shape of a feed page and each of its trades.
 */
function assertFeedPageShape(page: MobileFeedPage): void {
  assert.ok(Array.isArray(page.trades), 'feed page trades should be an array');
  assert.ok(
    page.nextCursor === null || typeof page.nextCursor === 'string',
    'feed page nextCursor should be a string or null',
  );
  assertArrayElements(page.trades, assertFeedTradeShape, 'page.trades');
}

/**
 * Asserts the shape of a single feed trade, covering identity enrichment, display-unit numbers, and the
 * tagged margin/position objects.
 */
function assertFeedTradeShape(trade: MobileFeedTrade, label: string): void {
  assertHexString(trade.orderDigest, `${label}.orderDigest`);
  assertHexString(trade.subaccount, `${label}.subaccount`);
  // The feed includes unnamed public activity, so both name fields are null until a username is claimed.
  assertNullableString(trade.username, `${label}.username`);
  assertNullableString(trade.displayName, `${label}.displayName`);
  assert.ok(
    trade.avatarUrl === null || typeof trade.avatarUrl === 'string',
    `${label}.avatarUrl should be a string or null`,
  );
  assertNumber(trade.productId, `${label}.productId`);
  assertFiniteNonNegativeNumber(trade.quantity, `${label}.quantity`);
  assertFiniteNonNegativeNumber(trade.notional, `${label}.notional`);
  assertFiniteNonNegativeNumber(trade.averagePrice, `${label}.averagePrice`);
  assertEnumMember(
    trade.margin.mode,
    MOBILE_FEED_MARGIN_MODES,
    `${label}.margin.mode`,
  );
  if (trade.margin.mode === 'cross') {
    assert.equal(
      trade.margin.estimatedLeverage,
      undefined,
      `${label}.margin.estimatedLeverage should be undefined on cross margin`,
    );
  } else if (trade.margin.estimatedLeverage !== undefined) {
    assertNumber(
      trade.margin.estimatedLeverage,
      `${label}.margin.estimatedLeverage`,
    );
  }
  assertEnumMember(
    trade.position.direction,
    MOBILE_FEED_TRADE_POSITION_DIRECTIONS,
    `${label}.position.direction`,
  );
  assertEnumMember(
    trade.position.effect,
    MOBILE_FEED_TRADE_POSITION_EFFECTS,
    `${label}.position.effect`,
  );
  assertNumber(trade.realizedPnl, `${label}.realizedPnl`);
  assert.ok(
    Number.isFinite(trade.realizedPnl),
    `${label}.realizedPnl should be finite`,
  );
  assert.ok(
    Number.isSafeInteger(trade.filledAt) && trade.filledAt >= 0,
    `${label}.filledAt should be a non-negative safe integer`,
  );
}

/**
 * Asserts that a value is a finite, non-negative plain number.
 */
function assertFiniteNonNegativeNumber(value: unknown, label: string): void {
  assertNumber(value, label);
  assert.ok(
    Number.isFinite(value) && (value as number) >= 0,
    `${label} should be a finite non-negative number`,
  );
}
