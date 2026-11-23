import {
  MOBILE_ERROR_CODES,
  MobileClient,
  MobileNotificationSettingsV3,
  MobileSignedRequestParams,
} from '@nadohq/mobile-client';
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
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[mobile-client]: notifications v3',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let mobile: MobileClient;
    let auth: MobileSignedRequestParams;
    let expoToken: string;
    let registered = false;

    before(async () => {
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
      expoToken = `ExponentPushToken[e2e-notifications-v3-${randomUUID()}]`;
      await mobile.registerExpoTokenV2({
        ...auth,
        expoToken,
        platform: 'ios',
        locale: 'en-US',
        appVersion: '0.0.1-e2e',
        capabilities: {
          payloadVersions: [2],
          typeIds: ['new_follower'],
          routes: ['profile'],
        },
      });
      registered = true;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    after(async () => {
      if (registered) await mobile.unregisterExpoToken({ expoToken });
    });

    void test('reads v3 settings with the effective likes-and-replies default', async () => {
      const settings = await mobile.getNotificationSettingsV3({ expoToken });
      assertSettings(settings);
      assert.equal(settings.settings.likesAndReplies, true);
    });

    void test('replaces and revision-checks v3 settings while older writes preserve the new value', async () => {
      const original = await mobile.getNotificationSettingsV3({ expoToken });
      const changed = { ...original.settings, likesAndReplies: false };
      const saved = await mobile.updateNotificationSettingsV3({
        expoToken,
        expectedRevision: original.revision,
        settings: changed,
      });
      assertSettings(saved);
      assert.equal(saved.revision, original.revision + 1);
      assert.deepEqual(saved.settings, changed);
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.updateNotificationSettingsV3({
            expoToken,
            expectedRevision: original.revision,
            settings: original.settings,
          }),
        MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT,
      );
      const older = await mobile.getNotificationSettingsV2({ expoToken });
      await mobile.updateNotificationSettingsV2({
        expoToken,
        expectedRevision: older.revision,
        settings: { ...older.settings, myOrders: !older.settings.myOrders },
      });
      const afterOlderWrite = await mobile.getNotificationSettingsV3({
        expoToken,
      });
      assert.equal(afterOlderWrite.settings.likesAndReplies, false);
      await mobile.updateNotificationSettingsV3({
        expoToken,
        expectedRevision: afterOlderWrite.revision,
        settings: original.settings,
      });
    });

    void test('reads wallet inbox v3 with explicit null pagination', async () => {
      const inbox = await mobile.getNotificationInboxV3({
        ...auth,
        cursor: null,
        limit: null,
      });
      assert.ok(Array.isArray(inbox.notifications));
      assert.ok(
        inbox.nextCursor === null || typeof inbox.nextCursor === 'string',
      );
      for (const entry of inbox.notifications) {
        assert.equal(typeof entry.notificationId, 'string');
        assertNonNegativeInteger(entry.createdAt, 'createdAt');
        assertBoolean(entry.tradeWithin24h, 'tradeWithin24h');
        assert.ok(entry.seenAt === null || typeof entry.seenAt === 'number');
      }
    });

    void test('rejects repeated missing notification IDs with INVALID_NOTIFICATION_REQUEST', async () => {
      const notificationId = randomUUID();
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.markNotificationsSeen({
            ...auth,
            notificationIds: [notificationId, notificationId],
          }),
        MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      );
    });
  },
);

function assertSettings(settings: MobileNotificationSettingsV3): void {
  assert.equal(settings.schemaVersion, 3);
  assertNonNegativeInteger(settings.revision, 'revision');
  assertBoolean(settings.settings.likesAndReplies, 'likesAndReplies');
  assertBoolean(settings.settings.myPositions, 'myPositions');
  assertBoolean(settings.settings.myOrders, 'myOrders');
  assert.ok(settings.settings.positionThresholds.length > 0);
}
