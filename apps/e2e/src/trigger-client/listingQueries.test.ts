import { TriggerClient } from '@nadohq/trigger-client';
import { before, describe, test } from 'node:test';
import { Address } from 'viem';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { assertTriggerOrderInfoShape } from '../utils/shapeAssertions';
import {
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { PENDING_TRIGGER_STATUS_TYPES } from './setupTriggerAccount';

void describe(
  '[trigger-client]: listing queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: TriggerClient;
    let chainId: number;
    let subaccountOwner: string;
    let endpointAddr: Address;

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      chainId = walletClient.chain.id;
      subaccountOwner = walletClient.account.address;
      endpointAddr = context.contracts.endpoint;

      client = new TriggerClient({
        url: context.endpoints.trigger,
        walletClient,
      });
    });

    void test('lists pending reduce-only orders', async () => {
      const result = await client.listOrders({
        chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner,
        verifyingAddr: endpointAddr,
        reduceOnly: true,
      });
      debugPrint('Pending reduce-only orders result', result);

      assertDefined(result, 'reduceOnlyOrdersResult');
      assertArray(result.orders, 'reduceOnlyOrdersResult.orders');
      if (result.orders.length > 0) {
        assertArrayElements(
          result.orders,
          assertTriggerOrderInfoShape,
          'reduceOnlyOrdersResult.orders',
        );
      }
    });

    void test('lists pending TWAP orders', async () => {
      const result = await client.listOrders({
        chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner,
        verifyingAddr: endpointAddr,
        triggerTypes: ['time_trigger'],
      });
      debugPrint('Pending TWAP orders result', result);

      assertDefined(result, 'twapOrdersResult');
      assertArray(result.orders, 'twapOrdersResult.orders');
      if (result.orders.length > 0) {
        assertArrayElements(
          result.orders,
          assertTriggerOrderInfoShape,
          'twapOrdersResult.orders',
        );
      }
    });

    void test('lists all pending trigger orders', async () => {
      const result = await client.listOrders({
        chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner,
        verifyingAddr: endpointAddr,
      });
      debugPrint('Pending list all trigger orders result', result);

      assertDefined(result, 'pendingListOrdersResult');
      assertArray(result.orders, 'pendingListOrdersResult.orders');
      if (result.orders.length > 0) {
        assertArrayElements(
          result.orders,
          assertTriggerOrderInfoShape,
          'pendingListOrdersResult.orders',
        );
      }
    });

    void test('lists pending orders filtered by product', async () => {
      const result = await client.listOrders({
        chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner,
        verifyingAddr: endpointAddr,
        productIds: [TEST_PRODUCT_IDS.SPOT_ETH],
      });
      debugPrint('Pending list orders for product result', result);

      assertDefined(result, 'pendingListOrdersForProductResult');
      assertArray(result.orders, 'pendingListOrdersForProductResult.orders');
      if (result.orders.length > 0) {
        assertArrayElements(
          result.orders,
          assertTriggerOrderInfoShape,
          'pendingListOrdersForProductResult.orders',
        );
      }
    });
  },
);
