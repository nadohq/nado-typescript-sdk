import {
  addDecimals,
  getOrderVerifyingAddress,
  packOrderAppendix,
} from '@nadohq/shared';
import { TriggerPlaceOrderParams } from '@nadohq/trigger-client';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
} from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { assertTriggerOrderInfoShape } from '../utils/shapeAssertions';
import { getSharedClients, TestClients } from '../utils/sharedTestSetup';
import {
  PENDING_TRIGGER_STATUS_TYPES,
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[trigger-client]: listing queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: TestClients;

    before(async () => {
      await delay(TEST_DELAYS.BETWEEN_SUITES);

      tc = getSharedClients();

      const marketPrice = await tc.engine.getMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });
      const midPrice = marketPrice.ask.plus(marketPrice.bid).div(2);
      const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

      const reduceOnlyOrder: TriggerPlaceOrderParams = {
        chainId: tc.chainId,
        order: {
          amount: addDecimals(0.1),
          expiration: getExpiration(),
          price: 1000,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: tc.walletClientAddress,
          appendix: packOrderAppendix({
            reduceOnly: true,
            orderExecutionType: 'default',
            triggerType: 'price',
          }),
        },
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        spotLeverage: true,
        triggerCriteria: {
          type: 'price',
          criteria: {
            type: 'mid_price_above',
            triggerPrice: midPrice.multipliedBy(1.5),
          },
        },
        verifyingAddr,
      };

      const twapOrder: TriggerPlaceOrderParams = {
        chainId: tc.chainId,
        order: {
          amount: addDecimals(1),
          expiration: getExpiration(),
          price: 950,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: tc.walletClientAddress,
          appendix: packOrderAppendix({
            orderExecutionType: 'ioc',
            triggerType: 'twap',
            twap: { numOrders: 5, slippageFrac: 0.01 },
          }),
        },
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        spotLeverage: true,
        triggerCriteria: {
          type: 'time',
          criteria: { interval: 30 },
        },
        verifyingAddr,
      };

      const priceOrder: TriggerPlaceOrderParams = {
        chainId: tc.chainId,
        order: {
          amount: addDecimals(0.1),
          expiration: getExpiration(),
          price: 1000,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: tc.walletClientAddress,
          appendix: packOrderAppendix({
            orderExecutionType: 'default',
            triggerType: 'price',
          }),
        },
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        spotLeverage: true,
        triggerCriteria: {
          type: 'price',
          criteria: {
            type: 'oracle_price_above',
            triggerPrice: midPrice,
          },
        },
        verifyingAddr,
        id: 1000,
      };

      await Promise.all([
        tc.trigger.placeTriggerOrder(reduceOnlyOrder),
        tc.trigger.placeTriggerOrder(twapOrder),
        tc.trigger.placeTriggerOrder(priceOrder),
      ]);
    });

    after(async () => {
      await cleanupTestState(
        { engine: tc.engine, trigger: tc.trigger },
        {
          subaccountOwner: tc.walletClientAddress,
          endpointAddr: tc.endpointAddr,
          chainId: tc.chainId,
        },
        { hasTriggerOrders: true },
      );
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.BETWEEN_TESTS);
    });

    void test('lists pending reduce-only orders', async () => {
      const result = await tc.trigger.listOrders({
        chainId: tc.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        verifyingAddr: tc.endpointAddr,
        reduceOnly: true,
      });
      debugPrint('Pending reduce-only orders result', result);

      assertDefined(result, 'reduceOnlyOrdersResult');
      assertArray(result.orders, 'reduceOnlyOrdersResult.orders');
      assertArrayElements(
        result.orders,
        assertTriggerOrderInfoShape,
        'reduceOnlyOrdersResult.orders',
      );
    });

    void test('lists pending TWAP orders', async () => {
      const result = await tc.trigger.listOrders({
        chainId: tc.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        verifyingAddr: tc.endpointAddr,
        triggerTypes: ['time_trigger'],
      });
      debugPrint('Pending TWAP orders result', result);

      assertDefined(result, 'twapOrdersResult');
      assertArray(result.orders, 'twapOrdersResult.orders');
      assertArrayElements(
        result.orders,
        assertTriggerOrderInfoShape,
        'twapOrdersResult.orders',
      );
    });

    void test('lists all pending trigger orders', async () => {
      const result = await tc.trigger.listOrders({
        chainId: tc.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        verifyingAddr: tc.endpointAddr,
      });
      debugPrint('Pending list all trigger orders result', result);

      assertDefined(result, 'pendingListOrdersResult');
      assertArray(result.orders, 'pendingListOrdersResult.orders');
      assertArrayElements(
        result.orders,
        assertTriggerOrderInfoShape,
        'pendingListOrdersResult.orders',
      );
    });

    void test('lists pending orders filtered by product', async () => {
      const result = await tc.trigger.listOrders({
        chainId: tc.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        verifyingAddr: tc.endpointAddr,
        productIds: [TEST_PRODUCT_IDS.SPOT_ETH],
      });
      debugPrint('Pending list orders for product result', result);

      assertDefined(result, 'pendingListOrdersForProductResult');
      assertArray(result.orders, 'pendingListOrdersForProductResult.orders');
      assertArrayElements(
        result.orders,
        assertTriggerOrderInfoShape,
        'pendingListOrdersForProductResult.orders',
      );
    });
  },
);
