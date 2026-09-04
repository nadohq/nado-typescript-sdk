import {
  GetNuanzeSubaccountLeaderboardResponse,
  NUANZE_ERROR_CODES,
  NUANZE_LEADERBOARD_TIMEFRAMES,
  NuanzeFollowedLeaderboardItem,
  NuanzeLeaderboardItem,
  NuanzeLeaderboardTimeframe,
  NuanzeServerFailureError,
  NuanzeSubaccountLeaderboardItem,
} from '@nadohq/nuanze-client';
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
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const FOLLOWED_LEADERBOARD_USERNAME = 'frrrtss';

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
        offset: 1,
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
      assert.equal(response.offset, 1);
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
      assertWalletPnlDescending(response.items, 'items');
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

    void test('applies public subaccount filters and orders rows by PnL', async () => {
      const params = { timeframe: '24h' as const, limit: 10 };
      const [filtered, withPrivate, withUntraded] = await Promise.all([
        tc.nuanze.getSubaccountLeaderboard(params),
        tc.nuanze.getSubaccountLeaderboard({
          ...params,
          includePrivate: true,
        }),
        tc.nuanze.getSubaccountLeaderboard({
          ...params,
          includeUntraded: true,
        }),
      ]);
      debugPrint('Subaccount leaderboard', filtered);

      for (const response of [filtered, withPrivate, withUntraded]) {
        assertSubaccountLeaderboardResponseShape(response, params.limit);
        assert.equal(response.timeframe, params.timeframe);
        assertNullablePnlDescending(response.items, 'items');
      }

      assert.ok(
        withPrivate.totalCount > filtered.totalCount,
        'including private accounts should increase totalCount',
      );
      assert.ok(
        withUntraded.totalCount >= filtered.totalCount,
        'including untraded accounts should not reduce totalCount',
      );
      for (const [index, item] of filtered.items.entries()) {
        assert.notEqual(
          item.pnl,
          null,
          `filtered.items[${index}].pnl should not be null`,
        );
      }
    });

    void test('continues public subaccount pagination with a bound cursor', async () => {
      const params = {
        timeframe: '7d' as const,
        limit: 2,
        includePrivate: true,
        includeUntraded: true,
      };
      const first = await tc.nuanze.getSubaccountLeaderboard(params);
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      const second = await tc.nuanze.getSubaccountLeaderboard({
        ...params,
        cursor: nextCursor,
      });
      const firstSubaccounts = new Set(
        first.items.map((item) => item.subaccountHex),
      );
      for (const item of second.items) {
        assert.ok(
          !firstSubaccounts.has(item.subaccountHex),
          'cursor page should not repeat a subaccount from the first page',
        );
      }
      assertNullablePnlDescending(
        [...first.items, ...second.items],
        'cursor items',
      );
    });

    void test('rejects a subaccount cursor reused with changed filters', async () => {
      const first = await tc.nuanze.getSubaccountLeaderboard({
        timeframe: '7d',
        limit: 2,
        includePrivate: true,
      });
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      const changedFilters = [
        { includePrivate: false, includeUntraded: false },
        { includePrivate: true, includeUntraded: true },
      ];
      for (const filters of changedFilters) {
        try {
          await tc.nuanze.getSubaccountLeaderboard({
            timeframe: '7d',
            limit: 2,
            cursor: nextCursor,
            ...filters,
          });
          assert.fail('expected CURSOR_FILTER_MISMATCH for changed filters');
        } catch (error) {
          assert.ok(
            error instanceof NuanzeServerFailureError,
            'should throw NuanzeServerFailureError',
          );
          assert.equal(error.errorCode, 'CURSOR_FILTER_MISMATCH');
          assert.equal(error.httpStatus, 400);
          assertNonEmptyString(error.requestId, 'error.requestId');
        }
      }
    });

    void test('returns followed accounts sorted by PnL and applies the traded filter', async () => {
      const [inclusive, tradedOnly] = await Promise.all([
        tc.nuanze.getFollowedLeaderboard({
          username: FOLLOWED_LEADERBOARD_USERNAME,
          timeframe: '24h',
          includeUntraded: true,
          includePrivate: true,
          limit: 2,
        }),
        tc.nuanze.getFollowedLeaderboard({
          username: FOLLOWED_LEADERBOARD_USERNAME,
          timeframe: '24h',
          includeUntraded: false,
          includePrivate: false,
          limit: 2,
        }),
      ]);
      debugPrint('Followed leaderboard', inclusive);

      for (const response of [inclusive, tradedOnly]) {
        assert.match(
          response.asOf,
          ISO_UTC,
          'asOf should be a UTC ISO timestamp',
        );
        assert.equal(response.timeframe, '24h');
        assert.ok(response.items.length <= 2, 'items should respect limit');
        assert.ok(
          response.nextCursor === null ||
            typeof response.nextCursor === 'string',
          'nextCursor should be a string or null',
        );
        assertArrayElements(
          response.items,
          assertFollowedLeaderboardItemShape,
          'items',
        );
        assertNullablePnlDescending(response.items, 'items');
      }

      assert.ok(inclusive.items.length > 1, 'fixture should follow accounts');
      assert.ok(
        tradedOnly.items.length <= inclusive.items.length,
        'excluding untraded accounts should not increase page size',
      );
      const inclusiveSubaccounts = new Set(
        inclusive.items.map((item) => item.subaccountHex),
      );
      for (const [index, item] of tradedOnly.items.entries()) {
        assert.notEqual(
          item.pnl,
          null,
          `tradedOnly.items[${index}].pnl should not be null`,
        );
        assert.ok(
          inclusiveSubaccounts.has(item.subaccountHex),
          'traded-only rows should be a subset of inclusive rows',
        );
      }
    });

    void test('continues followed leaderboard pagination without duplicates', async () => {
      const params = {
        username: FOLLOWED_LEADERBOARD_USERNAME,
        timeframe: '30d' as const,
        includeUntraded: true,
        limit: 2,
      };
      const first = await tc.nuanze.getFollowedLeaderboard(params);
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      const second = await tc.nuanze.getFollowedLeaderboard({
        ...params,
        cursor: nextCursor,
      });
      const firstSubaccounts = new Set(
        first.items.map((item) => item.subaccountHex),
      );
      for (const item of second.items) {
        assert.ok(
          !firstSubaccounts.has(item.subaccountHex),
          'cursor page should not repeat a followed subaccount',
        );
      }
      assertNullablePnlDescending(
        [...first.items, ...second.items],
        'followed cursor items',
      );
    });

    void test('forwards followed leaderboard filters for server validation', async () => {
      try {
        await tc.nuanze.getFollowedLeaderboard({
          username: FOLLOWED_LEADERBOARD_USERNAME,
          timeframe: '24h',
          includeUntraded: 'invalid' as unknown as boolean,
        });
        assert.fail(
          'expected BAD_REQUEST for an invalid includeUntraded value',
        );
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

    void test('forwards followed leaderboard private visibility for server validation', async () => {
      try {
        await tc.nuanze.getFollowedLeaderboard({
          username: FOLLOWED_LEADERBOARD_USERNAME,
          timeframe: '24h',
          includePrivate: 'invalid' as unknown as boolean,
        });
        assert.fail('expected BAD_REQUEST for an invalid includePrivate value');
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

    void test('rejects an unknown followed leaderboard username', async () => {
      try {
        await tc.nuanze.getFollowedLeaderboard({
          username: `sdk-e2e-missing-${Date.now()}`,
          timeframe: '24h',
        });
        assert.fail('expected USERNAME_NOT_FOUND for an unknown username');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.ok(
          (NUANZE_ERROR_CODES as readonly string[]).includes(error.errorCode),
          'USERNAME_NOT_FOUND should be part of the public error-code contract',
        );
        assert.equal(error.errorCode, 'USERNAME_NOT_FOUND');
        assert.equal(error.httpStatus, 404);
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
  if (item.rankDelta !== null) {
    assertNumber(item.rankDelta, `${label}.rankDelta`);
  }
  assertNonEmptyString(item.address, `${label}.address`);
  assert.match(item.address, /^0x[0-9a-f]{40}$/, `${label}.address`);
  assertBigNumberFinite(item.accountPnl, `${label}.accountPnl`);
  assertBigNumberFinite(item.pnlAll, `${label}.pnlAll`);
  assertNonNegativeInteger(item.wins, `${label}.wins`);
  assertNonNegativeInteger(item.losses, `${label}.losses`);
  assertProductIds(item, label);

  if (item.pnl24h !== null) {
    assertBigNumberFinite(item.pnl24h, `${label}.pnl24h`);
  }
  if (item.pnl7d !== null) {
    assertBigNumberFinite(item.pnl7d, `${label}.pnl7d`);
  }
  if (item.pnl30d !== null) {
    assertBigNumberFinite(item.pnl30d, `${label}.pnl30d`);
  }
  if (item.winRate !== null) {
    assertBigNumberFinite(item.winRate, `${label}.winRate`);
  }
}

function assertSubaccountLeaderboardResponseShape(
  response: GetNuanzeSubaccountLeaderboardResponse,
  requestedLimit: number,
): void {
  assert.match(response.asOf, ISO_UTC, 'asOf should be a UTC ISO timestamp');
  assertNonNegativeInteger(response.totalCount, 'totalCount');
  assert.ok(response.items.length > 0, 'items should not be empty');
  assert.ok(
    response.items.length <= requestedLimit,
    'items should not exceed limit',
  );
  assert.ok(
    response.nextCursor === null || typeof response.nextCursor === 'string',
    'nextCursor should be a string or null',
  );
  assertArrayElements(
    response.items,
    assertSubaccountLeaderboardItemShape,
    'items',
  );
}

function assertSubaccountLeaderboardItemShape(
  item: NuanzeSubaccountLeaderboardItem,
  label: string,
): void {
  assertSubaccountStatsShape(item, label);
  assertNonEmptyString(item.username, `${label}.username`);
  if (item.displayName !== null) {
    assertString(item.displayName, `${label}.displayName`);
  }
}

function assertFollowedLeaderboardItemShape(
  item: NuanzeFollowedLeaderboardItem,
  label: string,
): void {
  assertSubaccountStatsShape(item, label);
  if (item.username !== null) {
    assertString(item.username, `${label}.username`);
  }
  if (item.displayName !== null) {
    assertString(item.displayName, `${label}.displayName`);
  }
}

function assertSubaccountStatsShape(
  item: NuanzeSubaccountLeaderboardItem | NuanzeFollowedLeaderboardItem,
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
  assertProductIds(item, label);

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

function assertProductIds(
  item: { productIds: number[]; productCount: number },
  label: string,
): void {
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
}

function assertWalletPnlDescending(
  items: NuanzeLeaderboardItem[],
  label: string,
): void {
  for (let index = 1; index < items.length; index++) {
    const previous = items[index - 1];
    const current = items[index];
    assert.ok(previous);
    assert.ok(current);
    assert.ok(
      previous.accountPnl.gte(current.accountPnl),
      `${label} should be sorted by accountPnl descending`,
    );
  }
}

function assertNullablePnlDescending(
  items: Array<NuanzeSubaccountLeaderboardItem | NuanzeFollowedLeaderboardItem>,
  label: string,
): void {
  let encounteredNull = false;
  for (let index = 0; index < items.length; index++) {
    const current = items[index];
    assert.ok(current);
    if (current.pnl === null) {
      encounteredNull = true;
      continue;
    }

    assert.ok(!encounteredNull, `${label} should place null PnL values last`);
    const previous = items[index - 1];
    if (previous?.pnl !== null && previous?.pnl !== undefined) {
      assert.ok(
        previous.pnl.gte(current.pnl),
        `${label} should be sorted by PnL descending`,
      );
    }
  }
}
