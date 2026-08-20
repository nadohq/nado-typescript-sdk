import {
  MOBILE_ERROR_CODES,
  MOBILE_FOLLOW_LIST_MAX_PAGE_SIZE,
  MOBILE_FOLLOWED_BY_MAX_LIMIT,
  MobileFollowListPage,
  MobileIdentitySummary,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertArrayElements,
  assertBoolean,
  assertHexString,
  assertNonNegativeInteger,
  assertNullableString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_ISOLATED_SUBACCOUNT_NAME,
  TEST_SECONDARY_SUBACCOUNT_NAME,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

// The graph is read-only in this suite: the follow relationships of the shared test subaccount are whatever
// previous runs and other environments left behind, so assertions cover shape and invariants rather than
// specific accounts. Mutations are limited to rejected requests, which fail validation before any write.
void describe(
  '[mobile-client]: follow',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('reads a follow summary for another profile', async () => {
      const summary = await tc.mobile.getFollowSummary({
        ...getMobileSignedParams(tc),
        target: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SECONDARY_SUBACCOUNT_NAME,
        },
      });
      debugPrint('Follow summary', summary);

      assertBoolean(summary.isFollowing, 'summary.isFollowing');
      assertNonNegativeInteger(
        summary.followedByCount,
        'summary.followedByCount',
      );
      assertArrayElements(
        summary.followedBy,
        assertIdentitySummaryShape,
        'summary.followedBy',
      );
      // The preview is capped by the requested limit, but the count covers the whole intersection.
      assert.ok(
        summary.followedBy.length <= summary.followedByCount,
        'preview should never exceed the exact followed-by count',
      );
    });

    void test('returns the followed-by count alone for a zero preview limit', async () => {
      const summary = await tc.mobile.getFollowSummary({
        ...getMobileSignedParams(tc),
        target: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SECONDARY_SUBACCOUNT_NAME,
        },
        followedByLimit: 0,
      });
      debugPrint('Follow summary with no preview', summary);

      assert.deepEqual(summary.followedBy, []);
      assertNonNegativeInteger(
        summary.followedByCount,
        'summary.followedByCount',
      );
    });

    void test('fetches a page of followers', async () => {
      const limit = 5;
      const page = await tc.mobile.getFollowers({
        ...getMobileSignedParams(tc),
        target: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
        limit,
      });
      debugPrint('Followers page', page);
      assertFollowListPageShape(page, limit);
    });

    void test('fetches a page of following', async () => {
      const limit = 5;
      const page = await tc.mobile.getFollowing({
        ...getMobileSignedParams(tc),
        target: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
        limit,
      });
      debugPrint('Following page', page);
      assertFollowListPageShape(page, limit);

      // Reading your own Following list makes every row familiar by definition.
      for (const account of page.accounts) {
        assert.equal(
          account.isFollowing,
          true,
          'every row of your own Following list should be familiar',
        );
      }
    });

    void test('rejects a self-follow with INVALID_FOLLOW_TARGET', async () => {
      const signedParams = getMobileSignedParams(tc);
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.setFollow({
            ...signedParams,
            target: {
              subaccountOwner: signedParams.subaccountOwner,
              subaccountName: signedParams.subaccountName,
            },
            isFollowing: true,
          }),
        MOBILE_ERROR_CODES.INVALID_FOLLOW_TARGET,
      );
    });

    void test('rejects an isolated target with PROFILE_NOT_FOUND', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.getFollowers({
            ...getMobileSignedParams(tc),
            target: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_ISOLATED_SUBACCOUNT_NAME,
            },
          }),
        MOBILE_ERROR_CODES.PROFILE_NOT_FOUND,
      );
    });

    void test('rejects a malformed cursor with INVALID_FOLLOW_CURSOR', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.getFollowers({
            ...getMobileSignedParams(tc),
            target: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            },
            cursor: 'not-a-follow-cursor',
          }),
        MOBILE_ERROR_CODES.INVALID_FOLLOW_CURSOR,
      );
    });

    void test('rejects an oversized page limit with INVALID_FOLLOW_LIMIT', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.getFollowing({
            ...getMobileSignedParams(tc),
            target: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            },
            limit: MOBILE_FOLLOW_LIST_MAX_PAGE_SIZE + 1,
          }),
        MOBILE_ERROR_CODES.INVALID_FOLLOW_LIMIT,
      );
    });

    void test('rejects an oversized followed-by limit with INVALID_FOLLOW_LIMIT', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.getFollowSummary({
            ...getMobileSignedParams(tc),
            target: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_SECONDARY_SUBACCOUNT_NAME,
            },
            followedByLimit: MOBILE_FOLLOWED_BY_MAX_LIMIT + 1,
          }),
        MOBILE_ERROR_CODES.INVALID_FOLLOW_LIMIT,
      );
    });
  },
);

/**
 * Asserts the shape of a Followers or Following page and each of its rows.
 */
function assertFollowListPageShape(
  page: MobileFollowListPage,
  requestedLimit: number,
): void {
  assert.ok(
    page.nextCursor === null || typeof page.nextCursor === 'string',
    'page.nextCursor should be a string or null',
  );
  assertArrayElements(
    page.accounts,
    (account, label) => {
      assertIdentitySummaryShape(account.identity, `${label}.identity`);
      assertBoolean(account.isFollowing, `${label}.isFollowing`);
      assertNonNegativeInteger(account.followerCount, `${label}.followerCount`);
    },
    'page.accounts',
  );
  assert.ok(
    page.accounts.length <= requestedLimit,
    `page should respect the requested limit of ${requestedLimit}`,
  );
}

/**
 * Asserts the shape of an identity summary. Name fields are null until a username is claimed, and `avatarUrl`
 * is null until avatar ownership exists on the backend.
 */
function assertIdentitySummaryShape(
  identity: MobileIdentitySummary,
  label: string,
): void {
  assertHexString(identity.subaccount, `${label}.subaccount`);
  assertNullableString(identity.username, `${label}.username`);
  assertNullableString(identity.displayName, `${label}.displayName`);
  assertNullableString(identity.avatarUrl, `${label}.avatarUrl`);
}
