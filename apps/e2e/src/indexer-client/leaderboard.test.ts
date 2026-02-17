import { IndexerClient } from '@nadohq/indexer-client';
import { Subaccount } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { assertArray, assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { getServerError } from '../utils/getServerError';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_CONTEST_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[indexer-client]: leaderboard',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;
    let subaccount: Subaccount;

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      client = new IndexerClient({
        url: context.endpoints.indexer,
        walletClient,
      });
      subaccount = {
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: walletClient.account.address,
      };
    });

    void test('getLeaderboard returns ranked participants', async () => {
      const leaderboard = await client.getLeaderboard({
        limit: 5,
        startCursor: undefined,
        contestId: TEST_CONTEST_IDS.LEADERBOARD,
        rankType: 'pnl',
      });

      debugPrint('Leaderboard', leaderboard);
      assertDefined(leaderboard, 'leaderboard');
      assertArray(leaderboard.participants, 'leaderboard.participants');
    });

    void test('getLeaderboardParticipant returns participant info', async () => {
      const leaderboardParticipant = await client.getLeaderboardParticipant({
        subaccount: {
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
        },
        contestIds: [...TEST_CONTEST_IDS.RECENT],
      });

      debugPrint('Leaderboard Participant', leaderboardParticipant);
      assertDefined(leaderboardParticipant, 'leaderboardParticipant');
    });

    void test('getLeaderboardContests returns contest details', async () => {
      const leaderboardContests = await client.getLeaderboardContests({
        contestIds: [TEST_CONTEST_IDS.LEGACY],
      });

      debugPrint('Leaderboard Contests', leaderboardContests);
      assertDefined(leaderboardContests, 'leaderboardContests');
      assertArray(leaderboardContests.contests, 'leaderboardContests.contests');
    });

    void describe('paginated leaderboard', () => {
      void test('first page returns valid paginated response', async () => {
        const leaderboardFirstPage = await client.getPaginatedLeaderboard({
          rankType: 'roi',
          startCursor: undefined,
          contestId: TEST_CONTEST_IDS.LEGACY,
          limit: 5,
        });

        debugPrint('Leaderboard First Page', leaderboardFirstPage);
        assertDefined(leaderboardFirstPage, 'leaderboardFirstPage');
        assertDefined(leaderboardFirstPage.meta, 'leaderboardFirstPage.meta');
        assert.equal(
          typeof leaderboardFirstPage.meta.hasMore,
          'boolean',
          'meta.hasMore should be boolean',
        );
        assertArray(
          leaderboardFirstPage.participants,
          'leaderboardFirstPage.participants',
        );
      });

      void test('second page is reachable when first page has more results', async () => {
        const firstPage = await client.getPaginatedLeaderboard({
          rankType: 'roi',
          startCursor: undefined,
          contestId: TEST_CONTEST_IDS.LEGACY,
          limit: 5,
        });

        if (!firstPage.meta.hasMore) {
          // Not enough data to paginate — test is trivially passing
          return;
        }

        const secondPage = await client.getPaginatedLeaderboard({
          rankType: 'roi',
          startCursor: firstPage.meta.nextCursor,
          contestId: TEST_CONTEST_IDS.LEGACY,
          limit: 5,
        });

        debugPrint('Leaderboard Second Page', secondPage);
        assertDefined(secondPage, 'leaderboardSecondPage');
        assertArray(
          secondPage.participants,
          'leaderboardSecondPage.participants',
        );
      });
    });

    void test('getLeaderboardRegistration returns registration or gracefully errors', async () => {
      try {
        const leaderboardRegistrationResult =
          await client.getLeaderboardRegistration({
            contestId: TEST_CONTEST_IDS.REGISTRATION,
            subaccountName: subaccount.subaccountName,
            subaccountOwner: subaccount.subaccountOwner,
          });

        debugPrint(
          'Leaderboard registration result',
          leaderboardRegistrationResult,
        );
        assertDefined(
          leaderboardRegistrationResult,
          'leaderboardRegistrationResult',
        );
      } catch (e: unknown) {
        // Registration may not exist — this is a valid state on testnet
        const serverError = getServerError(e);
        debugPrint('Failed to query leaderboard registration', serverError);
        assert.ok(serverError != null, 'server error should be present');
      }
    });
  },
);
