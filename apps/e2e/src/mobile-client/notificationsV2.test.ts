import {
  MOBILE_ERROR_CODES,
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
  payload_versions: [2],
  type_ids: ['new_follower', 'order_fill', 'market_movement'],
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
      assert.match(registration.registration_generation, /^\d+$/);
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
        refreshed.registration_generation,
        registration.registration_generation,
      );
    });

    void test('reads, replaces, and revision-checks settings while preserving legacy mapping', async () => {
      const original = await mobile.getNotificationSettingsV2({ expoToken });
      assertNotificationSettingsShape(original);
      const changed: MobileNotificationSettings = {
        ...original.settings,
        my_orders: !original.settings.my_orders,
        position_thresholds: [25],
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
            changed.my_orders,
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
      assert.equal(initial.favorites_imported, false);
      assert.deepEqual(initial.market_ids, []);
      assert.deepEqual(initial.trader_bells, []);
      await mobile.updateNotificationSubscriptions({
        ...auth,
        update: {
          expected_revision: initial.revision,
          trader_bell: null,
          market: null,
          import_markets: [productId, productId],
        },
      });
      const imported = await mobile.getNotificationSubscriptions(auth);
      assert.equal(imported.favorites_imported, true);
      assert.deepEqual(imported.market_ids, [productId]);
      assert.equal(imported.revision, initial.revision + 1);
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.updateNotificationSubscriptions({
            ...auth,
            update: {
              expected_revision: initial.revision,
              trader_bell: null,
              market: { product_id: productId, subscribed: false },
              import_markets: null,
            },
          }),
        MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT,
      );
      await mobile.updateNotificationSubscriptions({
        ...auth,
        update: {
          expected_revision: imported.revision,
          trader_bell: null,
          market: { product_id: productId, subscribed: false },
          import_markets: null,
        },
      });
      const removed = await mobile.getNotificationSubscriptions(auth);
      assert.deepEqual(removed.market_ids, []);
      await mobile.updateNotificationSubscriptions({
        ...auth,
        update: {
          expected_revision: removed.revision,
          trader_bell: null,
          market: null,
          import_markets: [productId],
        },
      });
      const repeatedImport = await mobile.getNotificationSubscriptions(auth);
      assert.deepEqual(repeatedImport.market_ids, []);
      assert.equal(repeatedImport.revision, removed.revision + 1);
    });

    void test('rejects invalid subscription operations and same-wallet bells without changing revision', async () => {
      const current = await mobile.getNotificationSubscriptions(auth);
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.updateNotificationSubscriptions({
            ...auth,
            update: {
              expected_revision: current.revision,
              trader_bell: null,
              market: null,
              import_markets: null,
            },
          }),
        MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      );
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.updateNotificationSubscriptions({
            ...auth,
            update: {
              expected_revision: current.revision,
              trader_bell: { subaccount: subaccountToHex(auth), enabled: true },
              market: null,
              import_markets: null,
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
      assert.equal(page.next_cursor, null);
      const unknownCursor = await mobile.getNotificationInboxV2({
        ...auth,
        cursor: randomUUID(),
      });
      assert.deepEqual(unknownCursor.notifications, []);
      assert.equal(unknownCursor.next_cursor, null);
      await assertRejectsWithMobileErrorCode(
        () => mobile.getNotificationInboxV2({ ...auth, limit: 51 }),
        MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      );
    });

    void test('records product events, accepts stable-ID retries, and rejects invalid batches/ownership', async () => {
      const events: MobileProductEvent[] = [
        {
          client_event_id: randomUUID(),
          event_name: 'search',
          notification_id: null,
          occurred_at: Date.now(),
          product_id: null,
          query: 'BTC',
        },
        {
          client_event_id: randomUUID(),
          event_name: 'market_viewed',
          notification_id: null,
          occurred_at: Date.now(),
          product_id: TEST_PRODUCT_IDS.PERP_BTC,
          query: null,
        },
        {
          client_event_id: randomUUID(),
          event_name: 'chart_opened',
          notification_id: null,
          occurred_at: Date.now(),
          product_id: TEST_PRODUCT_IDS.PERP_BTC,
          query: null,
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
                client_event_id: randomUUID(),
                event_name: 'notif_opened',
                notification_id: randomUUID(),
                occurred_at: Date.now(),
                product_id: null,
                query: null,
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
        payload_versions: [1],
        type_ids: [],
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
  assert.equal(document.schema_version, 2);
  assertNonNegativeInteger(document.revision, 'revision');
  assert.equal(Object.keys(document.settings).length, 9);
  assert.ok(document.settings.position_thresholds.length >= 1);
  for (const threshold of document.settings.position_thresholds) {
    assert.ok([10, 25, 50].includes(threshold));
  }
  for (const field of [
    'my_positions',
    'my_orders',
    'following_trades',
    'following_posts',
    'new_followers',
    'announcements',
    'discovery',
  ] as const) {
    assertBoolean(document.settings[field], `settings.${field}`);
  }
}
