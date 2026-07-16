import {
  MOBILE_ERROR_CODE,
  MobileServerFailureError,
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
      const displayName = `E2E_Probe_${Date.now()}`;
      const result = await tc.mobile.getUsernameAvailability({ displayName });
      debugPrint('Username availability result', result);

      assertDefined(result, 'availabilityResult');
      assertString(result.username, 'availabilityResult.username');
      assertBoolean(result.available, 'availabilityResult.available');
    });

    void test('rejects a malformed display name with INVALID_DISPLAY_NAME', async () => {
      await assert.rejects(
        () => tc.mobile.getUsernameAvailability({ displayName: '!!' }),
        (error: unknown) => {
          assert.ok(
            error instanceof MobileServerFailureError,
            'should throw MobileServerFailureError',
          );
          assert.equal(error.errorCode, MOBILE_ERROR_CODE.INVALID_DISPLAY_NAME);
          return true;
        },
      );
    });

    void test('fetches self identity without throwing', async () => {
      const identity = await tc.mobile.getSelfIdentity({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        chainId: tc.chainId,
        verifyingAddr: tc.endpointAddr,
      });
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
      await assert.rejects(
        () => tc.mobile.getPublicProfile({ username }),
        (error: unknown) => {
          assert.ok(
            error instanceof MobileServerFailureError,
            'should throw MobileServerFailureError',
          );
          assert.equal(error.errorCode, MOBILE_ERROR_CODE.PROFILE_NOT_FOUND);
          return true;
        },
      );
    });

    void test('claims a username only if unclaimed, tolerating a race to IDENTITY_ALREADY_CLAIMED', async () => {
      const identityParams = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        chainId: tc.chainId,
        verifyingAddr: tc.endpointAddr,
      };

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

      const claimedIdentity = await tc.mobile.getSelfIdentity(identityParams);
      debugPrint('Identity after claim', claimedIdentity);

      assertDefined(claimedIdentity, 'claimedIdentity');
      assert.equal(claimedIdentity?.displayName, displayName);
    });
  },
);
