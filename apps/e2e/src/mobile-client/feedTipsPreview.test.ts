import {
  MOBILE_ERROR_CODES,
  MobileClient,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import { Subaccount } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { before, describe, test, TestContext } from 'node:test';
import { assertArray } from '../utils/assertions';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[mobile-client]: Feed Tip preview fields',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let mobile: MobileClient;
    let viewAs: Subaccount;

    before(() => {
      const context = createTestContext();
      mobile = new MobileClient({ url: context.endpoints.mobile });
      viewAs = getMobileSignedParams(context);
    });

    void test('preserves live content detail capability and total from the same released API response', async (testContext) => {
      const detail = await getLiveContentDetail(mobile, viewAs, testContext);
      if (!detail) return;

      const wireItem = asRecord(detail.wire.item, 'wire detail item');
      assert.equal(
        typeof asRecord(wireItem.capabilities, 'wire capabilities').can_tip,
        'boolean',
      );
      assertPreviewFields(detail.result.item, wireItem);
    });

    void test('preserves optional capability and totals on live Feed list items', async (testContext) => {
      const page = await capturePublicQuery(mobile, () =>
        mobile.getForYouFeed({
          viewAs,
          limit: 10,
        }),
      );
      const wireItems = page.wire.items;
      assertArray(wireItems, 'wire Feed items');
      if (wireItems.length === 0) {
        testContext.skip('The released Feed has no readable items.');
        return;
      }
      assert.deepEqual(
        page.result.items.map((item) => item.id),
        wireItems.map((item) => asRecord(item, 'wire Feed item').id),
      );
      for (const [index, item] of page.result.items.entries()) {
        assertPreviewFields(item, asRecord(wireItems[index], 'wire Feed item'));
      }
    });

    void test('preserves optional capability and totals on live Friends Feed items', async (testContext) => {
      const page = await capturePublicQuery(mobile, () =>
        mobile.getFriendsFeed({ viewAs, limit: 10 }),
      );
      const wireItems = page.wire.items;
      assertArray(wireItems, 'wire Friends Feed items');
      if (wireItems.length === 0) {
        testContext.skip('The released Friends Feed has no readable items.');
        return;
      }
      assert.deepEqual(
        page.result.items.map((item) => item.id),
        wireItems.map((item) => asRecord(item, 'wire Friends Feed item').id),
      );
      for (const [index, item] of page.result.items.entries()) {
        assertPreviewFields(
          item,
          asRecord(wireItems[index], 'wire Friends Feed item'),
        );
      }
    });

    void test('preserves the selected live content preview in Feed update patches', async (testContext) => {
      const detail = await getLiveContentDetail(mobile, viewAs, testContext);
      if (!detail) return;

      const { sessionId, viewerToken } = detail.result.readSession;
      const itemId = detail.result.item.id;
      const updates = await capturePublicQuery(mobile, () =>
        mobile.getFeedUpdates({
          sessionId,
          viewerToken,
          visibleItemIds: [itemId],
          visiblePositionIds: [],
          updateCursor: null,
          viewportRevision: 0,
          requestSeq: 1,
        }),
      );
      const wirePatches = updates.wire.item_patches;
      assertArray(wirePatches, 'wire item patches');
      const wirePatch = wirePatches
        .map((patch) => asRecord(patch, 'wire item patch'))
        .find((patch) => patch.item_id === itemId);
      if (!wirePatch) {
        testContext.skip(
          'The selected live content did not produce a readable item patch.',
        );
        return;
      }
      const patch = updates.result.itemPatches.find(
        (item) => item.itemId === itemId,
      );
      assert.ok(patch, 'SDK updates must retain the selected content patch.');
      assert.equal(
        typeof asRecord(wirePatch.capabilities, 'wire capabilities').can_tip,
        'boolean',
      );
      assertPreviewFields(patch, wirePatch);
    });
  },
);

async function getLiveContentDetail(
  mobile: MobileClient,
  viewAs: Subaccount,
  testContext: TestContext,
) {
  const page = await mobile.getForYouFeed({ viewAs, limit: 10 });
  const item = page.items.find(
    (candidate) => candidate.kind === 'post' || candidate.kind === 'trade_card',
  );
  if (!item) {
    testContext.skip(
      'The live For You page has no readable post or trade card.',
    );
    return undefined;
  }
  try {
    const detail = await capturePublicQuery(mobile, () =>
      mobile.getFeedItem({
        itemId: item.id,
        viewAs,
        commentPreviewLimit: 0,
        sessionId: page.readSession.sessionId,
        viewerToken: page.readSession.viewerToken,
      }),
    );
    assert.equal(detail.result.item.id, item.id);
    assert.equal(detail.result.item.kind, item.kind);
    assert.equal(
      detail.result.readSession.sessionId,
      page.readSession.sessionId,
    );
    return detail;
  } catch (error: unknown) {
    if (
      error instanceof MobileServerFailureError &&
      error.errorCode === MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE
    ) {
      testContext.skip(
        'The selected content became unavailable after the live For You read.',
      );
      return undefined;
    }
    throw error;
  }
}

async function capturePublicQuery<T>(
  mobile: MobileClient,
  request: () => Promise<T>,
): Promise<{ result: T; wire: Record<string, unknown> }> {
  let responseData: unknown;
  let responseCount = 0;
  // Observe the actual live response so a concurrent Tip cannot change a separately fetched reference.
  const interceptor = mobile.axiosInstance.interceptors.response.use(
    (response) => {
      responseData = response.data;
      responseCount += 1;
      assert.ok(response.config.url?.endsWith('/public_query'));
      return response;
    },
  );
  try {
    const result = await request();
    assert.equal(responseCount, 1);
    const wire = asRecord(responseData, 'released response');
    assert.equal(wire.status, 'success');
    return { result, wire };
  } finally {
    mobile.axiosInstance.interceptors.response.eject(interceptor);
  }
}

function assertPreviewFields(
  mapped: unknown,
  wire: Record<string, unknown>,
): void {
  const client = asRecord(mapped, 'SDK item or patch');
  assert.equal(
    Object.hasOwn(client, 'capabilities'),
    Object.hasOwn(wire, 'capabilities'),
  );
  if (Object.hasOwn(wire, 'capabilities')) {
    const wireCapabilities = asRecord(wire.capabilities, 'wire capabilities');
    const capabilities = asRecord(client.capabilities, 'SDK capabilities');
    assert.equal(capabilities.canLike, wireCapabilities.can_like);
    assert.equal(capabilities.canComment, wireCapabilities.can_comment);
    assert.equal(capabilities.canRecordView, wireCapabilities.can_record_view);
    assert.equal(
      Object.hasOwn(capabilities, 'canTip'),
      Object.hasOwn(wireCapabilities, 'can_tip'),
    );
    if (Object.hasOwn(wireCapabilities, 'can_tip')) {
      assert.equal(typeof wireCapabilities.can_tip, 'boolean');
      assert.equal(capabilities.canTip, wireCapabilities.can_tip);
    }
  }
  assert.equal(
    Object.hasOwn(client, 'publicTipTotal'),
    Object.hasOwn(wire, 'public_tip_total_x18'),
  );
  if (Object.hasOwn(wire, 'public_tip_total_x18')) {
    assert.equal(typeof wire.public_tip_total_x18, 'string');
    assert.match(wire.public_tip_total_x18 as string, /^(0|[1-9]\d*)$/);
    const total = client.publicTipTotal;
    assert.ok(
      BigNumber.isBigNumber(total),
      'The Tip total must remain an exact BigNumber in x18 units.',
    );
    assert.ok(total.isFinite() && total.isInteger() && total.gte(0));
    assert.equal(total.toFixed(), wire.public_tip_total_x18);
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  assert.ok(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object.`,
  );
  return value as Record<string, unknown>;
}
