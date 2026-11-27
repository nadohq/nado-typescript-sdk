import {
  MOBILE_ERROR_CODES,
  MobileNotificationPreferences,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { keccak256, stringToBytes } from 'viem';
import { assertString } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

// Mirrors the backend's preferences MVP rules: schema_version 1 and one entry per known category.
const EXPECTED_SCHEMA_VERSION = 1;
const EXPECTED_CATEGORY_COUNT = 6;

void describe(
  '[mobile-client]: notifications',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let ctx: RunContext;
    /**
     * Preference reads and writes are authorized by possession of an active Expo push token, so the
     * preference tests share one token registered here rather than each registering their own.
     */
    let preferencesExpoToken: string;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      ctx = createTestContext();
      preferencesExpoToken = createTestExpoToken().expoToken;
      await ctx.mobile.registerExpoToken({
        ...getMobileSignedParams(ctx),
        expoToken: preferencesExpoToken,
        platform: 'ios',
        appVersion: '0.0.1-e2e',
      });
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('registers, resolves, and unregisters an Expo push token', async () => {
      const { expoToken, fingerprintPrefix } = createTestExpoToken();

      await ctx.mobile.registerExpoToken({
        ...getMobileSignedParams(ctx),
        expoToken,
        platform: 'ios',
        locale: 'en-US',
        appVersion: '0.0.1-e2e',
      });
      await delay(TEST_DELAYS.STANDARD);

      const registration = await ctx.mobile.getRegisteredWallet({ expoToken });
      debugPrint('Registered wallet after register', registration);

      assert.equal(
        registration.wallet.toLowerCase(),
        ctx.walletClientAddress.toLowerCase(),
      );
      assert.equal(registration.platform, 'ios');
      assert.equal(registration.locale, 'en-US');
      assert.equal(registration.appVersion, '0.0.1-e2e');
      assert.equal(registration.tokenFingerprintPrefix, fingerprintPrefix);

      await ctx.mobile.unregisterExpoToken({ expoToken });
      await delay(TEST_DELAYS.STANDARD);

      // An unregistered token is no longer a valid credential, so the lookup fails rather than reporting an
      // inactive registration.
      await assertRejectsWithInvalidExpoToken(
        ctx.mobile.getRegisteredWallet({ expoToken }),
      );

      // Unregister is keyed by the token alone and idempotent, so replaying it on an inactive token succeeds.
      await ctx.mobile.unregisterExpoToken({ expoToken });
    });

    void test('rejects a registered wallet lookup for an unregistered Expo push token', async () => {
      await assertRejectsWithInvalidExpoToken(
        ctx.mobile.getRegisteredWallet({
          expoToken: createTestExpoToken().expoToken,
        }),
      );
    });

    void test('rejects a malformed Expo push token', async () => {
      await assert.rejects(
        ctx.mobile.registerExpoToken({
          ...getMobileSignedParams(ctx),
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

    void test('rejects a preference read for an unregistered Expo push token', async () => {
      await assertRejectsWithInvalidExpoToken(
        ctx.mobile.getNotificationPreferences({
          expoToken: createTestExpoToken().expoToken,
        }),
      );
    });

    void test('fetches default-shaped notification preferences', async () => {
      const preferences = await ctx.mobile.getNotificationPreferences({
        expoToken: preferencesExpoToken,
      });
      debugPrint('Notification preferences', preferences);

      assertPreferencesShape(preferences);
    });

    void test('toggles a category preference and restores the original', async () => {
      const original = await ctx.mobile.getNotificationPreferences({
        expoToken: preferencesExpoToken,
      });
      assertPreferencesShape(original);

      const toggled: MobileNotificationPreferences = {
        schemaVersion: original.schemaVersion,
        categories: original.categories.map((category) =>
          category.category === 'funding'
            ? { ...category, enabled: !category.enabled }
            : category,
        ),
      };

      await ctx.mobile.updateNotificationPreferences({
        expoToken: preferencesExpoToken,
        preferences: toggled,
      });
      await delay(TEST_DELAYS.STANDARD);

      const updated = await ctx.mobile.getNotificationPreferences({
        expoToken: preferencesExpoToken,
      });
      debugPrint('Preferences after toggle', updated);
      assert.equal(
        updated.categories.find((category) => category.category === 'funding')
          ?.enabled,
        !original.categories.find((category) => category.category === 'funding')
          ?.enabled,
      );

      await ctx.mobile.updateNotificationPreferences({
        expoToken: preferencesExpoToken,
        preferences: original,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restored = await ctx.mobile.getNotificationPreferences({
        expoToken: preferencesExpoToken,
      });
      debugPrint('Preferences after restore', restored);
      assert.deepEqual(restored, original);
    });

    after(async () => {
      await ctx.mobile.unregisterExpoToken({ expoToken: preferencesExpoToken });
    });
  },
);

/**
 * Builds an Expo push token that is unique per call, so parallel or previously failed runs never collide on
 * the same token row, alongside the device id the backend derives from it: the first 8 hex chars of
 * `keccak256` over the bracket-stripped token.
 */
function createTestExpoToken(): {
  expoToken: string;
  fingerprintPrefix: string;
} {
  const inner = `e2e-device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    expoToken: `ExponentPushToken[${inner}]`,
    fingerprintPrefix: keccak256(stringToBytes(inner)).slice(2, 10),
  };
}

/**
 * Asserts that a token-authenticated request was rejected because its Expo push token is not an active
 * credential. The backend collapses malformed, unknown, and unregistered tokens into this one error.
 */
async function assertRejectsWithInvalidExpoToken(
  request: Promise<unknown>,
): Promise<void> {
  await assert.rejects(request, (error: unknown) => {
    assert.ok(
      error instanceof MobileServerFailureError,
      'should throw MobileServerFailureError',
    );
    assert.equal(error.errorCode, MOBILE_ERROR_CODES.INVALID_EXPO_TOKEN);
    return true;
  });
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
