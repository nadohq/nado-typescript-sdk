import {
  MOBILE_ERROR_CODES,
  MOBILE_TIP_COLLATERAL_CLASSIFICATIONS,
  MOBILE_TIP_MAPPING_STATES,
} from '@nadohq/mobile-client';
import { subaccountToHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: tip collateral mappings',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let ctx: RunContext;

    before(() => {
      ctx = createTestContext();
    });

    for (const direction of ['deposit', 'withdrawal'] as const) {
      void test(`annotates a real ${direction} Indexer submission`, async (context) => {
        const auth = getMobileSignedParams(ctx);
        const page = await ctx.indexer.getPaginatedSubaccountCollateralEvents({
          ...auth,
          isolated: false,
          limit: 1,
          eventTypes:
            direction === 'deposit'
              ? ['deposit_collateral']
              : ['withdraw_collateral', 'withdraw_collateral_v2'],
        });
        const event = page.events[0];
        if (!event) {
          context.skip(
            `The test subaccount has no ${direction} collateral submissions.`,
          );
          return;
        }
        const productId = event.snapshot.postBalance.productId;
        const { mappings } = await ctx.mobile.getTipCollateralMappings({
          ...auth,
          subaccount: auth,
          productId,
          direction,
          submissionIndices: [event.submissionIndex],
        });

        assert.equal(mappings.length, 1);
        const mapping = mappings[0];
        assert.ok(mapping);
        assert.equal(mapping.subaccount, subaccountToHex(auth));
        assert.equal(mapping.productId, productId);
        assert.equal(mapping.direction, direction);
        assert.equal(mapping.submissionIdx, event.submissionIndex);
        assert.ok(MOBILE_TIP_MAPPING_STATES.includes(mapping.mappingState));
        assert.ok(
          MOBILE_TIP_COLLATERAL_CLASSIFICATIONS.includes(
            mapping.classification,
          ),
        );
        for (const amount of [
          mapping.depositTotal,
          mapping.tipTotal,
          mapping.ordinaryAmount,
        ]) {
          if (amount === null) continue;
          assert.ok(amount.isFinite() && amount.isInteger() && amount.gte(0));
        }
        if (direction === 'withdrawal') {
          assert.equal(mapping.depositTotal, null);
          assert.equal(mapping.ordinaryAmount, null);
        } else {
          if (
            mapping.mappingState === 'complete' &&
            mapping.classification === 'ordinary'
          ) {
            assert.ok(mapping.tipTotal !== null && mapping.tipTotal.isZero());
            if (mapping.depositTotal === null) {
              assert.equal(mapping.ordinaryAmount, null);
            } else {
              assert.ok(mapping.ordinaryAmount !== null);
              assert.ok(mapping.ordinaryAmount.eq(mapping.depositTotal));
            }
          }
          if (
            mapping.mappingState === 'complete' &&
            mapping.depositTotal !== null &&
            mapping.tipTotal !== null &&
            mapping.ordinaryAmount !== null
          ) {
            assert.ok(
              mapping.depositTotal.eq(
                mapping.tipTotal.plus(mapping.ordinaryAmount),
              ),
            );
          }
        }
      });
    }

    void test('returns the backend invalid-request error for duplicate submission indices', async () => {
      const auth = getMobileSignedParams(ctx);
      await assertRejectsWithMobileErrorCode(
        () =>
          ctx.mobile.getTipCollateralMappings({
            ...auth,
            subaccount: auth,
            productId: 0,
            direction: 'deposit',
            submissionIndices: ['0', '0'],
          }),
        MOBILE_ERROR_CODES.INVALID_TIP_REQUEST,
        'query_tips_history',
      );
    });
  },
);
