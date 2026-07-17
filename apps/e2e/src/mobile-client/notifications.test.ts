import {
  MobileNotificationPreferences,
  MobileServerFailureError,
  MobileSignedRequestParams,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { keccak256, stringToBytes } from 'viem';
import { assertDefined, assertString } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

// Mirrors the backend's preferences MVP rules: schema_version 1 and one entry per known category.
const EXPECTED_SCHEMA_VERSION = 1;
const EXPECTED_CATEGORY_COUNT = 6;

void describe(
  '[mobile-client]: notifications',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('registers, lists, and unregisters an Expo push token', async () => {
      const signedParams = getSignedParams(tc);
      // Unique per run so parallel/failed runs don't collide on the same token row.
      const expoTokenInner = `e2e-device-${Date.now()}`;
      const expoToken = `ExponentPushToken[${expoTokenInner}]`;
      // The backend identifies devices by the first 8 hex chars of keccak256 over the bracket-stripped token.
      const expectedFingerprintPrefix = keccak256(
        stringToBytes(expoTokenInner),
      ).slice(2, 10);

      await tc.mobile.registerExpoToken({
        ...signedParams,
        expoToken,
        platform: 'ios',
        locale: 'en-US',
        appVersion: '0.0.1-e2e',
      });
      await delay(TEST_DELAYS.STANDARD);

      const devices = await tc.mobile.getRegisteredDevices(signedParams);
      debugPrint('Registered devices after register', devices);

      const registeredDevice = devices.find(
        (device) => device.tokenFingerprintPrefix === expectedFingerprintPrefix,
      );
      assertDefined(registeredDevice, 'registeredDevice');
      assert.equal(registeredDevice?.platform, 'ios');
      assert.equal(registeredDevice?.locale, 'en-US');
      assert.equal(registeredDevice?.appVersion, '0.0.1-e2e');
      assertString(
        registeredDevice?.tokenFingerprintPrefix,
        'registeredDevice.tokenFingerprintPrefix',
      );

      await tc.mobile.unregisterExpoToken({ ...signedParams, expoToken });
      await delay(TEST_DELAYS.STANDARD);

      const devicesAfterUnregister =
        await tc.mobile.getRegisteredDevices(signedParams);
      debugPrint('Registered devices after unregister', devicesAfterUnregister);
      assert.equal(
        devicesAfterUnregister.some(
          (device) =>
            device.tokenFingerprintPrefix === expectedFingerprintPrefix,
        ),
        false,
        'unregistered device should no longer be listed',
      );
    });

    void test('rejects a malformed Expo push token', async () => {
      await assert.rejects(
        tc.mobile.registerExpoToken({
          ...getSignedParams(tc),
          expoToken: 'not-an-expo-token',
          platform: 'android',
        }),
        (error: unknown) => {
          assert.ok(
            error instanceof MobileServerFailureError,
            'should throw MobileServerFailureError',
          );
          return true;
        },
      );
    });

    void test('fetches default-shaped notification preferences', async () => {
      const preferences = await tc.mobile.getNotificationPreferences(
        getSignedParams(tc),
      );
      debugPrint('Notification preferences', preferences);

      assertPreferencesShape(preferences);
    });

    void test('toggles a category preference and restores the original', async () => {
      const signedParams = getSignedParams(tc);

      const original = await tc.mobile.getNotificationPreferences(signedParams);
      assertPreferencesShape(original);

      const toggled: MobileNotificationPreferences = {
        schemaVersion: original.schemaVersion,
        categories: original.categories.map((category) =>
          category.category === 'funding'
            ? { ...category, enabled: !category.enabled }
            : category,
        ),
      };

      await tc.mobile.updateNotificationPreferences({
        ...signedParams,
        preferences: toggled,
      });
      await delay(TEST_DELAYS.STANDARD);

      const updated = await tc.mobile.getNotificationPreferences(signedParams);
      debugPrint('Preferences after toggle', updated);
      assert.equal(
        updated.categories.find((category) => category.category === 'funding')
          ?.enabled,
        !original.categories.find((category) => category.category === 'funding')
          ?.enabled,
      );

      await tc.mobile.updateNotificationPreferences({
        ...signedParams,
        preferences: original,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restored = await tc.mobile.getNotificationPreferences(signedParams);
      debugPrint('Preferences after restore', restored);
      assert.deepEqual(restored, original);
    });
  },
);

/**
 * Builds the signed-request params for the shared E2E test subaccount. Notification state is keyed by the
 * owning wallet, so any subaccount of the wallet authenticates the same data.
 */
function getSignedParams(tc: RunContext): MobileSignedRequestParams {
  return {
    subaccountOwner: tc.walletClientAddress,
    subaccountName: TEST_SUBACCOUNT_NAME,
    chainId: tc.chainId,
    verifyingAddr: tc.endpointAddr,
  };
}

/**
 * Asserts the backend's preferences MVP invariants: current schema version, one entry per known category,
 * and no scopes.
 */
function assertPreferencesShape(
  preferences: MobileNotificationPreferences,
): void {
  assert.equal(preferences.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(preferences.categories.length, EXPECTED_CATEGORY_COUNT);
  for (const category of preferences.categories) {
    assertString(category.category, 'category.category');
    assert.equal(typeof category.enabled, 'boolean');
    assert.deepEqual(category.scopes, []);
  }
}
