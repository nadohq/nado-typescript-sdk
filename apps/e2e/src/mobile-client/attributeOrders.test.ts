import {
  MOBILE_ERROR_CODES,
  MobileAttributeOrdersResult,
  MobileSocialFeedItem,
} from '@nadohq/mobile-client';
import { subaccountFromHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

// The backend records an attribution without checking that the digest belongs to a placed order: whether the
// order was the sender's, on the item's market and filled in time is settled later from Archive. Random digests
// therefore exercise every request-time outcome without placing orders, and never collide with earlier runs.
void describe(
  '[mobile-client]: attribute orders',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;
    let feedItems: MobileSocialFeedItem[];

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
      feedItems = (await tc.mobile.getForYouFeed({ limit: 50 })).items;
    });

    const getRandomDigest = () => `0x${randomBytes(32).toString('hex')}`;

    const getIsOwnItem = (item: MobileSocialFeedItem) =>
      subaccountFromHex(
        item.author.subaccount,
      ).subaccountOwner.toLowerCase() === tc.walletClientAddress.toLowerCase();

    const findAttributableItem = (excludedItemId?: string) =>
      feedItems.find(
        (item) =>
          (item.kind === 'post' || item.kind === 'trade_card') &&
          item.id !== excludedItemId &&
          !getIsOwnItem(item),
      );

    const attributeOrders = (itemId: string, orderDigests: string[]) =>
      tc.mobile.attributeOrders({
        ...getMobileSignedParams(tc),
        itemId,
        orderDigests,
      });

    const assertEveryResult = (
      result: MobileAttributeOrdersResult,
      orderDigests: string[],
      expected: Pick<
        MobileAttributeOrdersResult['results'][number],
        'status' | 'reason'
      >,
    ) => {
      assert.equal(result.isAccepted, true);
      assert.deepEqual(
        result.results.map(({ orderDigest }) => orderDigest),
        orderDigests,
      );
      for (const entry of result.results) {
        assert.equal(entry.status, expected.status);
        assert.equal(entry.reason, expected.reason);
      }
    };

    void test('accepts new digests for another author’s item, then reports them as duplicates', async (context) => {
      const item = findAttributableItem();
      if (!item) {
        context.skip('No attributable item by another author in the feed.');
        return;
      }
      const orderDigests = [getRandomDigest(), getRandomDigest()];

      const first = await attributeOrders(item.id, orderDigests);
      debugPrint('Attribute orders', { itemId: item.id, first });
      if (!first.isAccepted) {
        context.skip('Creator attribution is switched off on this network.');
        return;
      }
      assertEveryResult(first, orderDigests, {
        status: 'accepted',
        reason: null,
      });

      await delay(TEST_DELAYS.STANDARD);
      const repeat = await attributeOrders(item.id, orderDigests);
      assertEveryResult(repeat, orderDigests, {
        status: 'duplicate',
        reason: null,
      });
    });

    void test('keeps the first item when a digest is attributed to another', async (context) => {
      const firstItem = findAttributableItem();
      const secondItem = firstItem && findAttributableItem(firstItem.id);
      if (!firstItem || !secondItem) {
        context.skip('Fewer than two attributable items in the feed.');
        return;
      }
      const orderDigests = [getRandomDigest()];

      await attributeOrders(firstItem.id, orderDigests);
      await delay(TEST_DELAYS.STANDARD);
      const result = await attributeOrders(secondItem.id, orderDigests);
      assertEveryResult(result, orderDigests, {
        status: 'rejected',
        reason: 'conflict',
      });
    });

    void test('rejects an unknown item', async () => {
      const orderDigests = [getRandomDigest()];
      const result = await attributeOrders(randomUUID(), orderDigests);
      assertEveryResult(result, orderDigests, {
        status: 'rejected',
        reason: 'unknown_item',
      });
    });

    void test('rejects a trade row or reply', async (context) => {
      const item = feedItems.find(
        ({ kind }) => kind === 'trade_row' || kind === 'reply',
      );
      if (!item) {
        context.skip('No trade row or reply in the feed.');
        return;
      }
      const orderDigests = [getRandomDigest()];
      const result = await attributeOrders(item.id, orderDigests);
      assertEveryResult(result, orderDigests, {
        status: 'rejected',
        reason: 'not_attributable',
      });
    });

    void test('rejects the sender’s own item', async (context) => {
      const ownItems = (
        await tc.mobile.getProfileFeed({
          subaccount: {
            subaccountOwner: tc.walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
          },
          limit: 20,
        })
      ).items;
      const item = ownItems.find(
        (candidate) =>
          (candidate.kind === 'post' || candidate.kind === 'trade_card') &&
          getIsOwnItem(candidate),
      );
      if (!item) {
        context.skip('The test wallet has no post or trade card.');
        return;
      }
      const orderDigests = [getRandomDigest()];
      const result = await attributeOrders(item.id, orderDigests);
      assertEveryResult(result, orderDigests, {
        status: 'rejected',
        reason: 'own_content',
      });
    });

    void test('rejects an empty or repeated digest list', async () => {
      const itemId = randomUUID();
      const digest = getRandomDigest();

      await assertRejectsWithMobileErrorCode(
        () => attributeOrders(itemId, []),
        MOBILE_ERROR_CODES.INVALID_ORDER_ATTRIBUTION,
      );
      await assertRejectsWithMobileErrorCode(
        () => attributeOrders(itemId, [digest, digest]),
        MOBILE_ERROR_CODES.INVALID_ORDER_ATTRIBUTION,
      );
    });
  },
);
