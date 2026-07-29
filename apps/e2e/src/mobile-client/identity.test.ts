import {
  MOBILE_DISPLAY_NAME_PATTERN,
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  assertBoolean,
  assertDefined,
  assertHexString,
  assertNullableString,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_ISOLATED_SUBACCOUNT_NAME,
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
      await assertRejectsWithErrorCode(
        () => tc.mobile.getUsernameAvailability({ displayName: '!!' }),
        MOBILE_ERROR_CODES.INVALID_DISPLAY_NAME,
      );
    });

    void test('fetches the implicit self identity', async () => {
      const identity = await tc.mobile.getSelfIdentity(
        getMobileSignedParams(tc),
      );
      debugPrint('Self identity result', identity);

      // Every non-isolated subaccount has an implicit identity, so the test subaccount always resolves.
      assertDefined(identity, 'identity');
      assertHexString(identity.subaccount, 'identity.subaccount');
      assertBoolean(identity.privateMode, 'identity.privateMode');
      assertNullableString(identity.username, 'identity.username');
      assertNullableString(identity.displayName, 'identity.displayName');
    });

    void test('resolves a public profile for an unclaimed subaccount', async () => {
      // A freshly generated owner has never claimed a username, but its profile still resolves with null names.
      const profile = await tc.mobile.getPublicProfile({
        subaccountOwner: privateKeyToAccount(generatePrivateKey()).address,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });
      debugPrint('Public profile for an unclaimed subaccount', profile);

      assertHexString(profile.subaccount, 'profile.subaccount');
      assert.equal(profile.username, null);
      assert.equal(profile.displayName, null);
      assert.equal(profile.privateMode, false);
    });

    void test('returns PROFILE_NOT_FOUND for an isolated subaccount', async () => {
      await assertRejectsWithErrorCode(
        () =>
          tc.mobile.getPublicProfile({
            subaccountOwner: tc.walletClientAddress,
            subaccountName: TEST_ISOLATED_SUBACCOUNT_NAME,
          }),
        MOBILE_ERROR_CODES.PROFILE_NOT_FOUND,
      );
    });

    void test('claims a username only if unclaimed, tolerating a race to IDENTITY_ALREADY_CLAIMED', async () => {
      const identityParams = getMobileSignedParams(tc);

      const existingIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Existing identity before claim attempt', existingIdentity);

      if (existingIdentity?.username != null) {
        // Identity claims are permanent — never attempt to claim again once a username already exists.
        return;
      }

      const displayName = `E2E_${Date.now()}`;

      try {
        await tc.mobile.claimUsername({ ...identityParams, displayName });
      } catch (error) {
        if (
          error instanceof MobileServerFailureError &&
          error.errorCode === MOBILE_ERROR_CODES.IDENTITY_ALREADY_CLAIMED
        ) {
          // Another process claimed the identity between our check and this call — an acceptable race, not a failure.
          return;
        }
        throw error;
      }

      await delay(TEST_DELAYS.STANDARD);

      const claimedIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after claim', claimedIdentity);

      assertDefined(claimedIdentity, 'claimedIdentity');
      assert.equal(claimedIdentity.displayName, displayName);
    });

    void test('updates the display name and restores the original', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await tc.mobile.getSelfIdentity(identityParams);
      assertDefined(identity, 'identity');

      const originalDisplayName = identity.displayName;

      if (originalDisplayName === null) {
        // Renaming needs a claimed username; a name-less implicit identity is not enough.
        await assertRejectsWithErrorCode(
          () =>
            tc.mobile.updateUsername({
              ...identityParams,
              displayName: `E2E_${Date.now()}`,
            }),
          MOBILE_ERROR_CODES.IDENTITY_REQUIRED,
        );
        return;
      }

      const tempDisplayName = `E2E_${Date.now()}`;
      assert.match(tempDisplayName, MOBILE_DISPLAY_NAME_PATTERN);

      await tc.mobile.updateUsername({
        ...identityParams,
        displayName: tempDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const updatedIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after display name update', updatedIdentity);
      assertDefined(updatedIdentity, 'updatedIdentity');
      assert.equal(updatedIdentity.displayName, tempDisplayName);

      await tc.mobile.updateUsername({
        ...identityParams,
        displayName: originalDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after display name restore', restoredIdentity);
      assertDefined(restoredIdentity, 'restoredIdentity');
      assert.equal(restoredIdentity.displayName, originalDisplayName);
    });

    // Private Mode works before a username is claimed, so this needs no claimed-identity branch.
    void test('toggles private mode and restores the original value', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await tc.mobile.getSelfIdentity(identityParams);
      assertDefined(identity, 'identity');

      const originalPrivateMode = identity.privateMode;

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: !originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const toggledIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after private mode toggle', toggledIdentity);
      assertDefined(toggledIdentity, 'toggledIdentity');
      assert.equal(toggledIdentity.privateMode, !originalPrivateMode);

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after private mode restore', restoredIdentity);
      assertDefined(restoredIdentity, 'restoredIdentity');
      assert.equal(restoredIdentity.privateMode, originalPrivateMode);
    });
  },
);

/**
 * Asserts that the given operation rejects with a {@link MobileServerFailureError} carrying the expected
 * mobile service API error code.
 */
async function assertRejectsWithErrorCode(
  operation: () => Promise<unknown>,
  expectedErrorCode: number,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(
      error instanceof MobileServerFailureError,
      'should throw MobileServerFailureError',
    );
    assert.equal(error.errorCode, expectedErrorCode);
    return true;
  });
}
