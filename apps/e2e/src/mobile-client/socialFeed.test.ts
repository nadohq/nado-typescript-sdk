import {
  MOBILE_ERROR_CODES,
  MobileClient,
  MobileSocialFeedAuthor,
  MobileSocialFeedPage,
} from '@nadohq/mobile-client';
import { Subaccount, subaccountFromHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertBigNumberFinite,
  assertBoolean,
  assertEnumMember,
  assertNonEmptyString,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { assertMobileIdentitySummaryShape } from '../utils/shapeAssertions';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: social feed',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;
    let viewAs: Subaccount;
    let mobile: MobileClient;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
      viewAs = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      };
      mobile = new MobileClient({ url: tc.endpoints.mobile });
    });

    void test('reads a public filtered session and reuses its identity for pagination and updates', async () => {
      const page = await mobile.getForYouFeed({
        viewAs,
        minimumNotional: 500,
        limit: 2,
      });
      assertPage(page);
      assert.equal(page.rankingVersion, 'chronological-v1');
      const { sessionId, viewerToken } = page.readSession;
      assert.ok(viewerToken);
      if (page.nextCursor !== null) {
        const next = await mobile.getForYouFeed({
          viewAs,
          minimumNotional: 500,
          limit: 2,
          sessionId,
          viewerToken,
          cursor: page.nextCursor,
        });
        assertPage(next);
        assert.equal(next.readSession.sessionId, sessionId);
      }
      const updates = await mobile.getFeedUpdates({
        sessionId,
        viewerToken,
        updateCursor: page.readSession.updateCursor,
        visibleItemIds: page.items.map((item) => item.id),
        visiblePositionIds: [],
        viewportRevision: 0,
        requestSeq: 1,
      });
      debugPrint('Feed updates', updates);
      assert.equal(updates.viewportRevision, 0);
      assert.equal(updates.requestSeq, 1);
      assert.equal(updates.reset, true);
      assert.equal(typeof updates.updateCursor, 'string');
      assert.ok(Array.isArray(updates.itemPatches));
      assert.ok(Array.isArray(updates.positionPatches));
      assert.ok(Array.isArray(updates.unavailableTargets));
      for (const patch of updates.itemPatches) {
        assertFeedAuthor(patch.author);
        assertNonNegativeInteger(patch.displayAtMs, 'patch.displayAtMs');
      }
      const changedViewport = await mobile.getFeedUpdates({
        sessionId,
        viewerToken,
        updateCursor: null,
        visibleItemIds: [],
        visiblePositionIds: [],
        viewportRevision: 1,
        requestSeq: 2,
      });
      assert.equal(changedViewport.viewportRevision, 1);
      assert.equal(changedViewport.requestSeq, 2);
      assert.equal(changedViewport.reset, true);
    });

    void test('rejects sequence and viewport rollbacks within a session', async () => {
      const page = await mobile.getForYouFeed({ limit: 1 });
      const params = {
        sessionId: page.readSession.sessionId,
        viewerToken: page.readSession.viewerToken,
        visibleItemIds: [],
        visiblePositionIds: [],
        updateCursor: null,
        viewportRevision: 0,
        requestSeq: 1,
      };
      const initial = await mobile.getFeedUpdates(params);
      assert.equal(initial.reset, true);
      const current = { ...params, viewportRevision: 1, requestSeq: 2 };
      const changed = await mobile.getFeedUpdates(current);
      assert.equal(changed.reset, true);
      assert.equal(changed.viewportRevision, 1);
      assert.equal(changed.requestSeq, 2);

      // Equal values are not a rollback; the unchanged empty viewport is still valid.
      const repeated = await mobile.getFeedUpdates(current);
      assert.equal(repeated.requestSeq, 2);
      for (const rollback of [
        { ...current, requestSeq: 1 },
        { ...current, viewportRevision: 0, requestSeq: 3 },
      ]) {
        await assertRejectsWithMobileErrorCode(
          () => mobile.getFeedUpdates(rollback),
          MOBILE_ERROR_CODES.SOCIAL_FEED_SESSION_MISMATCH,
        );
      }
      const next = await mobile.getFeedUpdates({ ...current, requestSeq: 3 });
      assert.equal(next.viewportRevision, 1);
      assert.equal(next.requestSeq, 3);
      assert.equal(next.reset, true);
    });

    void test('reads Top Traders and its shared qualification cohort', async () => {
      const page = await mobile.getTopTradersFeed({ viewAs, limit: 2 });
      assertPage(page);
      assert.equal(page.rankingVersion, 'chronological-v1');
      assert.equal(page.cohort.coverage.complete, true);
      assert.ok(['ready', 'stale'].includes(page.cohort.status));
      for (const item of page.items) {
        const badge = item.author.traderBadge;
        if (badge !== null) {
          assert.ok(badge.pnl.gt('10000000000000000000000'));
          assert.equal(badge.snapshotId, page.cohort.snapshotId);
        }
      }
    });

    void test('reads Friends and updates without a wallet, including an unregistered account', async () => {
      const account = privateKeyToAccount(generatePrivateKey());
      const empty = await mobile.getFriendsFeed({
        viewAs: {
          subaccountOwner: account.address,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
        limit: 2,
      });
      assertPage(empty);
      assert.equal(empty.items.length, 0);
      const friends = await mobile.getFriendsFeed({ viewAs, limit: 2 });
      assertPage(friends);
      assert.equal(friends.rankingVersion, 'chronological-v1');
      const { viewerToken, sessionId } = friends.readSession;
      assert.ok(viewerToken);
      for (const item of friends.items)
        assert.equal(item.author.isFollowing, true);
      if (friends.nextCursor !== null) {
        const next = await mobile.getFriendsFeed({
          viewAs,
          limit: 2,
          sessionId,
          viewerToken,
          cursor: friends.nextCursor,
        });
        assertPage(next);
        assert.equal(next.readSession.sessionId, sessionId);
      }
      const updates = await mobile.getFeedUpdates({
        viewerToken,
        sessionId,
        visibleItemIds: [],
        visiblePositionIds: [],
        viewportRevision: 0,
        requestSeq: 1,
      });
      assert.equal(updates.requestSeq, 1);
    });

    void test('reads a public profile and its session updates without a wallet', async () => {
      const page = await mobile.getProfileFeed({
        subaccount: viewAs,
        viewAs,
        limit: 2,
      });
      assertPage(page);
      const { viewerToken } = page.readSession;
      assert.ok(viewerToken);
      const updates = await mobile.getFeedUpdates({
        viewerToken,
        sessionId: page.readSession.sessionId,
        visibleItemIds: page.items.map((item) => item.id),
        visiblePositionIds: [],
        viewportRevision: 0,
        requestSeq: 1,
      });
      assert.equal(updates.requestSeq, 1);
    });

    void test('reads market content', async () => {
      const page = await mobile.getMarketFeed({
        productId: TEST_PRODUCT_IDS.PERP_BTC,
        viewAs,
        limit: 2,
      });
      assertPage(page);
      for (const item of page.items)
        assert.equal(item.market.productId, TEST_PRODUCT_IDS.PERP_BTC);
    });

    void test('reads a real author, position, and direct item session', async (context) => {
      const page = await mobile.getForYouFeed({ limit: 2 });
      const item = page.items.find((candidate) => candidate.kind !== 'reply');
      if (!item) {
        context.skip(
          'No published feed item is available to select an author and position.',
        );
        return;
      }
      const authorPage = await mobile.getProfileFeed({
        subaccount: subaccountFromHex(item.author.subaccount),
        viewAs,
        limit: 2,
      });
      assertPage(authorPage);
      const positionId =
        item.kind === 'trade_row' ? item.positionId : item.position.positionId;
      assertPage(
        await mobile.getPositionFeed({ positionId, viewAs, limit: 2 }),
      );
      const detail = await mobile.getFeedItem({
        itemId: item.id,
        commentPreviewLimit: 0,
        viewAs,
      });
      debugPrint('Feed item', detail.item);
      assert.ok(
        detail.item,
        'Feed item details must not contain an undefined item',
      );
      assert.equal(detail.item.id, item.id);
      assert.equal(detail.item.kind, item.kind);
      assert.equal(detail.readSession.mode, 'item');
      assert.ok(detail.readSession.viewerToken);
      const updates = await mobile.getFeedUpdates({
        sessionId: detail.readSession.sessionId,
        viewerToken: detail.readSession.viewerToken,
        visibleItemIds: [item.id],
        visiblePositionIds: [positionId],
        viewportRevision: 0,
        requestSeq: 1,
      });
      assert.equal(updates.newItemsCount, 0);
    });

    void test('returns the social feed validation error for an invalid page size', async () => {
      await assertRejectsWithMobileErrorCode(
        () => mobile.getForYouFeed({ limit: 51 }),
        MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS,
      );
    });
  },
);

function assertPage(page: MobileSocialFeedPage) {
  // Keep the anonymous session credential out of test logs.
  debugPrint('Social feed page', {
    items: page.items,
    nextCursor: page.nextCursor,
    watermark: page.watermark,
    sessionMode: page.readSession.mode,
    expiresAtMs: page.readSession.expiresAtMs,
  });
  assert.ok(Array.isArray(page.items));
  assert.ok(page.items.length <= 2);
  assert.equal(typeof page.watermark, 'string');
  assert.equal(typeof page.readSession.sessionId, 'string');
  assert.equal(page.readSession.mode, 'feed');
  assertNonEmptyString(
    page.readSession.viewerToken,
    'page.readSession.viewerToken',
  );
  assert.ok(Number.isSafeInteger(page.readSession.expiresAtMs));
  assert.ok(page.nextCursor === null || typeof page.nextCursor === 'string');
  for (const item of page.items) {
    assert.ok(item, 'Feed pages must not contain undefined items');
    assertEnumMember(
      item.kind,
      ['trade_card', 'trade_row', 'post', 'reply'],
      'item.kind',
    );
    assertFeedAuthor(item.author);
    assert.ok(BigInt(item.version) > 0n);
    if (item.kind !== 'trade_row' && item.interaction.likedByMe !== null) {
      assertBoolean(item.interaction.likedByMe, 'item.interaction.likedByMe');
    }
    assertBoolean(item.capabilities.canLike, 'item.capabilities.canLike');
    assertBoolean(item.capabilities.canComment, 'item.capabilities.canComment');
    assertBoolean(
      item.capabilities.canRecordView,
      'item.capabilities.canRecordView',
    );
    const position =
      item.kind === 'reply'
        ? item.attachedPosition
        : item.kind === 'trade_row'
          ? null
          : item.position;
    const quantity =
      item.kind === 'trade_row' ? item.quantity : position?.quantity;
    if (quantity !== undefined) {
      assertBigNumberFinite(quantity, 'item.quantity');
      assert.ok(quantity.isInteger());
    }
    const price =
      item.kind === 'trade_row' ? item.averagePrice : position?.entryPrice;
    if (price != null) assertBigNumberFinite(price, 'item.price');
  }
}

function assertFeedAuthor(author: MobileSocialFeedAuthor) {
  assertMobileIdentitySummaryShape(author, 'author');
  if (author.isFollowing !== null)
    assertBoolean(author.isFollowing, 'author.isFollowing');
  assertEnumMember(
    author.traderDataStatus,
    ['ready', 'stale', 'unavailable'],
    'author.traderDataStatus',
  );
  if (author.traderBadge !== null) {
    assertEnumMember(
      author.traderBadge.code,
      ['shark', 'whale'],
      'author.traderBadge.code',
    );
    assertBigNumberFinite(author.traderBadge.pnl, 'author.traderBadge.pnl');
  }
}
