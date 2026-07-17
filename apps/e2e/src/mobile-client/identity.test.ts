import {
  MOBILE_ERROR_CODE,
  MobileServerFailureError,
  MobileSignedRequestParams,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertBoolean,
  assertDefined,
  assertHexString,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

// Mirrors the backend display-name rules (3–20 ASCII, alphanumeric boundaries, `_`/`.` in the middle).
const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.]{1,18}[A-Za-z0-9]$/;

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
        DISPLAY_NAME_PATTERN,
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
        MOBILE_ERROR_CODE.INVALID_DISPLAY_NAME,
      );
    });

    void test('fetches self identity without throwing', async () => {
      const identity = await tc.mobile.getSelfIdentity(getIdentityParams(tc));
      debugPrint('Self identity result', identity);

      if (identity !== null) {
        assertHexString(identity.subaccount, 'identity.subaccount');
        assertString(identity.username, 'identity.username');
        assertString(identity.displayName, 'identity.displayName');
        assertBoolean(identity.privateMode, 'identity.privateMode');
      }
    });

    void test('returns PROFILE_NOT_FOUND for a nonexistent username', async () => {
      const username = `nonexistent-e2e-${Date.now()}`;
      await assertRejectsWithErrorCode(
        () => tc.mobile.getPublicProfile({ username }),
        MOBILE_ERROR_CODE.PROFILE_NOT_FOUND,
      );
    });

    void test('claims a username only if unclaimed, tolerating a race to IDENTITY_ALREADY_CLAIMED', async () => {
      const identityParams = getIdentityParams(tc);

      const existingIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Existing identity before claim attempt', existingIdentity);

      if (existingIdentity !== null) {
        // Identity claims are permanent — never attempt to claim again once one already exists.
        assertHexString(
          existingIdentity.subaccount,
          'existingIdentity.subaccount',
        );
        return;
      }

      const displayName = `E2E_${Date.now()}`;

      try {
        await tc.mobile.claimUsername({ ...identityParams, displayName });
      } catch (error) {
        if (
          error instanceof MobileServerFailureError &&
          error.errorCode === MOBILE_ERROR_CODE.IDENTITY_ALREADY_CLAIMED
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
      assert.equal(claimedIdentity?.displayName, displayName);
    });

    void test('updates the display name and restores the original', async () => {
      const identityParams = getIdentityParams(tc);

      const identity = await tc.mobile.getSelfIdentity(identityParams);

      if (identity === null) {
        await assertRejectsWithErrorCode(
          () =>
            tc.mobile.updateUsername({
              ...identityParams,
              displayName: `E2E_${Date.now()}`,
            }),
          MOBILE_ERROR_CODE.IDENTITY_REQUIRED,
        );
        return;
      }

      const originalDisplayName = identity.displayName;
      const tempDisplayName = `E2E_${Date.now()}`;
      assert.match(tempDisplayName, DISPLAY_NAME_PATTERN);

      await tc.mobile.updateUsername({
        ...identityParams,
        displayName: tempDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const updatedIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after display name update', updatedIdentity);
      assertDefined(updatedIdentity, 'updatedIdentity');
      assert.equal(updatedIdentity?.displayName, tempDisplayName);

      await tc.mobile.updateUsername({
        ...identityParams,
        displayName: originalDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after display name restore', restoredIdentity);
      assertDefined(restoredIdentity, 'restoredIdentity');
      assert.equal(restoredIdentity?.displayName, originalDisplayName);
    });

    void test('toggles private mode and restores the original value', async () => {
      const identityParams = getIdentityParams(tc);

      const identity = await tc.mobile.getSelfIdentity(identityParams);

      if (identity === null) {
        await assertRejectsWithErrorCode(
          () =>
            tc.mobile.setPrivateMode({
              ...identityParams,
              privateMode: true,
            }),
          MOBILE_ERROR_CODE.IDENTITY_REQUIRED,
        );
        return;
      }

      const originalPrivateMode = identity.privateMode;

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: !originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const toggledIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after private mode toggle', toggledIdentity);
      assertDefined(toggledIdentity, 'toggledIdentity');
      assert.equal(toggledIdentity?.privateMode, !originalPrivateMode);

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after private mode restore', restoredIdentity);
      assertDefined(restoredIdentity, 'restoredIdentity');
      assert.equal(restoredIdentity?.privateMode, originalPrivateMode);
    });
  },
);

/**
 * Builds the signed-request params for the shared E2E test subaccount.
 */
function getIdentityParams(tc: RunContext): MobileSignedRequestParams {
  return {
    subaccountOwner: tc.walletClientAddress,
    subaccountName: TEST_SUBACCOUNT_NAME,
    chainId: tc.chainId,
    verifyingAddr: tc.endpointAddr,
  };
}

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
