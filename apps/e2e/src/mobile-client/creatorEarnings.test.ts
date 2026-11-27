import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: creator earnings',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let ctx: RunContext;

    before(() => {
      ctx = createTestContext();
    });

    void test('reads the signing Identity’s Creator Rate and earnings', async () => {
      const summary = await ctx.mobile.getCreatorEarningsSummary(
        getMobileSignedParams(ctx),
      );

      assert.ok(Number.isInteger(summary.creatorRateBps));
      assert.ok(
        summary.creatorRateBps >= 0 && summary.creatorRateBps <= 10_000,
      );
      assert.ok(['assigned', 'default'].includes(summary.creatorRateSource));
      if (summary.creatorRateSource === 'default') {
        assert.equal(summary.creatorRateLabel, null);
        assert.equal(summary.creatorRateEndsAtMs, null);
      }
      assert.ok(summary.lifetime.isInteger() && summary.lifetime.gte(0));
      assert.ok(summary.claimable.isInteger() && summary.claimable.gte(0));
      assert.ok(summary.claimable.lte(summary.lifetime));
    });
  },
);
