import { MobileClient } from '@nadohq/mobile-client';
import { Subaccount, subaccountToHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: position lookup',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;
    let subaccount: Subaccount;
    let mobile: MobileClient;

    before(() => {
      tc = createTestContext();
      subaccount = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      };
      mobile = new MobileClient({ url: tc.endpoints.mobile });
    });

    void test('resolves an indexed lifecycle into a readable position UUID without a wallet', async (context) => {
      const { positions } = await tc.indexer.getPositions({
        subaccount,
        productId: TEST_PRODUCT_IDS.PERP_ETH,
        isolated: false,
        limit: 1,
      });
      const position = positions[0];
      if (!position) {
        context.skip('No cross ETH perpetual position history is available.');
        return;
      }

      const direction = position.direction ? 'long' : 'short';
      const lookup = await mobile.getPositionLookup({
        subaccount,
        productId: position.productId,
        marginMode: 'cross',
        direction,
        openId: position.openId,
      });
      assert.match(
        lookup.positionId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      const history = await mobile.getPositionHistory({
        positionId: lookup.positionId,
        viewAs: subaccount,
        limit: 1,
      });
      assert.equal(history.position.positionId, lookup.positionId);
      assert.equal(history.position.productId, position.productId);
      assert.equal(history.position.marginMode, 'cross');
      assert.equal(history.position.direction, direction);
      assert.equal(
        history.owner.subaccount.toLowerCase(),
        subaccountToHex(subaccount).toLowerCase(),
      );
    });
  },
);
