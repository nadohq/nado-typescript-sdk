import {
  MOBILE_ERROR_CODES,
  MOBILE_FOLLOW_LIST_MAX_PAGE_SIZE,
  MobileFollowListPage,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertArrayElements,
  assertBoolean,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { assertMobileIdentitySummaryShape } from '../utils/shapeAssertions';
import {
  TEST_DELAYS,
  TEST_ISOLATED_SUBACCOUNT_NAME,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

// The graph is read-only in this suite: the follow relationships of the shared test subaccount are whatever
// previous runs and other environments left behind, so assertions cover shape and invariants rather than
// specific accounts. Mutations are limited to rejected requests, which fail validation before any write.
//
// The list reads are unsigned; only Set Follow still signs. The follow summary is not covered here: it
// arrives as an include on the batched profiles query. See profiles.test.ts.
void describe(
  '[mobile-client]: follow',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('fetches a page of followers without a viewer perspective', async () => {
      const limit = 5;
      const page = await tc.mobile.getFollowers({
        target: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
        limit,
      });
      debugPrint('Followers page', page);
      assertFollowListPageShape(page, limit);

      // Without `viewAs` there is no viewer to resolve the relationship against, so the backend omits the
      // field rather than reporting a misleading `false`.
      for (const account of page.accounts) {
        assert.equal(
          account.isFollowing,
          undefined,
          'a page read without viewAs should carry no isFollowing',
        );
      }
    });

    void test('fetches a page of followers as a viewer', async () => {
      const limit = 5;
      const viewer = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      };
      const page = await tc.mobile.getFollowers({
        target: viewer,
        viewAs: viewer,
        limit,
      });
      debugPrint('Followers page as viewer', page);
      assertFollowListPageShape(page, limit);

      for (const [index, account] of page.accounts.entries()) {
        assertBoolean(
          account.isFollowing,
          `page.accounts[${index}].isFollowing`,
        );
      }
    });

    void test('fetches a page of following as a viewer', async () => {
      const limit = 5;
      const viewer = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      };
      const page = await tc.mobile.getFollowing({
        target: viewer,
        viewAs: viewer,
        limit,
      });
      debugPrint('Following page as viewer', page);
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
            target: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_ISOLATED_SUBACCOUNT_NAME,
            },
          }),
        MOBILE_ERROR_CODES.PROFILE_NOT_FOUND,
      );
    });

    void test('rejects an isolated viewer with PROFILE_NOT_FOUND', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.getFollowers({
            target: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            },
            viewAs: {
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
            target: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            },
            limit: MOBILE_FOLLOW_LIST_MAX_PAGE_SIZE + 1,
          }),
        MOBILE_ERROR_CODES.INVALID_FOLLOW_LIMIT,
      );
    });
  },
);

/**
 * Asserts the shape every Followers or Following page carries regardless of whether a viewer was named;
 * `isFollowing` is checked per test because its presence is exactly what `viewAs` decides.
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
      assertMobileIdentitySummaryShape(account.identity, `${label}.identity`);
      assertNonNegativeInteger(account.followerCount, `${label}.followerCount`);
    },
    'page.accounts',
  );
  assert.ok(
    page.accounts.length <= requestedLimit,
    `page should respect the requested limit of ${requestedLimit}`,
  );
}
