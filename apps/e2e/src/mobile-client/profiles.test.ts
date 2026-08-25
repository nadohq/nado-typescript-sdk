import {
  MOBILE_ERROR_CODES,
  MOBILE_PROFILES_MAX_BATCH_SIZE,
  MobilePublicProfile,
} from '@nadohq/mobile-client';
import { subaccountToHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
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
  TEST_SECONDARY_SUBACCOUNT_NAME,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

// This is the only route that returns follower totals or a follow summary, so it covers both includes here.
// It is unsigned, so no signature params are involved even for the viewer-relative follow summary.
void describe(
  '[mobile-client]: profiles',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('returns base fields for a batch, in the requested order', async () => {
      const subaccounts = [
        {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
        {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SECONDARY_SUBACCOUNT_NAME,
        },
      ];
      const profiles = await tc.mobile.getProfiles({ subaccounts });
      debugPrint('Profiles batch', profiles);

      assert.equal(profiles.length, subaccounts.length);
      assert.deepEqual(
        profiles.map((profile) => profile.subaccount),
        subaccounts.map(subaccountToHex),
        'profiles should come back in the requested order',
      );
      for (const [index, profile] of profiles.entries()) {
        assertBaseProfileShape(profile, `profiles[${index}]`);
        // Neither include was requested, so all three extras stay absent rather than arriving as null or 0.
        assert.equal(profile.followerCount, undefined);
        assert.equal(profile.followingCount, undefined);
        assert.equal(profile.followSummary, undefined);
      }
    });

    void test('adds follower totals when follow counts are requested', async () => {
      const profiles = await tc.mobile.getProfiles({
        subaccounts: [
          {
            subaccountOwner: tc.walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
          },
        ],
        include: { followCounts: true },
      });
      debugPrint('Profiles with follow counts', profiles);

      const [profile] = profiles;
      assertBaseProfileShape(profile, 'profile');
      assertNonNegativeInteger(profile.followerCount, 'profile.followerCount');
      assertNonNegativeInteger(
        profile.followingCount,
        'profile.followingCount',
      );
      // Asking only for counts must not pull in the summary.
      assert.equal(profile.followSummary, undefined);
    });

    void test('adds a viewer-relative follow summary when requested', async () => {
      const profiles = await tc.mobile.getProfiles({
        subaccounts: [
          {
            subaccountOwner: tc.walletClientAddress,
            subaccountName: TEST_SECONDARY_SUBACCOUNT_NAME,
          },
        ],
        include: {
          followSummary: {
            viewAs: {
              subaccountOwner: tc.walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            },
          },
        },
      });
      debugPrint('Profiles with follow summary', profiles);

      const [profile] = profiles;
      assertBaseProfileShape(profile, 'profile');
      assertDefined(profile.followSummary, 'profile.followSummary');
      assertMobileFollowSummaryShape(
        profile.followSummary,
        'profile.followSummary',
      );
      // Asking only for the summary must not pull in the counts.
      assert.equal(profile.followerCount, undefined);
    });

    void test('resolves a subaccount that has never claimed a username', async () => {
      const [profile] = await tc.mobile.getProfiles({
        subaccounts: [
          {
            subaccountOwner: privateKeyToAccount(generatePrivateKey()).address,
            subaccountName: TEST_SUBACCOUNT_NAME,
          },
        ],
        include: { followCounts: true },
      });
      debugPrint('Profile for an unclaimed subaccount', profile);

      // A subaccount with no identity row still occupies its slot rather than being omitted.
      assert.equal(profile.username, null);
      assert.equal(profile.displayName, null);
      assert.equal(profile.privateMode, false);
      assert.equal(profile.followerCount, 0);
      assert.equal(profile.followingCount, 0);
    });

    void test('rejects an empty batch with INVALID_PROFILES_REQUEST', async () => {
      await assertRejectsWithMobileErrorCode(
        () => tc.mobile.getProfiles({ subaccounts: [] }),
        MOBILE_ERROR_CODES.INVALID_PROFILES_REQUEST,
      );
    });

    void test('rejects duplicate subaccounts with INVALID_PROFILES_REQUEST', async () => {
      const subaccount = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      };
      // Duplicates are rejected rather than deduplicated, so callers must dedupe before asking.
      await assertRejectsWithMobileErrorCode(
        () => tc.mobile.getProfiles({ subaccounts: [subaccount, subaccount] }),
        MOBILE_ERROR_CODES.INVALID_PROFILES_REQUEST,
      );
    });

    void test('rejects an oversized batch with INVALID_PROFILES_REQUEST', async () => {
      // Distinct owners keep this a size rejection rather than a duplicate rejection.
      const subaccounts = Array.from(
        { length: MOBILE_PROFILES_MAX_BATCH_SIZE + 1 },
        () => ({
          subaccountOwner: privateKeyToAccount(generatePrivateKey()).address,
          subaccountName: TEST_SUBACCOUNT_NAME,
        }),
      );
      await assertRejectsWithMobileErrorCode(
        () => tc.mobile.getProfiles({ subaccounts }),
        MOBILE_ERROR_CODES.INVALID_PROFILES_REQUEST,
      );
    });

    void test('rejects an isolated batch member with PROFILE_NOT_FOUND', async () => {
      // One isolated member fails the whole batch; the valid entries are not returned alongside it.
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.getProfiles({
            subaccounts: [
              {
                subaccountOwner: tc.walletClientAddress,
                subaccountName: TEST_SUBACCOUNT_NAME,
              },
              {
                subaccountOwner: tc.walletClientAddress,
                subaccountName: TEST_ISOLATED_SUBACCOUNT_NAME,
              },
            ],
          }),
        MOBILE_ERROR_CODES.PROFILE_NOT_FOUND,
      );
    });

    void test('rejects an isolated follow summary viewer with PROFILE_NOT_FOUND', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.getProfiles({
            subaccounts: [
              {
                subaccountOwner: tc.walletClientAddress,
                subaccountName: TEST_SUBACCOUNT_NAME,
              },
            ],
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
 * Asserts the fields every profile carries regardless of which includes were requested.
 */
function assertBaseProfileShape(
  profile: MobilePublicProfile,
  label: string,
): void {
  assertHexString(profile.subaccount, `${label}.subaccount`);
  assertNullableString(profile.username, `${label}.username`);
  assertNullableString(profile.displayName, `${label}.displayName`);
  assertBoolean(profile.privateMode, `${label}.privateMode`);
}
