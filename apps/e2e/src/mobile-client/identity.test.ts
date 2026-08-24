import {
  MOBILE_DISPLAY_NAME_PATTERN,
  MOBILE_ERROR_CODES,
  MobilePublicProfile,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertBoolean,
  assertDefined,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_SECONDARY_SUBACCOUNT_NAME,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: identity',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('reports availability for a well-formed display name', async () => {
      const displayName = `Probe${Date.now()}`;
      assert.match(
        displayName,
        MOBILE_DISPLAY_NAME_PATTERN,
        'test display name should satisfy the 3-20 char display name rules',
      );
      const result = await tc.mobile.getUsernameAvailability({ displayName });
      debugPrint('Username availability result', result);

      assertDefined(result, 'availabilityResult');
      assertString(result.username, 'availabilityResult.username');
      assertBoolean(result.available, 'availabilityResult.available');
    });

    void test('rejects a malformed display name with INVALID_DISPLAY_NAME', async () => {
      await assertRejectsWithMobileErrorCode(
        () => tc.mobile.getUsernameAvailability({ displayName: '!!' }),
        MOBILE_ERROR_CODES.INVALID_DISPLAY_NAME,
      );
    });

    // setUsername upserts, so one test covers both claiming a first username and renaming an existing one:
    // whichever state the shared test subaccount is already in, the same call applies.
    void test('sets the display name and restores any original', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await getTestSubaccountProfile(tc);
      const originalDisplayName = identity.displayName;
      debugPrint('Identity before set', identity);

      const newDisplayName = `E2E_${Date.now()}`;
      assert.match(newDisplayName, MOBILE_DISPLAY_NAME_PATTERN);

      await tc.mobile.setUsername({
        ...identityParams,
        displayName: newDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const updatedIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after set', updatedIdentity);
      assert.equal(updatedIdentity.displayName, newDisplayName);
      assert.equal(updatedIdentity.username, newDisplayName.toLowerCase());

      if (originalDisplayName === null) {
        // A username cannot be released once claimed, so there is nothing to restore on a first claim.
        return;
      }

      await tc.mobile.setUsername({
        ...identityParams,
        displayName: originalDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after restore', restoredIdentity);
      assert.equal(restoredIdentity.displayName, originalDisplayName);
    });

    void test('rejects a name held by another subaccount with USERNAME_UNAVAILABLE', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await getTestSubaccountProfile(tc);
      const { displayName } = identity;

      if (displayName === null) {
        // No claimed name on this environment yet, so there is nothing to collide with.
        return;
      }

      // Usernames are unique across all identities, so a second subaccount of the same owner cannot take a
      // name the default subaccount already holds. Signing still works because the owner is unchanged.
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.setUsername({
            ...identityParams,
            subaccountName: TEST_SECONDARY_SUBACCOUNT_NAME,
            displayName,
          }),
        MOBILE_ERROR_CODES.USERNAME_UNAVAILABLE,
      );
    });

    // Private Mode works before a username is claimed, so this needs no claimed-identity branch.
    void test('toggles private mode and restores the original value', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await getTestSubaccountProfile(tc);

      const originalPrivateMode = identity.privateMode;

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: !originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const toggledIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after private mode toggle', toggledIdentity);
      assert.equal(toggledIdentity.privateMode, !originalPrivateMode);

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after private mode restore', restoredIdentity);
      assert.equal(restoredIdentity.privateMode, originalPrivateMode);
    });
  },
);

/**
 * Reads the shared test subaccount's profile to verify what an identity write landed. Profiles are only
 * readable in batches, so this asks for a single slot and unwraps it; profiles.test.ts covers the batching
 * and the includes themselves.
 */
async function getTestSubaccountProfile(
  tc: RunContext,
): Promise<MobilePublicProfile> {
  const [profile] = await tc.mobile.getProfiles({
    subaccounts: [
      {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      },
    ],
  });
  assertDefined(profile, 'profile');
  return profile;
}
