import {
  MOBILE_ERROR_CODES,
  MOBILE_PROFILE_SEARCH_MAX_ENRICHED_PAGE_SIZE,
  MOBILE_PROFILE_SEARCH_MAX_PAGE_SIZE,
  MOBILE_PROFILE_SEARCH_QUERY_PATTERN,
  MobileProfileSearchPage,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertBoolean,
  assertDefined,
  assertHexString,
  assertNonNegativeInteger,
  assertNullableString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { assertMobileFollowSummaryShape } from '../utils/shapeAssertions';
import {
  TEST_DELAYS,
  TEST_ISOLATED_SUBACCOUNT_NAME,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

// Which usernames exist is whatever other users and previous runs left behind, so the reads search a
// one-character prefix and assert shape and ordering invariants rather than specific accounts. The rejections
// fail validation before any database read.
const PREFIX = 'a';

void describe(
  '[mobile-client]: profile search',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('returns matches in ascending username order without follow data', async () => {
      const limit = 5;
      const page = await tc.mobile.searchProfiles({ query: PREFIX, limit });
      debugPrint('Profile search page', page);
      assertProfileSearchPageShape(page, PREFIX, limit);

      for (const profile of page.profiles) {
        // Neither include was requested, so the extras stay absent rather than arriving as null or 0.
        assert.equal(profile.followerCount, undefined);
        assert.equal(profile.followingCount, undefined);
        assert.equal(profile.followSummary, undefined);
      }
    });

    void test('continues strictly after the previous page, whatever the letter case of the query', async (context) => {
      const first = await tc.mobile.searchProfiles({ query: PREFIX, limit: 1 });
      debugPrint('First profile search page', first);
      if (first.nextCursor === null) {
        context.skip('fewer than two usernames start with the prefix');
        return;
      }

      await delay(TEST_DELAYS.SHORT);
      // Only letter case may differ from the query the cursor was issued for.
      const second = await tc.mobile.searchProfiles({
        query: PREFIX.toUpperCase(),
        cursor: first.nextCursor,
        limit: 1,
      });
      debugPrint('Second profile search page', second);
      assertProfileSearchPageShape(second, PREFIX, 1);

      const previousUsername = first.profiles[0].username;
      const nextUsername = second.profiles[0].username;
      assert.ok(
        previousUsername !== null && nextUsername !== null,
        'search pages should only hold claimed usernames',
      );
      assert.ok(
        nextUsername > previousUsername,
        `second page should continue after ${previousUsername}, instead got ${nextUsername}`,
      );
    });

    void test('adds follower totals and a viewer-relative follow summary when requested', async (context) => {
      const page = await tc.mobile.searchProfiles({
        query: PREFIX,
        limit: 1,
        include: {
          followCounts: true,
          followSummary: {
            viewAs: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            },
          },
        },
      });
      debugPrint('Enriched profile search page', page);
      assertProfileSearchPageShape(page, PREFIX, 1);
      if (page.profiles.length === 0) {
        context.skip('no username starts with the prefix');
        return;
      }

      const [profile] = page.profiles;
      assertNonNegativeInteger(profile.followerCount, 'profile.followerCount');
      assertNonNegativeInteger(
        profile.followingCount,
        'profile.followingCount',
      );
      assertDefined(profile.followSummary, 'profile.followSummary');
      assertMobileFollowSummaryShape(
        profile.followSummary,
        'profile.followSummary',
      );
    });

    void test('rejects a query outside the username alphabet with INVALID_PROFILE_SEARCH_REQUEST', async () => {
      const query = 'not a username';
      // The exported pattern lets callers reject the same input before spending a request on it.
      assert.equal(MOBILE_PROFILE_SEARCH_QUERY_PATTERN.test(query), false);
      await assertRejectsWithMobileErrorCode(
        () => tc.mobile.searchProfiles({ query }),
        MOBILE_ERROR_CODES.INVALID_PROFILE_SEARCH_REQUEST,
      );
    });

    void test('rejects an oversized page limit with INVALID_PROFILE_SEARCH_REQUEST', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.searchProfiles({
            query: PREFIX,
            limit: MOBILE_PROFILE_SEARCH_MAX_PAGE_SIZE + 1,
          }),
        MOBILE_ERROR_CODES.INVALID_PROFILE_SEARCH_REQUEST,
      );
    });

    void test('caps an enriched page at the profiles batch maximum', async () => {
      // The same limit is fine without an include, so this is the include lowering the ceiling.
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.searchProfiles({
            query: PREFIX,
            limit: MOBILE_PROFILE_SEARCH_MAX_ENRICHED_PAGE_SIZE + 1,
            include: { followCounts: true },
          }),
        MOBILE_ERROR_CODES.INVALID_PROFILE_SEARCH_REQUEST,
      );
    });

    void test('rejects a malformed cursor with INVALID_PROFILE_SEARCH_CURSOR', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.searchProfiles({
            query: PREFIX,
            cursor: 'not-a-search-cursor',
          }),
        MOBILE_ERROR_CODES.INVALID_PROFILE_SEARCH_CURSOR,
      );
    });

    void test('rejects an isolated follow summary viewer with PROFILE_NOT_FOUND', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.searchProfiles({
            query: PREFIX,
            include: {
              followSummary: {
                viewAs: {
                  subaccountOwner: tc.walletClientAddress,
                  subaccountName: TEST_ISOLATED_SUBACCOUNT_NAME,
                },
              },
            },
          }),
        MOBILE_ERROR_CODES.PROFILE_NOT_FOUND,
      );
    });
  },
);

/**
 * Asserts the invariants every search page shares: at most `requestedLimit` claimed profiles whose usernames
 * start with the prefix, in strictly ascending order, with a cursor only when the page was full.
 */
function assertProfileSearchPageShape(
  page: MobileProfileSearchPage,
  prefix: string,
  requestedLimit: number,
) {
  assert.ok(Array.isArray(page.profiles), 'page.profiles should be an array');
  assert.ok(
    page.profiles.length <= requestedLimit,
    `page should respect the requested limit of ${requestedLimit}`,
  );
  assert.ok(
    page.nextCursor === null || typeof page.nextCursor === 'string',
    'page.nextCursor should be a string or null',
  );
  if (page.profiles.length < requestedLimit) {
    // The backend reads one row past the limit to decide, so a short page is always the last one.
    assert.equal(page.nextCursor, null, 'a short page should be the last page');
  }

  let previousUsername: string | undefined;
  for (const [index, profile] of page.profiles.entries()) {
    const label = `page.profiles[${index}]`;
    assertHexString(profile.subaccount, `${label}.subaccount`);
    // Only claimed identities match, so unlike a profiles lookup the username is never null here.
    const { username } = profile;
    assert.ok(
      username !== null,
      `${label}.username should be a claimed username`,
    );
    assert.ok(
      username.startsWith(prefix.toLowerCase()),
      `${label}.username should start with ${prefix}, instead got ${username}`,
    );
    assertNullableString(profile.displayName, `${label}.displayName`);
    assertBoolean(profile.privateMode, `${label}.privateMode`);
    if (previousUsername !== undefined) {
      assert.ok(
        username > previousUsername,
        `${label}.username should sort after ${previousUsername}`,
      );
    }
    previousUsername = username;
  }
}
