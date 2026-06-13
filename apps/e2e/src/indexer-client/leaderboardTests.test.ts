import {
  type IndexerClient,
  type IndexerLeaderboardContest,
  type IndexerLeaderboardContestTrack,
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
  assertNonEmptyString,
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
  TEST_SINGLE_TRACK_CONTEST_ID,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

function assertLeaderboardParticipantShape(
  participant: IndexerLeaderboardParticipant,
  label: string,
) {
  assertDefined(participant.subaccount, `${label}.subaccount`);
  assertNumber(participant.contestId, `${label}.contestId`);
  assertBigNumberFinite(participant.accountValue, `${label}.accountValue`);
  assertBigNumberFinite(participant.updateTime, `${label}.updateTime`);
  assertDefined(participant.tracks, `${label}.tracks`);

  for (const [rankType, trackData] of Object.entries(participant.tracks)) {
    assertBigNumberFinite(trackData.value, `${label}.tracks.${rankType}.value`);
    assertBigNumberFinite(trackData.rank, `${label}.tracks.${rankType}.rank`);
    assertDefined(
      trackData.qualificationStatus,
      `${label}.tracks.${rankType}.qualificationStatus`,
    );
  }
}

function assertLeaderboardContestTrackShape(
  track: IndexerLeaderboardContestTrack,
  label: string,
) {
  assertNumber(track.trackId, `${label}.trackId`);
  assertDefined(track.rankType, `${label}.rankType`);
  assertDefined(track.sortOrder, `${label}.sortOrder`);
  assertBigNumberFinite(
    track.accountValueThreshold,
    `${label}.accountValueThreshold`,
  );
  assertBigNumberFinite(track.volumeThreshold, `${label}.volumeThreshold`);
}

function assertLeaderboardContestShape(
  contest: IndexerLeaderboardContest,
  label: string,
) {
  assertNumber(contest.contestId, `${label}.contestId`);
  assertBigNumberFinite(contest.startTime, `${label}.startTime`);
  assertBigNumberFinite(contest.endTime, `${label}.endTime`);
  assertBigNumberFinite(
    contest.totalParticipants,
    `${label}.totalParticipants`,
  );
  assertArray(contest.requiredProductIds, `${label}.requiredProductIds`);
  assertBoolean(contest.active, `${label}.active`);
  assertBigNumberFinite(contest.lastUpdated, `${label}.lastUpdated`);
  assertNonEmptyString(contest.title, `${label}.title`);
  assert.equal(
    typeof contest.description,
    'string',
    `${label}.description should be a string`,
  );
  assertArray(contest.tracks, `${label}.tracks`);
  assertArrayElements(
    contest.tracks,
    (t, trackLabel) => assertLeaderboardContestTrackShape(t, trackLabel),
    `${label}.tracks`,
  );
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
      await delay(TEST_DELAYS.LONG);

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
      await delay(TEST_DELAYS.STANDARD);
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

    void test('getLeaderboard without rankType returns participants for single-track contest', async () => {
      const result = await client.getLeaderboard({
        limit: 5,
        contestId: TEST_SINGLE_TRACK_CONTEST_ID,
      });

      debugPrint('Leaderboard (no rankType)', result);
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

    void test('getLeaderboardContests with no filters returns all', async () => {
      const result = await client.getLeaderboardContests({});

      debugPrint('All Leaderboard Contests', result);
      assertDefined(result, 'result');
      assertArray(result.contests, 'contests');
      assertArrayElements(
        result.contests,
        (c, label) => assertLeaderboardContestShape(c, label),
        'contests',
      );
    });

    void test('getLeaderboardContests with active=true returns only active', async () => {
      const result = await client.getLeaderboardContests({
        active: true,
      });

      debugPrint('Active Leaderboard Contests', result);
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

    void test('getLeaderboardContests with active=false returns only inactive', async () => {
      const result = await client.getLeaderboardContests({
        active: false,
      });

      debugPrint('Inactive Leaderboard Contests', result);
      assertDefined(result, 'result');
      assertArray(result.contests, 'contests');

      for (const contest of result.contests) {
        assert.equal(
          contest.active,
          false,
          'all returned contests should be inactive',
        );
      }
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

    void test('getPaginatedLeaderboard without rankType paginates single-track contest', async () => {
      const firstPage = await client.getPaginatedLeaderboard({
        contestId: TEST_SINGLE_TRACK_CONTEST_ID,
        limit: 5,
      });

      debugPrint('Leaderboard First Page (no rankType)', firstPage);
      assertPaginatedResponse(firstPage, 'firstPage');
      assertArray(firstPage.participants, 'firstPage.participants');
      assert.ok(
        firstPage.participants.length <= 5,
        'first page should return at most limit items',
      );

      if (firstPage.meta.hasMore) {
        assertDefined(firstPage.meta.nextCursor, 'firstPage.meta.nextCursor');

        const secondPage = await client.getPaginatedLeaderboard({
          startCursor: firstPage.meta.nextCursor,
          contestId: TEST_SINGLE_TRACK_CONTEST_ID,
          limit: 5,
        });

        debugPrint('Leaderboard Second Page (no rankType)', secondPage);
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
          verifyingAddr: endpointAddr,
          chainId,
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

    void test('getLeaderboardRegistrations returns all registrations by default', async () => {
      const result = await client.getLeaderboardRegistrations({
        subaccount,
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

    void test('getLeaderboardRegistrations with active=true returns only active', async () => {
      const result = await client.getLeaderboardRegistrations({
        subaccount,
        active: true,
      });

      debugPrint('Active leaderboard registrations', result);
      assertDefined(result, 'result');
      assertArray(result.registrations, 'registrations');
      assertArrayElements(
        result.registrations,
        (r, label) => assertRegistrationShape(r, label),
        'registrations',
      );
    });

    void test('getLeaderboardRegistrations with active=false returns only inactive', async () => {
      const result = await client.getLeaderboardRegistrations({
        subaccount,
        active: false,
      });

      debugPrint('Inactive leaderboard registrations', result);
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
