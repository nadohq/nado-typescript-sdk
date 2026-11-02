import {
  MOBILE_SOCIAL_FEED_FUNDING_BASES,
  MOBILE_SOCIAL_FEED_ROI_BASIS_QUALITIES,
  MOBILE_SOCIAL_FEED_ROI_BASIS_TYPES,
  MobileClient,
  MobileSocialFeedPositionCard,
  MobileSocialFeedRoiBasis,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { assertBigNumberFinite, assertEnumMember } from '../utils/assertions';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[mobile-client]: position financial fields',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let mobile: MobileClient;

    before(() => {
      mobile = new MobileClient({ url: createTestContext().endpoints.mobile });
    });

    void test('omits initial feed ROI, retains history ROI, and supplies ROI through each session update', async (context) => {
      const page = await mobile.getForYouFeed({ limit: 20 });
      for (const item of page.items) {
        if (item.kind === 'post' || item.kind === 'trade_card')
          assertNoRoi(item.position);
        if (item.kind === 'reply' && item.attachedPosition)
          assertNoRoi(item.attachedPosition);
        if (item.kind === 'post' || item.kind === 'trade_card') {
          for (const comment of item.commentPreview.items) {
            if (comment.attachedPosition) assertNoRoi(comment.attachedPosition);
          }
        }
      }
      const item = page.items.find(
        (candidate) =>
          candidate.kind === 'post' || candidate.kind === 'trade_card',
      );
      if (!item || (item.kind !== 'post' && item.kind !== 'trade_card')) {
        context.skip(
          'No published position card is available to verify financial fields.',
        );
        return;
      }
      const positionId = item.position.positionId;
      const history = await mobile.getPositionHistory({ positionId, limit: 2 });
      assertRoi(history.position.roiBasis);
      for (const entry of history.timeline) {
        const take = entry.kind === 'take' ? entry.item : entry.relatedTake;
        if (take) {
          assertRoi(take.position.roiBasis);
          for (const comment of take.commentPreview.items) {
            if (comment.attachedPosition)
              assertRoi(comment.attachedPosition.roiBasis);
          }
        }
      }
      const recent = await mobile.getPositionHistoryAll({ positionId });
      assertNoRoi(recent.position);
      for (const result of [history, recent]) {
        assertEnumMember(
          result.position.fundingBasis,
          MOBILE_SOCIAL_FEED_FUNDING_BASES,
          'fundingBasis',
        );
        if (result.position.fundingPnl !== null)
          assertBigNumberFinite(result.position.fundingPnl, 'fundingPnl');
      }
      for (const result of [page, history, recent]) {
        const updates = await mobile.getFeedUpdates({
          sessionId: result.readSession.sessionId,
          viewerToken: result.readSession.viewerToken,
          updateCursor: null,
          visibleItemIds: result === page ? [item.id] : [],
          visiblePositionIds: [positionId],
          viewportRevision: 0,
          requestSeq: 1,
        });
        const patch = updates.positionPatches.find(
          (candidate) => candidate.positionId === positionId,
        );
        assert.ok(patch, 'Reset must include the visible position');
        assertRoi(patch.roiBasis);
        if (result !== page) {
          assert.ok(patch.currentPosition);
          assertEnumMember(
            patch.currentPosition.fundingBasis,
            MOBILE_SOCIAL_FEED_FUNDING_BASES,
            'currentPosition.fundingBasis',
          );
        }
        for (const itemPatch of updates.itemPatches) {
          if (itemPatch.attachedPosition)
            assertRoi(itemPatch.attachedPosition.roiBasis);
        }
      }
    });
  },
);

function assertNoRoi(position: MobileSocialFeedPositionCard) {
  assert.equal(Object.hasOwn(position, 'roiBasis'), false);
}

function assertRoi(roi: MobileSocialFeedRoiBasis | undefined) {
  assert.ok(roi, 'ROI basis must be retained by history and updates');
  assertEnumMember(
    roi.basis,
    MOBILE_SOCIAL_FEED_ROI_BASIS_TYPES,
    'roiBasis.basis',
  );
  assertEnumMember(
    roi.quality,
    MOBILE_SOCIAL_FEED_ROI_BASIS_QUALITIES,
    'roiBasis.quality',
  );
  assert.ok(roi.asOfMs === null || Number.isSafeInteger(roi.asOfMs));
  if (roi.amount !== null) {
    assertBigNumberFinite(roi.amount, 'roiBasis.amount');
    assert.ok(roi.amount.isInteger());
  }
}
