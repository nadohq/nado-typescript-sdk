import {
  GetMobileFeedCommentsParams,
  GetMobileFeedItemParams,
  MOBILE_ERROR_CODES,
  MOBILE_SOCIAL_FEED_TIP_ENABLED_TYPES,
  MobileClient,
  MobileServerFailureError,
  MobileSocialFeedCommentsPage,
  MobileSocialFeedReply,
  MobileSocialFeedTip,
  MobileSocialFeedTipEnabledType,
} from '@nadohq/mobile-client';
import { Subaccount, subaccountToHex } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, beforeEach, describe, test, TestContext } from 'node:test';
import { asRecord } from '../utils/asRecord';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertArray,
  assertBoolean,
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertNullableString,
} from '../utils/assertions';
import { capturePublicQuery } from '../utils/capturePublicQuery';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';

const tipEnabledFeedTypes: MobileSocialFeedTipEnabledType[] = [
  ...MOBILE_SOCIAL_FEED_TIP_ENABLED_TYPES,
];
const tipOnlyFeedTypes: MobileSocialFeedTipEnabledType[] = ['tips'];

void describe(
  '[mobile-client]: public Tips and mixed threads',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let mobile: MobileClient;
    let viewAs: Subaccount;

    before(() => {
      const context = createTestContext();
      mobile = new MobileClient({ url: context.endpoints.mobile });
      viewAs = getMobileSignedParams(context);
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('reads mixed For You and Friends feeds with the public Tip capability', async () => {
      for (const request of [
        () =>
          mobile.getForYouFeed({
            viewAs,
            includeTips: true,
            feedTypes: tipEnabledFeedTypes,
            limit: 20,
          }),
        () =>
          mobile.getFriendsFeed({
            viewAs,
            includeTips: true,
            feedTypes: tipEnabledFeedTypes,
            limit: 20,
          }),
      ]) {
        const page = await capturePublicQuery(mobile, request);
        const wireItems = page.wire.items;
        assertArray(wireItems, 'wire Feed items');
        assert.deepEqual(
          page.result.items.map((item) => item.id),
          wireItems.map((item) => asRecord(item).id),
        );
        for (const [index, item] of page.result.items.entries()) {
          if (item.kind === 'tip')
            assertPublicTip(item, asRecord(wireItems[index]));
        }
      }
    });

    void test('filters public Tips and rejects the filter without its capability', async () => {
      const page = await capturePublicQuery(mobile, () =>
        mobile.getForYouFeed({
          viewAs,
          includeTips: true,
          feedTypes: tipOnlyFeedTypes,
          limit: 20,
        }),
      );
      const wireItems = page.wire.items;
      assertArray(wireItems, 'wire Tip items');
      assert.deepEqual(
        page.result.items.map((item) => item.id),
        wireItems.map((item) => asRecord(item).id),
      );
      for (const [index, item] of page.result.items.entries()) {
        assert.ok(item.kind === 'tip');
        assertPublicTip(item, asRecord(wireItems[index]));
      }
      if (page.result.nextCursor !== null) {
        const next = await mobile.getForYouFeed({
          viewAs,
          feedTypes: tipOnlyFeedTypes,
          limit: 20,
          cursor: page.result.nextCursor,
          sessionId: page.result.readSession.sessionId,
          viewerToken: page.result.readSession.viewerToken,
        });
        assert.equal(
          next.readSession.sessionId,
          page.result.readSession.sessionId,
        );
        for (const item of next.items) assert.equal(item.kind, 'tip');
      }
      await assertRejectsWithMobileErrorCode(
        () => mobile.getForYouFeed({ feedTypes: tipOnlyFeedTypes, limit: 1 }),
        MOBILE_ERROR_CODES.INVALID_FEED_FILTER,
      );
    });

    void test('returns typed service validation errors for missing or conflicting item selectors', async () => {
      for (const params of [
        { includeTips: true },
        { includeTips: true, itemId: randomUUID(), tipId: randomUUID() },
      ]) {
        await assertRejectsWithMobileErrorCode(
          // Simulate JavaScript callers that cannot rely on the client selector union.
          () =>
            mobile.getFeedItem(params as unknown as GetMobileFeedItemParams),
          MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS,
        );
      }
    });

    void test('returns typed service validation errors for conflicting comment anchors and cursors', async () => {
      const rootItemId = randomUUID();
      const anchorReplyId = randomUUID();
      const anchorTipItemId = randomUUID();
      for (const selectors of [
        { anchorReplyId, anchorTipItemId },
        { cursor: 'invalid-cursor', anchorReplyId },
        { cursor: 'invalid-cursor', anchorTipItemId },
      ]) {
        await assertRejectsWithMobileErrorCode(
          () =>
            mobile.getFeedComments({
              rootItemId,
              includeTips: true,
              ...selectors,
            } as unknown as GetMobileFeedCommentsParams),
          MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS,
        );
      }
    });

    void test('resolves a live Tip by payment ID and public Feed ID with inherited capability', async (testContext) => {
      const detail = await getLiveTipDetail(mobile, viewAs, testContext);
      if (!detail) return;
      const byItemId = await capturePublicQuery(mobile, () =>
        mobile.getFeedItem({
          itemId: detail.item.id,
          sessionId: detail.readSession.sessionId,
          viewerToken: detail.readSession.viewerToken,
          viewAs,
        }),
      );
      assert.ok(byItemId.result.item.kind === 'tip');
      assertPublicTip(byItemId.result.item, asRecord(byItemId.wire.item));
      assert.equal(byItemId.result.item.tipId, detail.item.tipId);
      assert.equal(
        byItemId.result.readSession.sessionId,
        detail.readSession.sessionId,
      );
    });

    void test('reads standalone Tip comments and inherits the capability while paging', async (testContext) => {
      const detail = await getLiveTipDetail(mobile, viewAs, testContext);
      if (!detail) return;
      const page = await mobile.getFeedComments({
        rootItemId: detail.item.id,
        viewAs,
        includeTips: true,
        limit: 2,
      });
      assertCommentPage(page, detail.item.id);
      assert.equal(page.anchorTipItemId, null);
      for (const group of page.comments) {
        assert.ok(group.kind === 'reply');
        assertTipReply(group, detail.item.id);
        for (const reply of group.replies)
          assertTipReply(reply, detail.item.id);
      }
      if (page.nextCursor !== null) {
        const next = await mobile.getFeedComments({
          rootItemId: detail.item.id,
          viewAs,
          sessionId: page.readSession.sessionId,
          viewerToken: page.readSession.viewerToken,
          cursor: page.nextCursor,
          limit: 2,
        });
        assertCommentPage(next, detail.item.id);
        assert.equal(next.readSession.sessionId, page.readSession.sessionId);
        const firstIds = new Set(page.comments.map((group) => group.id));
        for (const group of next.comments) assert.ok(!firstIds.has(group.id));
      }
      const firstReply = page.comments[0];
      if (firstReply) {
        const anchored = await mobile.getFeedComments({
          rootItemId: detail.item.id,
          viewAs,
          sessionId: page.readSession.sessionId,
          viewerToken: page.readSession.viewerToken,
          anchorReplyId: firstReply.id,
          limit: 2,
        });
        assertCommentPage(anchored, detail.item.id);
        assert.equal(anchored.anchorReplyId, firstReply.id);
        assert.ok(
          anchored.comments.some((group) => group.id === firstReply.id),
        );
      }
    });

    void test('anchors an original-post mixed thread to the Tip public Feed ID', async (testContext) => {
      const detail = await getLiveTipDetail(mobile, viewAs, testContext, true);
      if (!detail) return;
      const rootItemId = detail.item.originPostId;
      assert.ok(rootItemId);
      let page: MobileSocialFeedCommentsPage;
      try {
        const captured = await capturePublicQuery(mobile, () =>
          mobile.getFeedComments({
            rootItemId,
            viewAs,
            includeTips: true,
            anchorTipItemId: detail.item.id,
            limit: 2,
          }),
        );
        page = captured.result;
        const wireGroups = captured.wire.comments;
        assertArray(wireGroups, 'wire mixed thread groups');
        assert.deepEqual(
          page.comments.map((group) => ({
            id: group.id,
            kind: group.kind,
            replies: group.replies.map((reply) => reply.id),
          })),
          wireGroups.map((value) => {
            const group = asRecord(value);
            assertArray(group.replies, 'wire group replies');
            return {
              id: group.id,
              kind: group.kind,
              replies: group.replies.map((reply) => asRecord(reply).id),
            };
          }),
        );
      } catch (error: unknown) {
        if (isContentUnavailable(error)) {
          testContext.skip(
            'The selected Tip origin became unreadable after discovery.',
          );
          return;
        }
        throw error;
      }
      assertCommentPage(page, rootItemId);
      assert.equal(page.anchorTipItemId, detail.item.id);
      assert.equal(page.anchorReplyId, null);
      const tipGroup = page.comments.find(
        (group) => group.id === detail.item.id,
      );
      assert.ok(tipGroup?.kind === 'tip');
      assert.equal(tipGroup.tipId, detail.item.tipId);
      assertPublicTip(tipGroup);
    });

    void test('reads Tip update patches using its Tip-enabled detail session', async (testContext) => {
      const detail = await getLiveTipDetail(mobile, viewAs, testContext);
      if (!detail) return;
      const updates = await capturePublicQuery(mobile, () =>
        mobile.getFeedUpdates({
          sessionId: detail.readSession.sessionId,
          viewerToken: detail.readSession.viewerToken,
          visibleItemIds: [detail.item.id],
          visiblePositionIds: [],
          viewportRevision: 0,
          requestSeq: 1,
        }),
      );
      const wirePatches = updates.wire.item_patches;
      assertArray(wirePatches, 'wire Tip patches');
      const wirePatch = wirePatches
        .map((patch) => asRecord(patch, 'wire Tip patch'))
        .find((patch) => patch.item_id === detail.item.id);
      const patch = updates.result.itemPatches.find(
        (candidate) => candidate.itemId === detail.item.id,
      );
      if (!wirePatch) {
        assert.ok(
          updates.result.unavailableTargets.some(
            (target) => target.id === detail.item.id,
          ),
          'A readable Tip must produce its requested update patch.',
        );
        testContext.skip(
          'The selected Tip no longer produces a readable update patch.',
        );
        return;
      }
      assert.ok(patch);
      for (const [clientKey, wireKey] of [
        ['originPostId', 'origin_post_id'],
        ['originAvailability', 'origin_availability'],
        ['original', 'original'],
        ['sender', 'sender'],
        ['recipient', 'recipient'],
      ] as const) {
        assert.equal(
          Object.hasOwn(patch, clientKey),
          Object.hasOwn(wirePatch, wireKey),
        );
      }
      assert.equal(patch.originPostId, wirePatch.origin_post_id);
      assert.equal(patch.originAvailability, wirePatch.origin_availability);
      if (patch.sender)
        assert.equal(
          subaccountToHex(patch.sender.subaccount),
          asRecord(wirePatch.sender).subaccount,
        );
      if (patch.recipient)
        assert.equal(
          subaccountToHex(patch.recipient.subaccount),
          asRecord(wirePatch.recipient).subaccount,
        );
      if (patch.original === null) assert.equal(wirePatch.original, null);
      else if (patch.original)
        assert.equal(patch.original.id, asRecord(wirePatch.original).id);
    });
  },
);

async function getLiveTipDetail(
  mobile: MobileClient,
  viewAs: Subaccount,
  testContext: TestContext,
  requireOrigin = false,
) {
  const page = await mobile.getForYouFeed({
    viewAs,
    includeTips: true,
    feedTypes: tipOnlyFeedTypes,
    limit: 50,
  });
  const tip = page.items.find(
    (item): item is MobileSocialFeedTip =>
      item.kind === 'tip' &&
      (!requireOrigin ||
        (item.originPostId !== null &&
          item.originAvailability === 'available')),
  );
  if (!tip) {
    testContext.skip(
      requireOrigin
        ? 'No live public Tip has a readable original post.'
        : 'No live public Tip is available.',
    );
    return undefined;
  }
  try {
    const detail = await capturePublicQuery(mobile, () =>
      mobile.getFeedItem({ tipId: tip.tipId, includeTips: true, viewAs }),
    );
    assert.ok(detail.result.item.kind === 'tip');
    assertPublicTip(detail.result.item, asRecord(detail.wire.item));
    assert.equal(detail.result.item.id, tip.id);
    return { ...detail.result, item: detail.result.item };
  } catch (error: unknown) {
    if (isContentUnavailable(error)) {
      testContext.skip(
        'The selected public Tip became unreadable after discovery.',
      );
      return undefined;
    }
    throw error;
  }
}

function assertPublicTip(
  tip: MobileSocialFeedTip,
  wire?: Record<string, unknown>,
): void {
  assert.equal(tip.kind, 'tip');
  assert.notEqual(tip.id, tip.tipId);
  assertNonEmptyString(tip.id, 'Tip Feed ID');
  assertNonEmptyString(tip.tipId, 'Tip payment ID');
  assert.equal(tip.market, null);
  assert.equal(tip.drawing, null);
  assert.equal(tip.hasAnalysis, false);
  assert.equal(Object.hasOwn(tip, 'position'), false);
  assert.equal(tip.productId, 0);
  assert.equal(tip.visibility, 'public');
  assert.ok(BigNumber.isBigNumber(tip.netAmount));
  assert.ok(
    tip.netAmount.isFinite() &&
      tip.netAmount.isInteger() &&
      tip.netAmount.gt(0),
  );
  assertNullableString(tip.note, 'Tip note');
  assertNonEmptyString(tip.backgroundId, 'Tip background ID');
  assertNonEmptyString(tip.backgroundVersion, 'Tip background version');
  assert.equal(subaccountToHex(tip.sender.subaccount), tip.author.subaccount);
  for (const participant of [tip.sender, tip.recipient]) {
    assert.match(subaccountToHex(participant.subaccount), /^0x[0-9a-f]{64}$/i);
    assertNullableString(participant.displayName, 'participant.displayName');
    assertNullableString(participant.avatarUrl, 'participant.avatarUrl');
  }
  for (const timestamp of [
    tip.createdAtMs,
    tip.displayAtMs,
    tip.submittedAtMs,
    tip.creditedAtMs,
  ])
    assertNonNegativeInteger(timestamp, 'Tip timestamp');
  assertBoolean(tip.capabilities.canLike, 'Tip canLike');
  assertBoolean(tip.capabilities.canComment, 'Tip canComment');
  for (const reply of tip.commentPreview.items) assertTipReply(reply, tip.id);
  if (wire) {
    assert.equal(tip.netAmount.toFixed(), wire.net_amount_x18);
    assert.equal(tip.tipId, wire.tip_id);
    assert.equal(tip.originPostId, wire.origin_post_id);
    assert.equal(tip.originAvailability, wire.origin_availability);
    assert.equal(
      tip.original?.id ?? null,
      wire.original === null ? null : asRecord(wire.original).id,
    );
    const wirePreview = asRecord(wire.comment_preview);
    assertArray(wirePreview.items, 'wire Tip reply preview');
    assert.equal(tip.commentPreview.items.length, wirePreview.items.length);
    for (const [index, reply] of tip.commentPreview.items.entries()) {
      const wireReply = asRecord(wirePreview.items[index]);
      assert.equal(reply.id, wireReply.id);
      assert.equal(reply.market, wireReply.market);
      const wireOriginal = asRecord(wireReply.original);
      assert.equal(reply.original.id, wireOriginal.id);
      assert.equal(reply.original.position, wireOriginal.position);
      assert.equal(reply.original.textExcerpt, wireOriginal.text_excerpt);
    }
  }
}

function assertTipReply(reply: MobileSocialFeedReply, tipItemId: string): void {
  assert.equal(reply.kind, 'reply');
  assert.equal(reply.market, null);
  assert.equal(reply.rootItemId, tipItemId);
  assert.equal(reply.original.id, tipItemId);
  assert.equal(reply.original.position, null);
}

function assertCommentPage(
  page: MobileSocialFeedCommentsPage,
  rootItemId: string,
): void {
  assert.equal(Object.hasOwn(page, 'anchorTipItemId'), true);
  assertNonNegativeInteger(page.totalCount, 'totalCount');
  assertNonNegativeInteger(page.topLevelCount, 'topLevelCount');
  assert.ok(page.totalCount >= page.topLevelCount);
  assert.ok(page.topLevelCount >= page.comments.length);
  assert.ok(
    page.totalCount >=
      page.comments.reduce(
        (count, group) => count + 1 + group.replies.length,
        0,
      ),
  );
  const ids = new Set<string>();
  for (const group of page.comments) {
    assert.ok(group.kind === 'reply' || group.kind === 'tip');
    if (group.kind === 'tip') assertPublicTip(group);
    else assert.equal(group.rootItemId, rootItemId);
    assert.ok(!ids.has(group.id));
    ids.add(group.id);
    for (const reply of group.replies) {
      assert.equal(reply.kind, 'reply');
      assert.equal(
        reply.rootItemId,
        group.kind === 'tip' ? group.id : rootItemId,
      );
      if (group.kind === 'tip') assertTipReply(reply, group.id);
      assert.equal(Object.hasOwn(reply, 'replies'), false);
      assert.ok(!ids.has(reply.id));
      ids.add(reply.id);
    }
  }
}

function isContentUnavailable(error: unknown): boolean {
  return (
    error instanceof MobileServerFailureError &&
    error.errorCode === MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE
  );
}
