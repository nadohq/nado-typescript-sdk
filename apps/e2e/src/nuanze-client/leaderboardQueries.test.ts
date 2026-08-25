import {
  NUANZE_LEADERBOARD_TIMEFRAMES,
  NuanzeLeaderboardItem,
  NuanzeLeaderboardTimeframe,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertEnumMember,
  assertNonEmptyString,
  assertNonNegativeInteger,
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
  '[nuanze-client]: leaderboard',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('returns a ranked page of account PnL', async () => {
      const response = await tc.nuanze.getLeaderboard({
        timeframe: '30d',
        limit: 10,
        offset: 0,
      });
      debugPrint('Leaderboard', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(response.timeframe, '30d');
      assertEnumMember(
        response.timeframe,
        NUANZE_LEADERBOARD_TIMEFRAMES,
        'timeframe',
      );
      assert.equal(response.limit, 10);
      assert.equal(response.offset, 0);
      assertNonNegativeInteger(response.total, 'total');
      assert.ok(response.items.length > 0, 'items should not be empty');
      assert.ok(
        response.items.length <= response.limit,
        'items should not exceed limit',
      );
      assertArrayElements(response.items, assertLeaderboardItemShape, 'items');

      const ranks = response.items.map((item) => item.rank);
      assert.deepEqual(
        ranks,
        [...ranks].sort((a, b) => a - b),
        'items should be ordered by rank ascending',
      );
    });

    void test('rejects an unknown timeframe with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getLeaderboard({
          timeframe: '90d' as NuanzeLeaderboardTimeframe,
        });
        assert.fail('expected BAD_REQUEST for an unknown timeframe');
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

function assertLeaderboardItemShape(
  item: NuanzeLeaderboardItem,
  label: string,
): void {
  assertNumber(item.rank, `${label}.rank`);
  assert.ok(item.rank >= 1, `${label}.rank should be >= 1`);
  assertNonEmptyString(item.address, `${label}.address`);
  assert.match(item.address, /^0x[0-9a-f]{40}$/, `${label}.address`);
  assertBigNumberFinite(item.accountPnl, `${label}.accountPnl`);
  assertBigNumberFinite(item.pnlAll, `${label}.pnlAll`);
  assertNonNegativeInteger(item.wins, `${label}.wins`);
  assertNonNegativeInteger(item.losses, `${label}.losses`);

  if (item.pnl24h !== null) {
    assertBigNumberFinite(item.pnl24h, `${label}.pnl24h`);
  }
  if (item.winRate !== null) {
    assertBigNumberFinite(item.winRate, `${label}.winRate`);
  }
}
