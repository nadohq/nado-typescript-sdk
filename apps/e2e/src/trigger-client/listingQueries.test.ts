import {
  addDecimals,
  getOrderVerifyingAddress,
  packOrderAppendix,
} from '@nadohq/shared';
import { TriggerClient, TriggerPlaceOrderParams } from '@nadohq/trigger-client';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
  assertNonEmptyArray,
} from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import { assertTriggerOrderInfoShape } from '../utils/shapeAssertions';
import {
  PENDING_TRIGGER_STATUS_TYPES,
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[trigger-client]: listing queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let ctx: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      ctx = createTestContext();

      const marketPrice = await ctx.engine.getMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });
      const midPrice = marketPrice.ask.plus(marketPrice.bid).div(2);
      const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

      const reduceOnlyOrder: TriggerPlaceOrderParams = {
        chainId: ctx.chainId,
        order: {
          amount: addDecimals(0.1),
          expiration: getExpiration(),
          price: 1000,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: ctx.walletClientAddress,
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
            triggerPrice: midPrice.multipliedBy(1.19).dp(0),
          },
        },
        verifyingAddr,
      };

      const twapOrder: TriggerPlaceOrderParams = {
        chainId: ctx.chainId,
        order: {
          amount: addDecimals(1),
          expiration: getExpiration(),
          price: 950,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: ctx.walletClientAddress,
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
        chainId: ctx.chainId,
        order: {
          amount: addDecimals(0.1),
          expiration: getExpiration(),
          price: 1000,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: ctx.walletClientAddress,
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
            triggerPrice: midPrice.multipliedBy(1.19).dp(0),
          },
        },
        verifyingAddr,
        id: 1000,
      };

      await Promise.all([
        ctx.trigger.placeTriggerOrder(reduceOnlyOrder),
        ctx.trigger.placeTriggerOrder(twapOrder),
        ctx.trigger.placeTriggerOrder(priceOrder),
      ]);
    });

    after(async () => {
      await cleanupTestState(
        { engine: ctx.engine, trigger: ctx.trigger },
        {
          subaccountOwner: ctx.walletClientAddress,
          endpointAddr: ctx.endpointAddr,
          chainId: ctx.chainId,
        },
      );
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('lists pending reduce-only orders', async () => {
      const result = await ctx.trigger.listOrders({
        chainId: ctx.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        verifyingAddr: ctx.endpointAddr,
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
      const result = await ctx.trigger.listOrders({
        chainId: ctx.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        verifyingAddr: ctx.endpointAddr,
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
      const result = await ctx.trigger.listOrders({
        chainId: ctx.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        verifyingAddr: ctx.endpointAddr,
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
      const result = await ctx.trigger.listOrders({
        chainId: ctx.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        verifyingAddr: ctx.endpointAddr,
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

    void test('lists pending orders without a signature', async () => {
      const result = await ctx.trigger.listOrdersUnsigned({
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
      });
      debugPrint('Pending unsigned list orders result', result);

      assertDefined(result, 'unsignedListOrdersResult');
      assertArray(result.orders, 'unsignedListOrdersResult.orders');
      assertArrayElements(
        result.orders,
        assertTriggerOrderInfoShape,
        'unsignedListOrdersResult.orders',
      );
    });

    void test('lists a subaccount pending orders from a wallet-less client', async () => {
      const walletlessTrigger = new TriggerClient({
        url: ctx.endpoints.trigger,
      });

      const result = await walletlessTrigger.listOrdersUnsigned({
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
      });
      debugPrint('Wallet-less unsigned list orders result', result);

      assertDefined(result, 'walletlessListOrdersResult');
      assertNonEmptyArray(result.orders, 'walletlessListOrdersResult.orders');
      assertArrayElements(
        result.orders,
        assertTriggerOrderInfoShape,
        'walletlessListOrdersResult.orders',
      );
    });
  },
);
