import {
  EngineOrderParams,
  EnginePlaceOrderParams,
} from '@nadohq/engine-client';
import {
  addDecimals,
  BigNumberish,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
} from '@nadohq/shared';
import { TriggerPlaceOrderParams } from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
  assertHexString,
} from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[trigger-client]: update dependency',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    // Digests captured during setup: `oldDigest` is the order the dependent
    // trigger initially depends on; `newDigest` is the replacement order.
    let oldDigest: string;
    let newDigest: string;
    // Dependent trigger order's digest, used to verify it stays in
    // `waiting_dependency` after the re-point.
    let dependentDigest: string;

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      tc = createTestContext();

      const marketPrice = await tc.engine.getMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });
      const midPrice = marketPrice.ask.plus(marketPrice.bid).div(2);
      const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

      const makeOrder = (
        price: BigNumberish,
        orderKind: 'limit' | 'priceTriggered',
      ): EngineOrderParams => ({
        amount: addDecimals(0.1),
        expiration: getExpiration(),
        price,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        appendix: packOrderAppendix({
          orderExecutionType: 'default',
          triggerType: orderKind === 'priceTriggered' ? 'price' : undefined,
        }),
      });

      // Priced at 85% of mid (within the engine's 80%-120% oracle band) and
      // below the bid, so they rest on the book unfilled; the dependent
      // trigger order waits on these limit orders' fill before activating.
      // No `triggerType` in the appendix — these are regular limit orders.
      const dependencyOrderOld: EnginePlaceOrderParams = {
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        verifyingAddr,
        chainId: tc.chainId,
        spotLeverage: true,
        nonce: getOrderNonce(),
        id: 6000,
        order: makeOrder(midPrice.multipliedBy(0.85).dp(0), 'limit'),
      };

      // Replacement dependency. After `update_dependency`, the dependent
      // trigger order should depend on this digest instead.
      const dependencyOrderNew: EnginePlaceOrderParams = {
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        verifyingAddr,
        chainId: tc.chainId,
        spotLeverage: true,
        nonce: getOrderNonce(),
        id: 6001,
        order: makeOrder(midPrice.multipliedBy(0.85).dp(0), 'limit'),
      };

      const [dependencyOldResult, dependencyNewResult] = await Promise.all([
        tc.engine.placeOrder(dependencyOrderOld),
        tc.engine.placeOrder(dependencyOrderNew),
      ]);

      oldDigest = dependencyOldResult.data.digest;
      newDigest = dependencyNewResult.data.digest;

      // Dependent trigger order that waits on `dependencyOrderOld`'s fill.
      const dependentTriggerOrder: TriggerPlaceOrderParams = {
        chainId: tc.chainId,
        order: makeOrder(midPrice.multipliedBy(1.05).dp(0), 'priceTriggered'),
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        spotLeverage: true,
        triggerCriteria: {
          type: 'price',
          criteria: {
            type: 'oracle_price_above',
            triggerPrice: midPrice.multipliedBy(1.1).dp(0),
            dependency: {
              digest: oldDigest,
              onPartialFill: false,
            },
          },
        },
        verifyingAddr,
        nonce: getOrderNonce(),
        id: 6002,
      };

      const dependentTriggerResult = await tc.trigger.placeTriggerOrder(
        dependentTriggerOrder,
      );
      dependentDigest = dependentTriggerResult.data.digest;

      // Allow trigger service to index the placed orders.
      await delay(TEST_DELAYS.STANDARD);
    });

    after(async () => {
      await cleanupTestState(
        { engine: tc.engine, trigger: tc.trigger },
        {
          subaccountOwner: tc.walletClientAddress,
          endpointAddr: tc.endpointAddr,
          chainId: tc.chainId,
        },
      );
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('re-points dependent trigger orders to a new digest', async () => {
      const result = await tc.trigger.updateTriggerDependency({
        oldDigest,
        newDigest,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });
      debugPrint('Update dependency result', result);

      assertDefined(result, 'updateDependencyResult');
      assert.equal(
        result.status,
        'success',
        'update dependency should succeed',
      );
      assertDefined(result.data, 'updateDependencyResult.data');
      assertHexString(result.data.digest, 'updateDependencyResult.data.digest');
      assert.equal(
        result.data.digest,
        newDigest,
        'response digest should match the newDigest',
      );
      assert.equal(
        result.request_type,
        'execute_update_dependency',
        'request_type should be execute_update_dependency',
      );
    });

    void test('dependent order remains in waiting_dependency after re-point', async () => {
      const listResult = await tc.trigger.listOrders({
        chainId: tc.chainId,
        verifyingAddr: tc.endpointAddr,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        digests: [dependentDigest],
        statusTypes: ['waiting_dependency'],
      });
      debugPrint('Dependent order after re-point', listResult);

      assertDefined(listResult, 'listAfterRepointResult');
      assertArray(listResult.orders, 'listAfterRepointResult.orders');
      assert.equal(
        listResult.orders.length,
        1,
        'dependent order should still be listed in waiting_dependency',
      );
      assertArrayElements(
        listResult.orders,
        (order) => {
          assert.equal(
            order.order.digest,
            dependentDigest,
            'listed order digest should match the dependent order',
          );
          assert.equal(
            order.status.type,
            'waiting_dependency',
            'dependent order status should still be waiting_dependency',
          );
        },
        'listAfterRepointResult.orders',
      );
    });
  },
);
