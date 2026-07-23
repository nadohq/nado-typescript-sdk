import {
  MOBILE_ERROR_CODES,
  MOBILE_FEED_MAX_PAGE_SIZE,
  MOBILE_FEED_MIN_NOTIONAL_FLOOR,
  MobileFeedPage,
  MobileFeedTrade,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test, TestContext } from 'node:test';
import {
  assertArrayElements,
  assertEnumMember,
  assertHexString,
  assertNumber,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

const FEED_POSITION_DIRECTIONS = ['long', 'short'] as const;
const FEED_POSITION_EFFECTS = [
  'opened',
  'increased',
  'reduced',
  'closed',
  'flipped',
] as const;
const FEED_MARGIN_MODES = ['cross', 'isolated'] as const;

void describe(
  '[mobile-client]: feed',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('fetches an unfiltered page of the global feed', async (t) => {
      const page = await getFeedOrSkip(t, () => tc.mobile.getFeed());
      if (page === null) {
        return;
      }
      debugPrint('Global feed page', page);
      assertFeedPageShape(page);
    });

    void test('honors a minimum notional and page limit', async (t) => {
      const limit = 5;
      const page = await getFeedOrSkip(t, () =>
        tc.mobile.getFeed({
          minimumNotional: MOBILE_FEED_MIN_NOTIONAL_FLOOR,
          limit,
        }),
      );
      if (page === null) {
        return;
      }
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

    void test('rejects a malformed cursor with INVALID_FEED_CURSOR', async (t) => {
      try {
        await tc.mobile.getFeed({ cursor: 'not-a-feed-cursor' });
        assert.fail('expected INVALID_FEED_CURSOR for a malformed cursor');
      } catch (error) {
        if (skipIfFeedUnavailable(t, error)) {
          return;
        }
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
 * Runs a feed query, returning `null` (after skipping the test) when the backend has not yet deployed the
 * feed variant. The SDK feed client is built ahead of the core implementation, so an unrecognized variant is
 * an expected "not ready" state rather than a failure.
 */
async function getFeedOrSkip(
  t: TestContext,
  operation: () => Promise<MobileFeedPage>,
): Promise<MobileFeedPage | null> {
  try {
    return await operation();
  } catch (error) {
    if (skipIfFeedUnavailable(t, error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Skips the current test when the error indicates the feed variant is not implemented on the target backend.
 */
function skipIfFeedUnavailable(t: TestContext, error: unknown): boolean {
  const notImplemented =
    error instanceof MobileServerFailureError &&
    error.responseData.error_code === MOBILE_ERROR_CODES.NOT_IMPLEMENTED;
  // Backends predating the feed reject the unknown request variant at the JSON-deserialization layer
  // (HTTP 422 with a plain string body), before any typed failure envelope exists
  const unknownVariant =
    error instanceof Error && error.message.includes('unknown variant `feed`');
  if (notImplemented || unknownVariant) {
    t.skip('feed variant not implemented on target backend yet');
    return true;
  }
  return false;
}

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
  assertString(trade.username, `${label}.username`);
  assertString(trade.displayName, `${label}.displayName`);
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
    FEED_MARGIN_MODES,
    `${label}.margin.mode`,
  );
  if (trade.margin.mode === 'cross') {
    assert.ok(
      !('estimatedLeverage' in trade.margin),
      `${label}.margin should not carry estimatedLeverage on cross margin`,
    );
  } else if (trade.margin.estimatedLeverage !== undefined) {
    assertNumber(
      trade.margin.estimatedLeverage,
      `${label}.margin.estimatedLeverage`,
    );
  }
  assertEnumMember(
    trade.position.direction,
    FEED_POSITION_DIRECTIONS,
    `${label}.position.direction`,
  );
  assertEnumMember(
    trade.position.effect,
    FEED_POSITION_EFFECTS,
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
