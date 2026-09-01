import {
  NUANZE_LEADERBOARD_TIMEFRAMES,
  NuanzeFollowedLeaderboardItem,
  NuanzeLeaderboardItem,
  NuanzeLeaderboardTimeframe,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import { subaccountToHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertEnumMember,
  assertHexString,
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_SUBACCOUNT_NAME, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: leaderboard',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(() => {
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

    void test('returns followed-subaccount stats in request order', async () => {
      const board = await tc.nuanze.getLeaderboard({ limit: 1 });
      const [first] = board.items;
      assert.ok(first, 'expected at least one leaderboard row to follow');

      const known = subaccountToHex({
        subaccountOwner: first.address,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });
      // Valid bytes32 that is extremely unlikely to have window data, so the row is a backfill.
      const unknown =
        '0x1111111111111111111111111111111111111111000000000000000000000000';

      const response = await tc.nuanze.getFollowedLeaderboard({
        subaccounts: [unknown, known],
        timeframe: '7d',
      });
      debugPrint('Followed leaderboard', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(response.timeframe, '7d');
      assert.equal(response.count, 2);
      assert.equal(response.items.length, 2);
      assert.equal(response.items[0]?.subaccountHex, unknown);
      assert.equal(response.items[1]?.subaccountHex, known);
      assertArrayElements(
        response.items,
        assertFollowedLeaderboardItemShape,
        'items',
      );

      const unknownRow = response.items[0];
      assert.ok(unknownRow);
      assert.equal(unknownRow.pnl, null);
      assert.equal(unknownRow.globalRank, null);
      assert.equal(unknownRow.wins, 0);
      assert.equal(unknownRow.losses, 0);
      assert.equal(unknownRow.trades, 0);
      assert.deepEqual(unknownRow.productIds, []);
      assert.equal(unknownRow.productCount, 0);
    });

    void test('rejects a malformed subaccount hex with INVALID_SUBACCOUNT', async () => {
      try {
        await tc.nuanze.getFollowedLeaderboard({
          subaccounts: ['0x123'],
          timeframe: '7d',
        });
        assert.fail('expected INVALID_SUBACCOUNT for a malformed hex');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'INVALID_SUBACCOUNT');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });

    void test('rejects an empty followed set with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getFollowedLeaderboard({
          subaccounts: [],
          timeframe: '7d',
        });
        assert.fail('expected BAD_REQUEST for an empty followed set');
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

function assertFollowedLeaderboardItemShape(
  item: NuanzeFollowedLeaderboardItem,
  label: string,
): void {
  assertHexString(item.subaccountHex, `${label}.subaccountHex`);
  assert.match(
    item.subaccountHex,
    /^0x[0-9a-f]{64}$/,
    `${label}.subaccountHex should be lowercase bytes32`,
  );
  assertNonNegativeInteger(item.wins, `${label}.wins`);
  assertNonNegativeInteger(item.losses, `${label}.losses`);
  assertNonNegativeInteger(item.trades, `${label}.trades`);
  assertNonNegativeInteger(item.productCount, `${label}.productCount`);
  assert.equal(
    item.productCount,
    item.productIds.length,
    `${label}.productCount should equal productIds.length`,
  );
  for (const [index, productId] of item.productIds.entries()) {
    assertNumber(productId, `${label}.productIds[${index}]`);
    assert.ok(productId >= 0, `${label}.productIds[${index}] should be >= 0`);
  }

  if (item.pnl !== null) {
    assertBigNumberFinite(item.pnl, `${label}.pnl`);
  }
  if (item.winRate !== null) {
    assertBigNumberFinite(item.winRate, `${label}.winRate`);
  }
  if (item.globalRank !== null) {
    assertNumber(item.globalRank, `${label}.globalRank`);
    assert.ok(item.globalRank >= 1, `${label}.globalRank should be >= 1`);
  }
}
