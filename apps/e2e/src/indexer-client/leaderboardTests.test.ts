import {
  type IndexerClient,
  type IndexerLeaderboardContest,
  type IndexerLeaderboardParticipant,
  type IndexerLeaderboardRegistration,
} from '@nadohq/indexer-client';
import { Subaccount } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertBigNumberFinite,
  assertBoolean,
  assertDefined,
  assertNumber,
  assertPaginatedResponse,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getServerError } from '../utils/getServerError';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_CONTEST_ID,
  TEST_DELAYS,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

function assertLeaderboardParticipantShape(
  participant: IndexerLeaderboardParticipant,
  label: string,
) {
  assertDefined(participant.subaccount, `${label}.subaccount`);
  assertNumber(participant.contestId, `${label}.contestId`);
  assertBigNumberFinite(participant.pnl, `${label}.pnl`);
  assertBigNumberFinite(participant.pnlRank, `${label}.pnlRank`);
  assertBigNumberFinite(participant.percentRoi, `${label}.percentRoi`);
  assertBigNumberFinite(participant.roiRank, `${label}.roiRank`);
  assertBigNumberFinite(participant.accountValue, `${label}.accountValue`);
  assertBigNumberFinite(participant.volume, `${label}.volume`);
  assertBigNumberFinite(participant.volumeRank, `${label}.volumeRank`);
  assertBigNumberFinite(participant.updateTime, `${label}.updateTime`);
}

function assertLeaderboardContestShape(
  contest: IndexerLeaderboardContest,
  label: string,
) {
  assertNumber(contest.contestId, `${label}.contestId`);
  assertBigNumberFinite(contest.startTime, `${label}.startTime`);
  assertBigNumberFinite(contest.endTime, `${label}.endTime`);
  assertBigNumberFinite(contest.period, `${label}.period`);
  assertBigNumberFinite(
    contest.totalParticipants,
    `${label}.totalParticipants`,
  );
  assertBigNumberFinite(
    contest.minRequiredAccountValue,
    `${label}.minRequiredAccountValue`,
  );
  assertBigNumberFinite(
    contest.minRequiredVolume,
    `${label}.minRequiredVolume`,
  );
  assertArray(contest.requiredProductIds, `${label}.requiredProductIds`);
  assertBoolean(contest.active, `${label}.active`);
  assertBigNumberFinite(contest.lastUpdated, `${label}.lastUpdated`);
}

function assertRegistrationShape(
  registration: IndexerLeaderboardRegistration,
  label: string,
) {
  assertDefined(registration.subaccount, `${label}.subaccount`);
  assertNumber(registration.contestId, `${label}.contestId`);
  assertBigNumberFinite(registration.updateTime, `${label}.updateTime`);
}

void describe(
  '[indexer-client]: leaderboard queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;
    let subaccount: Subaccount;
    let endpointAddr: string;
    let chainId: number;

    before(async () => {
      await delay(TEST_DELAYS.BETWEEN_SUITES);

      const tc = createTestContext();
      client = tc.indexer;
      subaccount = {
        subaccountName: 'default',
        subaccountOwner: tc.walletClientAddress,
      };
      endpointAddr = tc.endpointAddr;
      chainId = tc.chainId;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.BETWEEN_TESTS);
    });

    void test('getLeaderboard returns valid participants', async () => {
      const result = await client.getLeaderboard({
        limit: 5,
        contestId: TEST_CONTEST_ID,
        rankType: 'pnl',
      });

      debugPrint('Leaderboard', result);
      assertDefined(result, 'result');
      assertArray(result.participants, 'participants');
      assertArrayElements(
        result.participants,
        (p, label) => assertLeaderboardParticipantShape(p, label),
        'participants',
      );
      assert.ok(
        result.participants.length <= 5,
        'should return at most limit items',
      );
    });

    void test('getLeaderboardParticipant returns per-contest data', async () => {
      const result = await client.getLeaderboardParticipant({
        subaccount,
        contestIds: [TEST_CONTEST_ID],
      });

      debugPrint('Leaderboard Participant', result);
      assertDefined(result, 'result');
      assertDefined(result.participant, 'participant');

      for (const [contestId, position] of Object.entries(result.participant)) {
        assertLeaderboardParticipantShape(
          position,
          `participant[${contestId}]`,
        );
      }
    });

    void test('getLeaderboardContests returns valid contest metadata', async () => {
      const result = await client.getLeaderboardContests({
        contestIds: [TEST_CONTEST_ID],
      });

      debugPrint('Leaderboard Contests', result);
      assertDefined(result, 'result');
      assertArray(result.contests, 'contests');
      assertArrayElements(
        result.contests,
        (c, label) => assertLeaderboardContestShape(c, label),
        'contests',
      );
    });

    void test('getLeaderboardContests with empty contestIds returns all active', async () => {
      const result = await client.getLeaderboardContests({
        contestIds: [],
      });

      debugPrint('All Active Leaderboard Contests', result);
      assertDefined(result, 'result');
      assertArray(result.contests, 'contests');

      for (const contest of result.contests) {
        assert.equal(
          contest.active,
          true,
          'all returned contests should be active',
        );
      }
    });

    void test('getLeaderboardContests with active=false includes inactive', async () => {
      const result = await client.getLeaderboardContests({
        contestIds: [],
        active: false,
      });

      debugPrint('All Leaderboard Contests (including inactive)', result);
      assertDefined(result, 'result');
      assertArray(result.contests, 'contests');
      assertArrayElements(
        result.contests,
        (c, label) => assertLeaderboardContestShape(c, label),
        'contests',
      );
    });

    void test('getPaginatedLeaderboard paginates correctly', async () => {
      const firstPage = await client.getPaginatedLeaderboard({
        rankType: 'roi',
        contestId: TEST_CONTEST_ID,
        limit: 5,
      });

      debugPrint('Leaderboard First Page', firstPage);
      assertPaginatedResponse(firstPage, 'firstPage');
      assertArray(firstPage.participants, 'firstPage.participants');
      assert.ok(
        firstPage.participants.length <= 5,
        'first page should return at most limit items',
      );

      if (firstPage.meta.hasMore) {
        assertDefined(firstPage.meta.nextCursor, 'firstPage.meta.nextCursor');

        const secondPage = await client.getPaginatedLeaderboard({
          rankType: 'roi',
          startCursor: firstPage.meta.nextCursor,
          contestId: TEST_CONTEST_ID,
          limit: 5,
        });

        debugPrint('Leaderboard Second Page', secondPage);
        assertPaginatedResponse(secondPage, 'secondPage');
        assertArray(secondPage.participants, 'secondPage.participants');
      }
    });

    void test('registerLeaderboard succeeds and returns registrations', async () => {
      try {
        const result = await client.registerLeaderboard({
          contestIds: [TEST_CONTEST_ID],
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
          registration: {
            verifyingAddr: endpointAddr,
            chainId,
          },
        });

        debugPrint('Register leaderboard result', result);
        assertDefined(result, 'result');
        assertArray(result.registrations, 'registrations');
        assertArrayElements(
          result.registrations,
          (r, label) => assertRegistrationShape(r, label),
          'registrations',
        );
      } catch (e: unknown) {
        const serverError = getServerError(e);
        debugPrint('registerLeaderboard error', serverError);
        assert.ok(
          serverError != null,
          'server error should be present on failure',
        );
      }
    });

    void test('getLeaderboardRegistrations returns registrations', async () => {
      const result = await client.getLeaderboardRegistrations({
        subaccount,
        contestIds: [TEST_CONTEST_ID],
      });

      debugPrint('Leaderboard registrations result', result);
      assertDefined(result, 'result');
      assertArray(result.registrations, 'registrations');
      assertArrayElements(
        result.registrations,
        (r, label) => assertRegistrationShape(r, label),
        'registrations',
      );
    });
  },
);
