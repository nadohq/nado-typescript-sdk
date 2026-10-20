import {
  getMobileNonce,
  MOBILE_ERROR_CODES,
  MobileClient,
  MobileServerFailureError,
  MobileSocialFeedItem,
  MobileSocialFeedPositionCard,
  MobileSocialFeedPublishablePosition,
  MobileSocialFeedReadSession,
} from '@nadohq/mobile-client';
import {
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  Subaccount,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertBigNumberFinite,
  assertBoolean,
  assertEnumMember,
  assertNonEmptyString,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: social content and position history',
  { timeout: TEST_TIMEOUTS.LONG * 3 },
  () => {
    let tc: RunContext;
    let mobile: MobileClient;
    let viewAs: Subaccount;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
      mobile = new MobileClient({ url: tc.endpoints.mobile });
      viewAs = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      };
    });

    void test('reads selected-account positions and resolves commands without a wallet', async () => {
      const positions = await mobile.getSelfFeedPositions({ viewAs, limit: 2 });
      debugPrint('Publishable positions', positions);
      assert.ok(positions.positions.length <= 2);
      assertNonNegativeInteger(positions.asOfMs, 'positions.asOfMs');
      for (const candidate of positions.positions) {
        assertPosition(candidate.position);
        assertBoolean(candidate.canPublish, 'candidate.canPublish');
        assertBoolean(
          candidate.canAttachToComment,
          'candidate.canAttachToComment',
        );
        assertBoolean(candidate.canDrawAnalysis, 'candidate.canDrawAnalysis');
      }
      if (positions.nextCursor !== null) {
        const next = await mobile.getSelfFeedPositions({
          viewAs,
          limit: 2,
          cursor: positions.nextCursor,
        });
        assert.ok(Array.isArray(next.positions));
      }
      const resolved = await mobile.resolveFeedPosition({
        viewAs,
        input: '/position',
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });
      debugPrint('Position command', resolved);
      assertEnumMember(
        resolved.resolution,
        ['resolved', 'choose_position', 'no_open_position'],
        'resolved.resolution',
      );
      for (const candidate of resolved.candidates)
        assertPosition(candidate.position);
      const unknown = await mobile.resolveFeedPosition({
        viewAs,
        input: '/sdkunknownmarket',
      });
      assert.equal(unknown.resolution, 'unknown_market');
      assert.equal(unknown.product, null);
      assert.deepEqual(unknown.candidates, []);
      assert.equal(unknown.reason, 'unknown_market');
    });

    void test('returns typed validation and missing-content errors from the new public reads', async () => {
      await assertRejectsWithMobileErrorCode(
        () => mobile.getSelfFeedPositions({ viewAs, limit: 51 }),
        MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS,
      );
      await assertRejectsWithMobileErrorCode(
        () =>
          mobile.resolveFeedAction({
            viewAs,
            orderDigest:
              '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          }),
        MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE,
      );
      const missingId = randomUUID();
      await assertRejectsWithMobileErrorCode(
        () => mobile.getFeedChartDrawing({ itemId: missingId }),
        MOBILE_ERROR_CODES.SOCIAL_FEED_DRAWING_UNAVAILABLE,
      );
      await assertRejectsWithMobileErrorCode(
        () => mobile.getPositionWatchers({ positionId: missingId }),
        MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE,
      );
    });

    void test('reads comment threads, anchors, pagination, and drawings using an existing item session', async (context) => {
      const page = await mobile.getForYouFeed({ viewAs, limit: 20 });
      const item = page.items.find(
        (candidate) => candidate.kind !== 'trade_row',
      );
      if (!item) {
        context.skip(
          'No published post, trade card, or reply is available for thread navigation.',
        );
        return;
      }
      const rootItemId = item.kind === 'reply' ? item.rootItemId : item.id;
      const detail = await mobile.getFeedItem({ itemId: rootItemId, viewAs });
      const session = getSessionParams(detail.readSession);
      const comments = await mobile.getFeedComments({
        rootItemId,
        ...session,
        limit: 1,
      });
      debugPrint('Comment page', {
        comments: comments.comments,
        totalCount: comments.totalCount,
        anchorReplyId: comments.anchorReplyId,
      });
      assert.equal(comments.readSession.sessionId, session.sessionId);
      assert.equal(comments.readSession.viewerToken, session.viewerToken);
      assert.equal(comments.anchorReplyId, null);
      assertNonNegativeInteger(comments.totalCount, 'comments.totalCount');
      for (const comment of comments.comments) {
        assert.equal(comment.kind, 'reply');
        assert.equal(comment.rootItemId, rootItemId);
        assertEnumMember(
          comment.attachmentStatus,
          ['none', 'visible', 'unavailable'],
          'comment.attachmentStatus',
        );
      }
      if (comments.nextCursor !== null) {
        const next = await mobile.getFeedComments({
          rootItemId,
          ...session,
          limit: 1,
          cursor: comments.nextCursor,
        });
        assert.equal(next.readSession.sessionId, session.sessionId);
      }
      if (comments.comments[0]) {
        const anchored = await mobile.getFeedComments({
          rootItemId,
          ...session,
          anchorReplyId: comments.comments[0].id,
          limit: 1,
        });
        assert.equal(anchored.anchorReplyId, comments.comments[0].id);
        assert.ok(
          anchored.comments.some(
            (comment) => comment.id === comments.comments[0].id,
          ),
        );
        if (anchored.previousCursor !== null) {
          const previous = await mobile.getFeedComments({
            rootItemId,
            ...session,
            cursor: anchored.previousCursor,
            limit: 1,
          });
          assert.equal(previous.readSession.sessionId, session.sessionId);
        }
      }
      const drawing = await mobile.getFeedChartDrawing({
        itemId: rootItemId,
        ...session,
      });
      assert.equal(drawing.itemId, rootItemId);
      assertNonEmptyString(drawing.itemVersion, 'drawing.itemVersion');
      if (drawing.drawing !== null)
        assert.ok(Object.hasOwn(drawing.drawing, 'data'));
      const updates = await mobile.getFeedUpdates({
        ...session,
        visibleItemIds: comments.comments.map((comment) => comment.id),
        visiblePositionIds: [],
        viewportRevision: 0,
        requestSeq: 1,
      });
      assert.equal(updates.newItemsCount, 0);
    });

    void test('navigates full history, chart, updates, and per-page watcher leases', async (context) => {
      const page = await mobile.getForYouFeed({ viewAs, limit: 20 });
      const item = page.items.find(
        (candidate) => getPositionId(candidate) !== undefined,
      );
      const positionId = item && getPositionId(item);
      if (!positionId) {
        context.skip(
          'No readable position is available in the published feed.',
        );
        return;
      }
      const history = await mobile.getPositionHistory({
        positionId,
        viewAs,
        limit: 2,
      });
      const session = getSessionParams(history.readSession);
      debugPrint('Position history', {
        position: history.position,
        summary: history.summary,
        timeline: history.timeline,
        tradingContext: history.tradingContext,
      });
      assert.equal(history.readSession.mode, 'position');
      assertPosition(history.position);
      assertNonNegativeInteger(
        history.summary.actionCount,
        'summary.actionCount',
      );
      assertNonNegativeInteger(history.summary.takeCount, 'summary.takeCount');
      for (const entry of history.timeline) {
        if (entry.kind === 'action') {
          assertBigNumberFinite(
            entry.action.executedQuantity,
            'action.executedQuantity',
          );
          if (entry.action.averagePrice !== null)
            assertBigNumberFinite(
              entry.action.averagePrice,
              'action.averagePrice',
            );
        } else {
          assertEnumMember(
            entry.item.kind,
            ['post', 'trade_card'],
            'entry.item.kind',
          );
        }
      }
      if (history.nextCursor !== null) {
        const next = await mobile.getPositionHistory({
          positionId,
          ...session,
          cursor: history.nextCursor,
          limit: 2,
        });
        assert.equal(next.readSession.sessionId, session.sessionId);
      }
      const toMs = Date.now();
      const range = { fromMs: toMs - 24 * 60 * 60 * 1000, toMs };
      const chart = await mobile.getPositionChart({
        positionId,
        ...session,
        interval: '1h',
        range,
        limit: 2,
      });
      debugPrint('Position chart', chart);
      assertEnumMember(
        chart.dataQuality,
        ['ready', 'partial'],
        'chart.dataQuality',
      );
      for (const candle of chart.candles) {
        assertBigNumberFinite(candle.open, 'candle.open');
        assertBigNumberFinite(candle.volume, 'candle.volume');
        assert.ok(candle.volume.isInteger());
      }
      if (chart.nextBeforeMs !== null) {
        const next = await mobile.getPositionChart({
          positionId,
          ...session,
          interval: '1h',
          range,
          limit: 2,
          beforeMs: chart.nextBeforeMs,
        });
        for (const candle of next.candles)
          assert.ok(candle.timestampMs < chart.nextBeforeMs);
      }
      const viewSessionId = randomUUID();
      try {
        const presence = await mobile.setPositionPresence({
          positionId,
          ...session,
          viewSessionId,
          state: 'watching',
          watcherSubaccount: viewAs,
        });
        assert.ok(presence.watcherCount >= 1);
        assert.ok(presence.heartbeatIntervalSeconds > 0);
        assert.ok(presence.expiresInSeconds > 0);
        const preserved = await mobile.setPositionPresence({
          positionId,
          ...session,
          viewSessionId,
          state: 'heartbeat',
        });
        assert.ok(preserved.watcherCount >= 1);
        const anonymous = await mobile.setPositionPresence({
          positionId,
          ...session,
          viewSessionId,
          state: 'heartbeat',
          watcherSubaccount: null,
        });
        assert.ok(anonymous.watcherCount >= 1);
        const watchers = await mobile.getPositionWatchers({
          positionId,
          viewAs,
        });
        debugPrint('Position watchers', watchers);
        assert.ok(watchers.watcherCount >= 1);
        assertNonNegativeInteger(watchers.asOfMs, 'watchers.asOfMs');
        const updates = await mobile.getFeedUpdates({
          ...session,
          visibleItemIds: [],
          visiblePositionIds: [positionId],
          viewportRevision: 0,
          requestSeq: 1,
        });
        assert.equal(updates.newItemsCount, 0);
      } finally {
        await mobile.setPositionPresence({
          positionId,
          ...session,
          viewSessionId,
          state: 'left',
        });
      }
    });

    void test('publishes idempotently, adds and replaces drawing data, comments, likes, and records exposures', async (context) => {
      context.after(async () => {
        await cleanupTestState(
          { engine: tc.engine, trigger: tc.trigger },
          {
            subaccountOwner: tc.walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
            endpointAddr: tc.endpointAddr,
            chainId: tc.chainId,
          },
        );
      });
      const candidate = await openPublishablePosition(tc, mobile, viewAs);
      const signed = getMobileSignedParams(tc);
      const params = {
        ...signed,
        clientRequestId: randomUUID(),
        positionId: candidate.position.positionId,
        text: 'SDK integration verification',
        mentions: [],
      };
      const post = await tc.mobile.createFeedPost(params);
      assert.equal(post.kind, 'post');
      assert.equal((await tc.mobile.createFeedPost(params)).id, post.id);
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.createFeedPost({
            ...params,
            text: 'Different retry content',
          }),
        MOBILE_ERROR_CODES.SOCIAL_FEED_REQUEST_CONFLICT,
      );
      const drawingParams = {
        ...signed,
        itemId: post.id,
        dataJson: 'false',
        nonce: getMobileNonce(),
      };
      const created = await tc.mobile.createFeedChartDrawing(drawingParams);
      assert.equal(created.drawing.data, false);
      assert.deepEqual(
        await tc.mobile.createFeedChartDrawing(drawingParams),
        created,
      );
      const updated = await tc.mobile.updateFeedChartDrawing({
        ...signed,
        itemId: post.id,
        dataJson: '0',
      });
      assert.equal(updated.drawing.data, 0);
      assert.equal(
        (await mobile.getFeedChartDrawing({ itemId: post.id, viewAs })).drawing
          ?.data,
        0,
      );
      const commentParams = {
        ...signed,
        clientRequestId: randomUUID(),
        rootItemId: post.id,
        text: 'SDK comment verification',
        mentions: [],
      };
      const comment = await tc.mobile.createFeedComment(commentParams);
      assert.equal(comment.comment.rootItemId, post.id);
      assert.equal(
        (await tc.mobile.createFeedComment(commentParams)).comment.id,
        comment.comment.id,
      );
      const liked = await tc.mobile.setFeedLike({
        ...signed,
        itemId: post.id,
        isLiked: true,
      });
      assert.equal(liked.isLiked, true);
      const retriedLike = await tc.mobile.setFeedLike({
        ...signed,
        itemId: post.id,
        isLiked: true,
      });
      assert.deepEqual(retriedLike, liked);
      const unliked = await tc.mobile.setFeedLike({
        ...signed,
        itemId: post.id,
        isLiked: false,
      });
      assert.equal(unliked.isLiked, false);
      const detail = await mobile.getFeedItem({ itemId: post.id, viewAs });
      const session = getSessionParams(detail.readSession);
      await delay(detail.readSession.viewTracking.minDurationMs);
      const recorded = await mobile.recordFeedViews({
        ...session,
        itemIds: [post.id],
      });
      assert.ok(
        recorded.acceptedItemIds.includes(post.id) ||
          recorded.duplicateItemIds.includes(post.id),
      );
      const duplicate = await mobile.recordFeedViews({
        ...session,
        itemIds: [post.id],
      });
      assert.ok(duplicate.duplicateItemIds.includes(post.id));
      debugPrint('Published content verification', {
        postId: post.id,
        commentId: comment.comment.id,
        rootCommentCount: comment.rootCommentCount,
      });
    });
  },
);

async function openPublishablePosition(
  context: RunContext,
  mobile: MobileClient,
  viewAs: Subaccount,
): Promise<MobileSocialFeedPublishablePosition> {
  const productId = TEST_PRODUCT_IDS.PERP_BTC;
  const existing = await mobile.getSelfFeedPositions({
    viewAs,
    productId,
    limit: 50,
  });
  const existingIds = new Set(
    existing.positions.map((candidate) => candidate.position.positionId),
  );
  const markets = await context.engine.getAllMarkets();
  const market = markets.find((candidate) => candidate.productId === productId);
  assert.ok(
    market,
    'BTC perpetual market must exist to open the test position',
  );
  const amount = BigNumber.maximum(
    market.minSize.div(market.product.oraclePrice),
    market.sizeIncrement,
  )
    .div(market.sizeIncrement)
    .integerValue(BigNumber.ROUND_CEIL)
    .multipliedBy(market.sizeIncrement);
  const price = market.product.oraclePrice
    .multipliedBy(1.1)
    .div(market.priceIncrement)
    .integerValue(BigNumber.ROUND_CEIL)
    .multipliedBy(market.priceIncrement);
  const opened = await context.engine.placeOrder({
    productId,
    verifyingAddr: getOrderVerifyingAddress(productId),
    chainId: context.chainId,
    nonce: getOrderNonce(),
    order: {
      ...viewAs,
      amount,
      price,
      expiration: getExpiration(),
      appendix: packOrderAppendix({
        orderExecutionType: 'ioc',
        isolated: {
          margin: price
            .multipliedBy(amount)
            .div(5)
            .integerValue(BigNumber.ROUND_CEIL),
        },
      }),
    },
  });
  assert.equal(
    opened.status,
    'success',
    'IOC order should open the test position',
  );
  const deadline = Date.now() + TEST_TIMEOUTS.DEFAULT;
  while (Date.now() < deadline) {
    const positions = await mobile
      .getSelfFeedPositions({ viewAs, productId, limit: 50 })
      .catch((error: unknown) => {
        // The new fill is still being projected; poll again
        if (isFeedDataUnavailable(error)) return undefined;
        throw error;
      });
    const candidate = positions?.positions.find(
      (position) =>
        !existingIds.has(position.position.positionId) &&
        position.position.marginMode === 'isolated' &&
        position.canPublish &&
        position.canDrawAnalysis,
    );
    if (candidate) return candidate;
    await delay(TEST_DELAYS.LONG);
  }
  throw new Error(
    'The IOC order did not produce a new publishable position before the projection deadline',
  );
}

function isFeedDataUnavailable(error: unknown): boolean {
  return (
    error instanceof MobileServerFailureError &&
    error.errorCode === MOBILE_ERROR_CODES.SOCIAL_FEED_DATA_UNAVAILABLE
  );
}

function getPositionId(item: MobileSocialFeedItem): string | undefined {
  if (item.kind === 'trade_row') return item.positionId;
  if (item.kind === 'reply')
    return (
      item.attachedPosition?.positionId ?? item.original.position?.positionId
    );
  return item.position.positionId;
}

function getSessionParams(session: MobileSocialFeedReadSession) {
  assertNonEmptyString(session.sessionId, 'session.sessionId');
  assertNonEmptyString(session.viewerToken, 'session.viewerToken');
  return { sessionId: session.sessionId, viewerToken: session.viewerToken };
}

function assertPosition(position: MobileSocialFeedPositionCard) {
  assertNonEmptyString(position.positionId, 'position.positionId');
  assertBigNumberFinite(position.quantity, 'position.quantity');
  assertBigNumberFinite(position.notional, 'position.notional');
  assert.ok(position.quantity.isInteger());
  assert.ok(position.notional.isInteger());
  if (position.entryPrice !== null)
    assertBigNumberFinite(position.entryPrice, 'position.entryPrice');
  if (position.pnl.amount !== null)
    assertBigNumberFinite(position.pnl.amount, 'position.pnl.amount');
}
