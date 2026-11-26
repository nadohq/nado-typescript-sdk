import {
  MOBILE_ERROR_CODES,
  MOBILE_TIP_FEE_BASES,
  MOBILE_TIP_GATEWAY_STATUSES,
  MOBILE_TIP_STATUSES,
  MobileTipDetail,
  MobileTipHistoryRow,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import { assertNonNegativeInteger } from '../utils/assertions';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: Tip details, history and receipt reads',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let context: RunContext;

    before(() => {
      context = createTestContext();
    });

    for (const direction of ['all', 'sent', 'received'] as const) {
      void test(`reads ${direction} history with explicit nullable scope and pagination`, async () => {
        const page = await context.mobile.getTipsHistory({
          ...getMobileSignedParams(context),
          direction,
          subaccount: null,
          cursor: null,
          limit: 5,
        });
        assert.ok(Array.isArray(page.tips));
        assert.ok(page.tips.length <= 5);
        assert.ok(
          page.nextCursor === null || typeof page.nextCursor === 'string',
        );
        for (const tip of page.tips) {
          assertHistoryRow(tip);
          if (direction === 'sent') assert.equal(tip.role, 'sender');
          if (direction === 'received') assert.equal(tip.role, 'recipient');
        }
      });
    }

    void test('reads explicitly scoped history and participant details when Tips exist', async (testContext) => {
      const auth = getMobileSignedParams(context);
      const page = await context.mobile.getTipsHistory({
        ...auth,
        direction: 'all',
        subaccount: auth,
        limit: 5,
      });
      if (page.tips.length === 0) {
        testContext.skip('The test subaccount has no participating Tips.');
        return;
      }
      for (const tip of page.tips) {
        const detail = await context.mobile.getTipDetail({
          ...auth,
          tipId: tip.tipId,
        });
        assert.equal(detail.tipId, tip.tipId);
        assert.equal(detail.role, tip.role);
        if (tip.creditedAtMs !== null) {
          assert.equal(detail.creditedAtMs, tip.creditedAtMs);
        }
        assertDetail(detail);
      }
    });

    void test('returns the private not-found error for an inaccessible detail', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          context.mobile.getTipDetail({
            ...getMobileSignedParams(context),
            tipId: randomUUID(),
          }),
        MOBILE_ERROR_CODES.TIP_NOT_FOUND,
      );
    });

    void test('reads unseen verified-credit cards without acknowledging them', async () => {
      const page = await context.mobile.getReceivedTips({
        ...getMobileSignedParams(context),
        cursor: null,
        limit: 5,
      });
      assert.ok(Array.isArray(page.tips));
      assert.ok(page.tips.length <= 5);
      assert.ok(
        page.nextCursor === null || typeof page.nextCursor === 'string',
      );
      for (const tip of page.tips) {
        assert.equal(typeof tip.tipId, 'string');
        assert.equal(tip.seenAt, null);
        assertNonNegativeInteger(tip.creditedAtMs, 'creditedAtMs');
        assert.ok(tip.netAmount.isFinite() && tip.netAmount.gte(0));
        assert.equal(typeof tip.backgroundId, 'string');
        assert.equal(typeof tip.backgroundVersion, 'string');
        assert.equal(tip.sender.subaccount.subaccountOwner.length, 42);
      }
    });

    void test('rejects repeated missing receipt IDs with TIP_NOT_FOUND', async () => {
      const tipId = randomUUID();
      await assertRejectsWithMobileErrorCode(
        () =>
          context.mobile.markTipsSeen({
            ...getMobileSignedParams(context),
            tipIds: [tipId, tipId],
          }),
        MOBILE_ERROR_CODES.TIP_NOT_FOUND,
      );
    });
  },
);

function assertHistoryRow(tip: MobileTipHistoryRow): void {
  assert.equal(typeof tip.tipId, 'string');
  assert.ok(MOBILE_TIP_STATUSES.includes(tip.tipStatus));
  assert.ok(
    tip.netAmount.isFinite() &&
      tip.netAmount.isInteger() &&
      tip.netAmount.gte(0),
  );
  assertNonNegativeInteger(tip.submittedAtMs, 'submittedAtMs');
  if (tip.creditedAtMs !== null)
    assertNonNegativeInteger(tip.creditedAtMs, 'creditedAtMs');
  assert.equal(tip.sender.subaccount.subaccountOwner.length, 42);
  assert.equal(tip.recipient.subaccount.subaccountOwner.length, 42);
  for (const index of [tip.withdrawalSubmissionIdx, tip.depositSubmissionIdx]) {
    if (index !== null) assert.match(index, /^(0|[1-9]\d*)$/);
  }
  if (tip.role === 'recipient') {
    assert.ok(tip.seenAt === null || typeof tip.seenAt === 'number');
  } else {
    assert.ok(!('seenAt' in tip));
  }
  assert.ok(!('senderCost' in tip));
}

function assertDetail(tip: MobileTipDetail): void {
  assert.match(tip.version, /^(0|[1-9]\d*)$/);
  assert.ok(MOBILE_TIP_STATUSES.includes(tip.tipStatus));
  assert.ok(tip.netAmount.isFinite() && tip.netAmount.gte(0));
  assert.equal(typeof tip.backgroundVersion, 'string');
  if (tip.role === 'sender') {
    const cost = tip.senderCost;
    assert.ok(MOBILE_TIP_FEE_BASES.includes(cost.feeBasis));
    assert.ok(MOBILE_TIP_GATEWAY_STATUSES.includes(tip.gateway.status));
    for (const amount of [
      cost.maxFee,
      cost.actualFee,
      cost.actualTotal,
      cost.displayFee,
      cost.displayTotal,
    ]) {
      if (amount !== null) {
        assert.ok(amount.isFinite() && amount.isInteger() && amount.gte(0));
      }
    }
    switch (cost.feeBasis) {
      case 'execution_cap':
        assert.equal(cost.actualFee, null);
        assert.equal(cost.actualTotal, null);
        assert.ok(cost.displayFee.eq(cost.maxFee));
        assert.ok(cost.displayTotal.eq(tip.netAmount.plus(cost.maxFee)));
        break;
      case 'actual':
        assert.ok(cost.actualFee !== null && cost.actualTotal !== null);
        assert.ok(cost.actualTotal.eq(tip.netAmount.plus(cost.actualFee)));
        assert.ok(cost.displayFee.eq(cost.actualFee));
        assert.ok(cost.displayTotal.eq(cost.actualTotal));
        break;
      case 'not_executed':
        assert.notEqual(tip.gateway.status, 'accepted');
        assert.equal(tip.creditedAtMs, null);
        assert.ok(cost.actualFee !== null && cost.actualTotal !== null);
        assert.ok(cost.actualFee.isZero());
        assert.ok(cost.actualTotal.isZero());
        assert.ok(cost.displayFee.isZero());
        assert.ok(cost.displayTotal.isZero());
        break;
    }
    assert.ok(!('seenAt' in tip));
  } else {
    assert.ok(tip.seenAt === null || typeof tip.seenAt === 'number');
    assert.ok(!('senderCost' in tip));
    assert.ok(!('gateway' in tip));
    assert.ok(!('processingReason' in tip));
    assert.notEqual(tip.creditedAtMs, null);
  }
}
