import {
  GetNuanzeSubaccountLeaderboardResponse,
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
/** Follower with several active follow edges, including subaccounts without a claimed username. */
const FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX =
  '0x761a919a447f948b609885630d325fb35ff44c0564656661756c740000000000';
/** Well-formed bytes32 hex that no follower has an active edge to. */
const ABSENT_SUBACCOUNT_HEX =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

void describe(
  '[nuanze-client]: leaderboard',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let leaderboardClient: RunContext['nuanze'];

    before(() => {
      leaderboardClient = createTestContext().nuanze;
    });

    void test('returns a ranked page of account PnL', async () => {
      const response = await leaderboardClient.getLeaderboard({
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
        await leaderboardClient.getLeaderboard({
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
        leaderboardClient.getSubaccountLeaderboard(params),
        leaderboardClient.getSubaccountLeaderboard({
          ...params,
          includePrivate: true,
        }),
        leaderboardClient.getSubaccountLeaderboard({
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
      const first = await leaderboardClient.getSubaccountLeaderboard(params);
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      const second = await leaderboardClient.getSubaccountLeaderboard({
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
      const first = await leaderboardClient.getSubaccountLeaderboard({
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
          await leaderboardClient.getSubaccountLeaderboard({
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
        leaderboardClient.getFollowedLeaderboard({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
          timeframe: '24h',
          includeUntraded: true,
          includePrivate: true,
          limit: 2,
        }),
        leaderboardClient.getFollowedLeaderboard({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
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

    void test('forwards followed leaderboard cursors for server validation', async () => {
      try {
        await leaderboardClient.getFollowedLeaderboard({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
          timeframe: '30d',
          cursor: 'not-a-followed-leaderboard-cursor',
        });
        assert.fail('expected INVALID_CURSOR for a malformed cursor');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'INVALID_CURSOR');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });

    void test('forwards followed leaderboard filters for server validation', async () => {
      try {
        await leaderboardClient.getFollowedLeaderboard({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
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
        await leaderboardClient.getFollowedLeaderboard({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
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

    void test('rejects a malformed follower subaccount hex', async () => {
      try {
        await leaderboardClient.getFollowedLeaderboard({
          subaccountHex: 'not-a-subaccount',
          timeframe: '24h',
        });
        assert.fail(
          'expected INVALID_SUBACCOUNT for a malformed subaccount hex',
        );
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

    void test('returns a ranked wallet viewer inline via viewAs', async () => {
      const collection = await leaderboardClient.getLeaderboard({
        timeframe: '30d',
        limit: 10,
      });
      const expected = collection.items[0];
      assert.ok(expected, 'leaderboard should contain a wallet');

      // A small limit plus a nonzero offset proves the viewer lookup is
      // independent of pagination.
      const response = await leaderboardClient.getLeaderboard({
        timeframe: '30d',
        limit: 1,
        offset: 5,
        viewAs: expected.address,
      });
      debugPrint('Leaderboard viewAs viewer', response.viewer);

      assert.ok(response.viewer, 'viewAs wallet should have a ranked viewer');
      assertLeaderboardItemShape(response.viewer, 'viewer');
      assert.equal(response.viewer.address, expected.address);
      assert.equal(response.viewer.rank, expected.rank);
    });

    void test('returns a ranked subaccount viewer inline via viewAs', async () => {
      const params = {
        timeframe: '30d' as const,
        limit: 10,
        includePrivate: true,
        includeUntraded: false,
        includeUnclaimed: true,
      };
      const collection =
        await leaderboardClient.getSubaccountLeaderboard(params);
      const expected = collection.items[0];
      assert.ok(expected, 'subaccount leaderboard should contain an item');

      const response = await leaderboardClient.getSubaccountLeaderboard({
        ...params,
        viewAs: expected.subaccountHex,
      });
      debugPrint('Subaccount leaderboard viewAs viewer', response.viewer);

      assert.ok(
        response.viewer,
        'viewAs subaccount should have a ranked viewer',
      );
      assert.equal(response.viewer.filteredRank, 1);
      assert.ok(response.viewer.item, 'viewer should include the full item');
      assertSubaccountLeaderboardItemShape(response.viewer.item, 'viewer.item');
      assert.notEqual(
        response.viewer.item.pnl,
        null,
        'traded viewer item should have PnL',
      );
      assert.equal(response.viewer.item.subaccountHex, expected.subaccountHex);
      assert.equal(response.viewer.item.globalRank, expected.globalRank);
    });

    void test('keeps a full unclaimed viewer item when its filtered rank is excluded', async (context) => {
      const collection = await leaderboardClient.getSubaccountLeaderboard({
        timeframe: '30d',
        limit: 200,
        includePrivate: true,
        includeUntraded: false,
        includeUnclaimed: true,
      });
      const expected = collection.items.find((item) => item.username === null);
      if (!expected) {
        context.skip('dataset has no traded unclaimed subaccount');
        return;
      }

      const response = await leaderboardClient.getSubaccountLeaderboard({
        timeframe: '30d',
        limit: 10,
        includePrivate: true,
        includeUntraded: false,
        includeUnclaimed: false,
        viewAs: expected.subaccountHex,
      });
      debugPrint('Filtered subaccount leaderboard viewer', response.viewer);

      assert.ok(response.viewer, 'viewer should remain available');
      assert.equal(response.viewer.filteredRank, null);
      assert.ok(response.viewer.item, 'source item should remain available');
      assertSubaccountLeaderboardItemShape(response.viewer.item, 'viewer.item');
      assert.notEqual(
        response.viewer.item.pnl,
        null,
        'traded viewer item should have PnL',
      );
      assert.equal(response.viewer.item.subaccountHex, expected.subaccountHex);
      assert.equal(response.viewer.item.globalRank, expected.globalRank);
    });

    void test('returns a null viewer for absent public identifiers', async () => {
      const [wallet, subaccount] = await Promise.all([
        leaderboardClient.getLeaderboard({
          timeframe: '30d',
          limit: 1,
          viewAs: '0x000000000000000000000000000000000000dead',
        }),
        leaderboardClient.getSubaccountLeaderboard({
          timeframe: '30d',
          limit: 1,
          includePrivate: true,
          includeUntraded: true,
          includeUnclaimed: true,
          viewAs: ABSENT_SUBACCOUNT_HEX,
        }),
      ]);

      assert.equal(wallet.viewer, null);
      assert.equal(subaccount.viewer, null);
    });

    void test('rejects malformed viewAs identifiers', async () => {
      try {
        await leaderboardClient.getLeaderboard({
          viewAs: 'not-an-address',
        });
        assert.fail('expected INVALID_ADDRESS for a malformed viewAs');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'INVALID_ADDRESS');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }

      try {
        await leaderboardClient.getSubaccountLeaderboard({
          viewAs: 'not-a-subaccount',
        });
        assert.fail('expected INVALID_SUBACCOUNT for a malformed viewAs');
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

    void test('gets a wallet leaderboard position derived from the collection', async () => {
      const collection = await leaderboardClient.getLeaderboard({
        timeframe: '30d',
        limit: 10,
      });
      const expected = collection.items[0];
      assert.ok(expected, 'leaderboard should contain a wallet');

      const response = await leaderboardClient.getWalletLeaderboardPosition({
        address: expected.address,
        timeframe: '30d',
      });
      debugPrint('Wallet leaderboard position', response);

      assert.equal(response.timeframe, '30d');
      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.ok(response.item, 'derived wallet should have a ranked item');
      assertLeaderboardItemShape(response.item, 'item');
      assert.equal(response.item.address, expected.address);
      assert.equal(response.item.rank, expected.rank);
    });

    void test('gets a subaccount leaderboard position derived from the collection', async () => {
      const params = {
        timeframe: '30d' as const,
        limit: 10,
        includePrivate: true,
        includeUntraded: false,
        includeUnclaimed: true,
      };
      const collection =
        await leaderboardClient.getSubaccountLeaderboard(params);
      const expected = collection.items[0];
      assert.ok(expected, 'subaccount leaderboard should contain an item');

      const response = await leaderboardClient.getSubaccountLeaderboardPosition(
        {
          subaccountHex: expected.subaccountHex,
          timeframe: params.timeframe,
          includePrivate: params.includePrivate,
          includeUntraded: params.includeUntraded,
          includeUnclaimed: params.includeUnclaimed,
        },
      );
      debugPrint('Subaccount leaderboard position', response);

      assert.equal(response.timeframe, params.timeframe);
      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(response.filteredRank, 1);
      assert.ok(response.item, 'derived subaccount should have a ranked item');
      assertSubaccountLeaderboardItemShape(response.item, 'item');
      assert.notEqual(response.item.pnl, null, 'traded item should have PnL');
      assert.equal(response.item.subaccountHex, expected.subaccountHex);
      assert.equal(response.item.globalRank, expected.globalRank);
    });

    void test('keeps a full subaccount position item when its filtered rank is excluded', async (context) => {
      const collection = await leaderboardClient.getSubaccountLeaderboard({
        timeframe: '30d',
        limit: 200,
        includePrivate: true,
        includeUntraded: false,
        includeUnclaimed: true,
      });
      const expected = collection.items.find((item) => item.username === null);
      if (!expected) {
        context.skip('dataset has no traded unclaimed subaccount');
        return;
      }

      const response = await leaderboardClient.getSubaccountLeaderboardPosition(
        {
          subaccountHex: expected.subaccountHex,
          timeframe: '30d',
          includePrivate: true,
          includeUntraded: false,
          includeUnclaimed: false,
        },
      );
      debugPrint('Filtered subaccount leaderboard position', response);

      assert.equal(response.filteredRank, null);
      assert.ok(response.item, 'source item should remain available');
      assertSubaccountLeaderboardItemShape(response.item, 'item');
      assert.notEqual(response.item.pnl, null, 'traded item should have PnL');
      assert.equal(response.item.subaccountHex, expected.subaccountHex);
      assert.equal(response.item.globalRank, expected.globalRank);
    });

    void test('returns null position items for absent public identifiers', async () => {
      const [wallet, subaccount] = await Promise.all([
        leaderboardClient.getWalletLeaderboardPosition({
          address: '0x000000000000000000000000000000000000dead',
          timeframe: '30d',
        }),
        leaderboardClient.getSubaccountLeaderboardPosition({
          subaccountHex: ABSENT_SUBACCOUNT_HEX,
          timeframe: '30d',
          includePrivate: true,
          includeUntraded: true,
          includeUnclaimed: true,
        }),
      ]);

      assert.equal(wallet.item, null);
      assert.equal(subaccount.item, null);
      assert.equal(subaccount.filteredRank, null);
    });

    void test('rejects malformed position identifiers', async () => {
      try {
        await leaderboardClient.getWalletLeaderboardPosition({
          address: 'not-an-address',
        });
        assert.fail('expected INVALID_ADDRESS for a malformed address');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'INVALID_ADDRESS');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }

      try {
        await leaderboardClient.getSubaccountLeaderboardPosition({
          subaccountHex: 'not-a-subaccount',
        });
        assert.fail(
          'expected INVALID_SUBACCOUNT for a malformed subaccount hex',
        );
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

    void test('returns a ranked followed viewer inline via viewAs', async (context) => {
      const params = {
        subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
        timeframe: '30d' as const,
        includePrivate: true,
        includeUntraded: true,
        includeUnclaimed: true,
      };
      const collection = await leaderboardClient.getFollowedLeaderboard({
        ...params,
        limit: 200,
      });
      assert.equal(
        collection.viewer,
        null,
        'viewer should be null without viewAs',
      );
      const expected = collection.items[0];
      if (!expected) {
        context.skip('fixture follower has no active follow edges');
        return;
      }

      const response = await leaderboardClient.getFollowedLeaderboard({
        ...params,
        limit: 1,
        viewAs: expected.subaccountHex,
      });
      debugPrint('Followed leaderboard viewAs viewer', response.viewer);

      assert.ok(
        response.viewer,
        'viewAs followed subaccount should have a viewer',
      );
      assert.equal(response.viewer.filteredRank, 1);
      assert.ok(response.viewer.item, 'viewer should carry the followed item');
      assertFollowedLeaderboardItemShape(response.viewer.item, 'viewer.item');
      assert.equal(response.viewer.item.subaccountHex, expected.subaccountHex);
      assert.equal(response.viewer.item.globalRank, expected.globalRank);
      assert.deepEqual(response.viewer.item, expected);
    });

    void test('gets followed leaderboard positions consistent with collection order', async (context) => {
      const params = {
        subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
        timeframe: '30d' as const,
        includePrivate: true,
        includeUntraded: true,
        includeUnclaimed: true,
      };
      const collection = await leaderboardClient.getFollowedLeaderboard({
        ...params,
        limit: 200,
      });
      if (collection.items.length === 0) {
        context.skip('fixture follower has no active follow edges');
        return;
      }

      for (const [index, expected] of collection.items.slice(0, 3).entries()) {
        const response = await leaderboardClient.getFollowedLeaderboardPosition(
          {
            ...params,
            viewAs: expected.subaccountHex,
          },
        );
        debugPrint(`Followed leaderboard position #${index + 1}`, response);

        assert.equal(response.timeframe, params.timeframe);
        assert.match(
          response.asOf,
          ISO_UTC,
          'asOf should be a UTC ISO timestamp',
        );
        assert.equal(response.filteredRank, index + 1);
        assert.ok(response.item, 'followed subaccount should have an item');
        assertFollowedLeaderboardItemShape(response.item, 'item');
        assert.deepEqual(response.item, expected);
      }
    });

    void test('keeps a full followed position item when its filtered rank is excluded', async (context) => {
      const collection = await leaderboardClient.getFollowedLeaderboard({
        subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
        timeframe: '30d',
        limit: 200,
        includePrivate: true,
        includeUntraded: true,
        includeUnclaimed: true,
      });
      const expected = collection.items.find((item) => item.username === null);
      if (!expected) {
        context.skip('fixture follower follows no unclaimed subaccount');
        return;
      }

      const excluded = {
        subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
        timeframe: '30d' as const,
        includePrivate: true,
        includeUntraded: true,
        includeUnclaimed: false,
      };
      const [viewAsResponse, position] = await Promise.all([
        leaderboardClient.getFollowedLeaderboard({
          ...excluded,
          limit: 200,
          viewAs: expected.subaccountHex,
        }),
        leaderboardClient.getFollowedLeaderboardPosition({
          ...excluded,
          viewAs: expected.subaccountHex,
        }),
      ]);
      debugPrint('Filtered followed leaderboard position', position);

      assert.ok(
        !viewAsResponse.items.some(
          (item) => item.subaccountHex === expected.subaccountHex,
        ),
        'excluded subaccount should not appear in the filtered page',
      );
      assert.ok(viewAsResponse.viewer, 'viewer should remain available');
      assert.equal(viewAsResponse.viewer.filteredRank, null);
      assert.deepEqual(viewAsResponse.viewer.item, expected);

      assert.equal(position.filteredRank, null);
      assert.ok(position.item, 'source item should remain available');
      assertFollowedLeaderboardItemShape(position.item, 'item');
      assert.equal(position.item.username, null);
      assert.deepEqual(position.item, expected);
    });

    void test('returns null followed viewer and position for an unfollowed subaccount', async () => {
      const [collection, position] = await Promise.all([
        leaderboardClient.getFollowedLeaderboard({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
          timeframe: '30d',
          limit: 1,
          viewAs: ABSENT_SUBACCOUNT_HEX,
        }),
        leaderboardClient.getFollowedLeaderboardPosition({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
          viewAs: ABSENT_SUBACCOUNT_HEX,
          timeframe: '30d',
        }),
      ]);

      assert.equal(collection.viewer, null);
      assert.equal(position.timeframe, '30d');
      assert.match(
        position.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(position.filteredRank, null);
      assert.equal(position.item, null);
    });

    void test('rejects malformed followed viewAs identifiers', async () => {
      const attempts = [
        () =>
          leaderboardClient.getFollowedLeaderboard({
            subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
            timeframe: '30d',
            viewAs: 'not-a-subaccount',
          }),
        () =>
          leaderboardClient.getFollowedLeaderboardPosition({
            subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
            viewAs: 'not-a-subaccount',
            timeframe: '30d',
          }),
        () =>
          leaderboardClient.getFollowedLeaderboardPosition({
            subaccountHex: 'not-a-subaccount',
            viewAs: ABSENT_SUBACCOUNT_HEX,
            timeframe: '30d',
          }),
      ];

      for (const attempt of attempts) {
        try {
          await attempt();
          assert.fail('expected INVALID_SUBACCOUNT for a malformed identifier');
        } catch (error) {
          assert.ok(
            error instanceof NuanzeServerFailureError,
            'should throw NuanzeServerFailureError',
          );
          assert.equal(error.errorCode, 'INVALID_SUBACCOUNT');
          assert.equal(error.httpStatus, 400);
          assertNonEmptyString(error.requestId, 'error.requestId');
        }
      }
    });

    void test('rejects a followed position without a timeframe', async () => {
      try {
        await leaderboardClient.getFollowedLeaderboardPosition({
          subaccountHex: FOLLOWED_LEADERBOARD_SUBACCOUNT_HEX,
          viewAs: ABSENT_SUBACCOUNT_HEX,
          timeframe: undefined as unknown as NuanzeLeaderboardTimeframe,
        });
        assert.fail('expected BAD_REQUEST for a missing timeframe');
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
  if (item.username !== null) {
    assertString(item.username, `${label}.username`);
  }
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
