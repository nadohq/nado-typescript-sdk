import {
  MOBILE_TIP_COLLATERAL_CLASSIFICATIONS,
  MOBILE_TIP_MAPPING_STATES,
} from '@nadohq/mobile-client';
import { subaccountToHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: tip collateral mappings',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;

    before(() => {
      tc = createTestContext();
    });

    for (const direction of ['deposit', 'withdrawal'] as const) {
      void test(`deduplicates a real ${direction} Indexer submission`, async (context) => {
        const auth = getMobileSignedParams(tc);
        const page = await tc.indexer.getPaginatedSubaccountCollateralEvents({
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
        const { mappings } = await tc.mobile.getTipCollateralMappings({
          ...auth,
          subaccount: auth,
          productId,
          direction,
          submissionIndices: [event.submissionIndex, event.submissionIndex],
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
          mapping.depositTotalX18,
          mapping.tipTotalX18,
          mapping.ordinaryAmountX18,
        ]) {
          if (amount === null) continue;
          assert.ok(amount.isFinite() && amount.isInteger() && amount.gte(0));
        }
        if (direction === 'withdrawal') {
          assert.equal(mapping.depositTotalX18, null);
          assert.equal(mapping.ordinaryAmountX18, null);
        }
      });
    }
  },
);
