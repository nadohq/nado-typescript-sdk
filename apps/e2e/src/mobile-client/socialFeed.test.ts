import {
  MOBILE_CLIENT_ENDPOINTS,
  MOBILE_ERROR_CODES,
  MobileClient,
  MobileServerFailureError,
  MobileSignedRequestParams,
  MobileSocialFeedPage,
} from '@nadohq/mobile-client';
import { NADO_DEPLOYMENTS, subaccountFromHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';

// A fresh, unfunded owner only authenticates read queries. No trading or state mutations are performed.
const account = privateKeyToAccount(generatePrivateKey());
const mobile = new MobileClient({
  url: MOBILE_CLIENT_ENDPOINTS.inkMainnet,
  walletClient: createWalletClient({ account, chain: ink, transport: http() }),
});
mobile.axiosInstance.defaults.timeout = 15_000;
const viewAs = {
  subaccountOwner: '0x69fcc2832725d1d3b5544f9a89cf7404736c44d3' as const,
  subaccountName: 'default',
};
const auth: MobileSignedRequestParams = {
  subaccountOwner: account.address,
  subaccountName: 'default',
  chainId: ink.id,
  verifyingAddr: NADO_DEPLOYMENTS.inkMainnet.endpoint,
};

void describe(
  '[mobile-client]: F01 social feed (production, read-only)',
  { timeout: 120_000 },
  () => {
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
        visibleItemIds: page.items.map((item) => item.id),
        visiblePositionIds: [],
        viewportRevision: 0,
        requestSeq: 1,
      });
      assert.equal(updates.viewportRevision, 0);
      assert.equal(updates.requestSeq, 1);
      assert.equal(typeof updates.updateCursor, 'string');
      assert.ok(Array.isArray(updates.itemPatches));
      assert.ok(Array.isArray(updates.positionPatches));
      assert.ok(Array.isArray(updates.unavailableTargets));
    });

    void test('reads Top Traders and its shared qualification cohort', async () => {
      const page = await mobile.getTopTradersFeed({ viewAs, limit: 2 });
      assertPage(page);
      assert.equal(page.rankingVersion, 'chronological-v1');
      assert.equal(page.cohort.coverage.complete, true);
      assert.ok(['ready', 'stale'].includes(page.cohort.status));
      for (const item of page.items) {
        assert.ok(item.author.traderBadge.pnlX18.gt('10000000000000000000000'));
        assert.equal(
          item.author.traderBadge.snapshotId,
          page.cohort.snapshotId,
        );
      }
    });

    void test('reads Friends and updates without a wallet, including an unregistered account', async () => {
      const publicMobile = new MobileClient({
        url: MOBILE_CLIENT_ENDPOINTS.inkMainnet,
      });
      publicMobile.axiosInstance.defaults.timeout = 15_000;
      const empty = await publicMobile.getFriendsFeed({
        viewAs: { subaccountOwner: account.address, subaccountName: 'default' },
        limit: 2,
      });
      assertPage(empty);
      assert.equal(empty.items.length, 0);
      const friends = await publicMobile.getFriendsFeed({ viewAs, limit: 2 });
      assertPage(friends);
      assert.equal(friends.rankingVersion, 'chronological-v1');
      const { viewerToken, sessionId } = friends.readSession;
      assert.ok(viewerToken);
      for (const item of friends.items)
        assert.equal(item.author.isFollowing, true);
      if (friends.nextCursor !== null) {
        const next = await publicMobile.getFriendsFeed({
          viewAs,
          limit: 2,
          sessionId,
          viewerToken,
          cursor: friends.nextCursor,
        });
        assertPage(next);
        assert.equal(next.readSession.sessionId, sessionId);
      }
      const updates = await publicMobile.getFeedUpdates({
        viewerToken,
        sessionId,
        visibleItemIds: [],
        visiblePositionIds: [],
        viewportRevision: 0,
        requestSeq: 1,
      });
      assert.equal(updates.requestSeq, 1);
    });

    void test('retains explicit signed object reads and their session updates', async () => {
      const page = await mobile.getProfileFeed({
        subaccount: auth,
        auth,
        limit: 2,
      });
      assertPage(page);
      assert.equal(page.readSession.viewerToken, undefined);
      const updates = await mobile.getFeedUpdates({
        auth,
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
        productId: 2,
        viewAs,
        limit: 2,
      });
      assertPage(page);
      for (const item of page.items) assert.equal(item.market.productId, 2);
    });

    void test('reads a real author, position, and direct item session', async (context) => {
      const page = await mobile.getForYouFeed({ limit: 2 });
      const item = page.items[0];
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
        item.kind === 'trade_card' ? item.position.positionId : item.positionId;
      assertPage(
        await mobile.getPositionFeed({ positionId, viewAs, limit: 2 }),
      );
      const detail = await mobile.getFeedItem({
        itemId: item.id,
        commentPreviewLimit: 0,
        viewAs,
      });
      assert.equal(detail.item.id, item.id);
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
      const signedDetail = await mobile.getFeedItem({ auth, itemId: item.id });
      assert.equal(signedDetail.item.id, item.id);
      assert.equal(signedDetail.readSession.viewerToken, undefined);
    });

    void test('returns the F01 validation error for an invalid page size', async () => {
      await assert.rejects(
        mobile.getForYouFeed({ limit: 51 }),
        (error: unknown) => {
          assert.ok(error instanceof MobileServerFailureError);
          assert.equal(
            error.errorCode,
            MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS,
          );
          assert.equal(error.httpStatus, 400);
          return true;
        },
      );
    });
  },
);

function assertPage(page: MobileSocialFeedPage) {
  assert.ok(Array.isArray(page.items));
  assert.ok(page.items.length <= 2);
  assert.equal(typeof page.watermark, 'string');
  assert.equal(typeof page.readSession.sessionId, 'string');
  assert.equal(page.readSession.mode, 'feed');
  assert.ok(Number.isSafeInteger(page.readSession.expiresAtMs));
  assert.ok(page.nextCursor === null || typeof page.nextCursor === 'string');
  for (const item of page.items) {
    assert.ok(['trade_card', 'trade_row'].includes(item.kind));
    assert.ok(BigInt(item.version) > 0n);
    assert.equal(item.drawing, null);
    if (item.kind === 'trade_card')
      assert.equal(item.interaction.likedByMe, null);
    assert.equal(item.capabilities.canLike, false);
    assert.equal(item.capabilities.canComment, false);
    assert.equal(item.capabilities.canRecordView, false);
    const quantity =
      item.kind === 'trade_card' ? item.position.quantityX18 : item.quantityX18;
    assert.ok(quantity.isFinite() && quantity.isInteger());
  }
}
