import {
  MOBILE_ERROR_CODES,
  MOBILE_NOTIFICATION_MIN_TRADE_SIZES_USD,
  MOBILE_NOTIFICATION_POSITION_THRESHOLDS,
  MobileClient,
  MobileNotificationCapabilities,
  MobileNotificationSettings,
  MobileNotificationSettingsV2,
  MobileProductEvent,
  MobileRegisterExpoTokenV2Params,
  MobileSignedRequestParams,
} from '@nadohq/mobile-client';
import { subaccountToHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import { assertBoolean, assertNonNegativeInteger } from '../utils/assertions';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

const capabilities: MobileNotificationCapabilities = {
  payloadVersions: [2],
  typeIds: ['new_follower', 'order_fill', 'market_movement'],
  routes: ['profile', 'market', 'portfolio'],
};

void describe(
  '[mobile-client]: notifications v2',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let mobile: MobileClient;
    let auth: MobileSignedRequestParams;
    let expoToken: string;
    let registered = false;

    before(() => {
      const context = createTestContext();
      const account = privateKeyToAccount(generatePrivateKey());
      mobile = new MobileClient({
        url: context.endpoints.mobile,
        walletClient: createWalletClient({
          account,
          chain: context.walletClient.chain,
          transport: http(),
        }),
      });
      auth = {
        ...getMobileSignedParams(context),
        subaccountOwner: account.address,
      };
      expoToken = `ExponentPushToken[e2e-notifications-v2-${randomUUID()}]`;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    after(async () => {
      if (registered) {
        await mobile.unregisterExpoToken({ expoToken });
      }
    });

    void test('registers v2 capabilities, resolves ownership, and advances the opaque generation', async () => {
      const params: MobileRegisterExpoTokenV2Params = {
        ...auth,
        expoToken,
        platform: 'ios',
        locale: 'en-US',
        appVersion: '0.0.1-e2e',
        capabilities,
      };
      assert.equal(
        (await mobile.registerExpoTokenV2(params)).status,
        'success',
      );
      registered = true;
      const registration = await mobile.getNotificationRegistrationV2({
        expoToken,
      });
      assert.match(registration.registrationGeneration, /^\d+$/);
      assert.deepEqual(registration.capabilities, capabilities);
      const wallet = await mobile.getRegisteredWallet({ expoToken });
      assert.equal(
        wallet.wallet.toLowerCase(),
        auth.subaccountOwner.toLowerCase(),
      );
      await mobile.registerExpoTokenV2(params);
      const refreshed = await mobile.getNotificationRegistrationV2({
        expoToken,
      });
      assert.notEqual(
        refreshed.registrationGeneration,
        registration.registrationGeneration,
      );
    });

    void test('reads, replaces, and revision-checks settings while preserving legacy mapping', async () => {
      const original = await mobile.getNotificationSettingsV2({ expoToken });
      assertNotificationSettingsShape(original);
      const changed: MobileNotificationSettings = {
        ...original.settings,
        myOrders: !original.settings.myOrders,
        positionThresholds: [25],
      };
      try {
        const saved = await mobile.updateNotificationSettingsV2({
          expoToken,
          expectedRevision: original.revision,
          settings: changed,
        });
        assertNotificationSettingsShape(saved);
        assert.equal(saved.revision, original.revision + 1);
        assert.deepEqual(saved.settings, changed);
        const legacy = await mobile.getNotificationPreferences({ expoToken });
        for (const category of ['order_fill', 'order_update']) {
          assert.equal(
            legacy.categories.find((entry) => entry.category === category)
              ?.enabled,
            changed.myOrders,
          );
        }
        await assertRejectsWithMobileErrorCode(
          () =>
            mobile.updateNotificationSettingsV2({
              expoToken,
              expectedRevision: original.revision,
              settings: original.settings,
            }),
          MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT,
        );
        await mobile.updateNotificationPreferences({
          expoToken,
          preferences: legacy,
        });
        const afterLegacy = await mobile.getNotificationSettingsV2({
          expoToken,
        });
        assert.ok(afterLegacy.revision > saved.revision);
        assert.deepEqual(afterLegacy.settings, changed);
      } finally {
        const current = await mobile.getNotificationSettingsV2({ expoToken });
        await mobile.updateNotificationSettingsV2({
          expoToken,
          expectedRevision: current.revision,
          settings: original.settings,
        });
      }
    });

    void test('reads subscriptions, imports favorites once, and applies revision-guarded market changes', async () => {
      const productId = TEST_PRODUCT_IDS.PERP_BTC;
      const initial = await mobile.getNotificationSubscriptions(auth);
      assert.equal(initial.revision, 0);
      assert.equal(initial.favoritesImported, false);
      assert.deepEqual(initial.marketIds, []);
      assert.deepEqual(initial.traderBells, []);
      await mobile.updateNotificationSubscriptions({
        ...auth,
        update: {
          expectedRevision: initial.revision,
          importMarkets: [productId, productId],
        },
      });
      const imported = await mobile.getNotificationSubscriptions(auth);
      assert.equal(imported.favoritesImported, true);
      assert.deepEqual(imported.marketIds, [productId]);
      assert.equal(imported.revision, initial.revision + 1);
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.updateNotificationSubscriptions({
            ...auth,
            update: {
              expectedRevision: initial.revision,
              market: { productId: productId, subscribed: false },
            },
          }),
        MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT,
      );
      await mobile.updateNotificationSubscriptions({
        ...auth,
        update: {
          expectedRevision: imported.revision,
          market: { productId: productId, subscribed: false },
        },
      });
      const removed = await mobile.getNotificationSubscriptions(auth);
      assert.deepEqual(removed.marketIds, []);
      await mobile.updateNotificationSubscriptions({
        ...auth,
        update: {
          expectedRevision: removed.revision,
          importMarkets: [productId],
        },
      });
      const repeatedImport = await mobile.getNotificationSubscriptions(auth);
      assert.deepEqual(repeatedImport.marketIds, []);
      assert.equal(repeatedImport.revision, removed.revision + 1);
    });

    void test('rejects invalid subscription operations and same-wallet bells without changing revision', async () => {
      const current = await mobile.getNotificationSubscriptions(auth);
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.updateNotificationSubscriptions({
            ...auth,
            update: {
              expectedRevision: current.revision,
              market: { productId: 0, subscribed: true },
            },
          }),
        MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      );
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.updateNotificationSubscriptions({
            ...auth,
            update: {
              expectedRevision: current.revision,
              traderBell: { subaccount: subaccountToHex(auth), enabled: true },
            },
          }),
        MOBILE_ERROR_CODES.INVALID_IDENTITY_TARGET,
      );
      assert.equal(
        (await mobile.getNotificationSubscriptions(auth)).revision,
        current.revision,
      );
    });

    void test('queries the private inbox without an Expo token and validates pagination', async () => {
      const page = await mobile.getNotificationInboxV2({ ...auth, limit: 1 });
      assert.deepEqual(page.notifications, []);
      assert.equal(page.nextCursor, null);
      const unknownCursor = await mobile.getNotificationInboxV2({
        ...auth,
        cursor: randomUUID(),
      });
      assert.deepEqual(unknownCursor.notifications, []);
      assert.equal(unknownCursor.nextCursor, null);
      await assertRejectsWithMobileErrorCode(
        () => mobile.getNotificationInboxV2({ ...auth, limit: 51 }),
        MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      );
    });

    void test('records product events, accepts stable-ID retries, and rejects invalid batches/ownership', async () => {
      const events: MobileProductEvent[] = [
        {
          clientEventId: randomUUID(),
          eventName: 'search',
          occurredAt: Date.now(),
          query: 'BTC',
        },
        {
          clientEventId: randomUUID(),
          eventName: 'market_viewed',
          occurredAt: Date.now(),
          productId: TEST_PRODUCT_IDS.PERP_BTC,
        },
        {
          clientEventId: randomUUID(),
          eventName: 'chart_opened',
          occurredAt: Date.now(),
          productId: TEST_PRODUCT_IDS.PERP_BTC,
        },
      ];
      assert.equal(
        (await mobile.recordProductEvents({ ...auth, events })).status,
        'success',
      );
      assert.equal(
        (await mobile.recordProductEvents({ ...auth, events })).status,
        'success',
      );
      await assertRejectsWithMobileErrorCode(
        () => mobile.recordProductEvents({ ...auth, events: [] }),
        MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      );
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.recordProductEvents({
            ...auth,
            events: [
              {
                clientEventId: randomUUID(),
                eventName: 'notif_opened',
                notificationId: randomUUID(),
                occurredAt: Date.now(),
              },
            ],
          }),
        MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      );
    });

    void test('retains legacy registrations and rejects token reads after idempotent unregistration', async () => {
      await mobile.registerExpoToken({ ...auth, expoToken, platform: 'ios' });
      const legacy = await mobile.getNotificationRegistrationV2({ expoToken });
      assert.deepEqual(legacy.capabilities, {
        payloadVersions: [1],
        typeIds: [],
        routes: [],
      });
      await mobile.unregisterExpoToken({ expoToken });
      await mobile.unregisterExpoToken({ expoToken });
      registered = false;
      await assertRejectsWithMobileErrorCode(
        () => mobile.getNotificationRegistrationV2({ expoToken }),
        MOBILE_ERROR_CODES.INVALID_EXPO_TOKEN,
      );
      await assertRejectsWithMobileErrorCode(
        () => mobile.getNotificationSettingsV2({ expoToken }),
        MOBILE_ERROR_CODES.INVALID_EXPO_TOKEN,
      );
      assert.ok(
        Array.isArray(
          (await mobile.getNotificationInboxV2(auth)).notifications,
        ),
      );
    });
  },
);

/**
 * Asserts the v2 settings document's schema, revision, and required field shapes.
 * @param document - Settings document returned by a notification query or update.
 */
function assertNotificationSettingsShape(
  document: MobileNotificationSettingsV2,
): void {
  assert.equal(document.schemaVersion, 2);
  assertNonNegativeInteger(document.revision, 'revision');
  assert.equal(Object.keys(document.settings).length, 9);
  assert.ok(document.settings.positionThresholds.length >= 1);
  for (const threshold of document.settings.positionThresholds) {
    assert.ok(MOBILE_NOTIFICATION_POSITION_THRESHOLDS.includes(threshold));
  }
  assert.ok(
    MOBILE_NOTIFICATION_MIN_TRADE_SIZES_USD.includes(
      document.settings.minTradeSizeUsd,
    ),
  );
  assert.equal('status' in document, false);
  for (const field of [
    'myPositions',
    'myOrders',
    'followingTrades',
    'followingPosts',
    'newFollowers',
    'announcements',
    'discovery',
  ] as const) {
    assertBoolean(document.settings[field], `settings.${field}`);
  }
}
