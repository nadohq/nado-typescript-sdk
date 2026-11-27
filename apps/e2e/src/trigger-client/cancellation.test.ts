import { EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
} from '@nadohq/shared';
import { TriggerPlaceOrderParams } from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertArray, assertDefined } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  PENDING_TRIGGER_STATUS_TYPES,
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe('[trigger-client]: cancellation', () => {
  let ctx: RunContext;

  // Digests captured during setup for cancel / list-by-digest tests
  let ethDigest: string;
  let btcDigest: string;
  let ethDigest2: string;

  before(async () => {
    await delay(TEST_DELAYS.LONG);

    ctx = createTestContext();

    // Place 3 orders across 2 products so we can test cancel-by-digest
    // and cancel-by-product independently.
    const ethVerifyingAddr = getOrderVerifyingAddress(
      TEST_PRODUCT_IDS.SPOT_ETH,
    );
    const btcVerifyingAddr = getOrderVerifyingAddress(
      TEST_PRODUCT_IDS.PERP_BTC,
    );

    const makeOrder = (price: number): EngineOrderParams => ({
      amount: addDecimals(0.1),
      expiration: getExpiration(),
      price,
      subaccountName: TEST_SUBACCOUNT_NAME,
      subaccountOwner: ctx.walletClientAddress,
      appendix: packOrderAppendix({
        orderExecutionType: 'default',
        triggerType: 'price',
      }),
    });

    const makeTriggerParams = (
      order: EngineOrderParams,
      productId: number,
      verifyingAddr: string,
    ): TriggerPlaceOrderParams => ({
      chainId: ctx.chainId,
      order,
      productId,
      spotLeverage: true,
      triggerCriteria: {
        type: 'price',
        criteria: {
          type: 'oracle_price_above',
          triggerPrice: 99999,
        },
      },
      verifyingAddr,
      nonce: getOrderNonce(),
    });

    const [r1, r2, r3] = await Promise.all([
      ctx.trigger.placeTriggerOrder(
        makeTriggerParams(
          makeOrder(1000),
          TEST_PRODUCT_IDS.SPOT_ETH,
          ethVerifyingAddr,
        ),
      ),
      ctx.trigger.placeTriggerOrder(
        makeTriggerParams(
          makeOrder(60000),
          TEST_PRODUCT_IDS.PERP_BTC,
          btcVerifyingAddr,
        ),
      ),
      ctx.trigger.placeTriggerOrder(
        makeTriggerParams(
          makeOrder(1001),
          TEST_PRODUCT_IDS.SPOT_ETH,
          ethVerifyingAddr,
        ),
      ),
    ]);

    ethDigest = r1.data.digest;
    btcDigest = r2.data.digest;
    ethDigest2 = r3.data.digest;

    // Allow trigger service to index the placed orders before cancel tests
    await delay(TEST_DELAYS.STANDARD);
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

  void describe('cancel operations', () => {
    void test('cancels an order via digest', async () => {
      const result = await ctx.trigger.cancelTriggerOrders({
        digests: [ethDigest],
        productIds: [TEST_PRODUCT_IDS.SPOT_ETH],
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        verifyingAddr: ctx.endpointAddr,
        chainId: ctx.chainId,
      });
      debugPrint('Cancel via digest result', result);

      assertDefined(result, 'cancelViaDigestResult');
      assert.equal(
        result.status,
        'success',
        'cancel via digest should succeed',
      );
    });

    void test('cancels orders via product', async () => {
      const result = await ctx.trigger.cancelProductOrders({
        productIds: [TEST_PRODUCT_IDS.SPOT_ETH, TEST_PRODUCT_IDS.PERP_BTC],
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        verifyingAddr: ctx.endpointAddr,
        chainId: ctx.chainId,
      });
      debugPrint('Cancel via product result', result);

      assertDefined(result, 'cancelViaProductResult');
      assert.equal(
        result.status,
        'success',
        'cancel via product should succeed',
      );
    });
  });

  void describe('post-cancellation queries', () => {
    void test('lists orders after cancellation', async () => {
      const result = await ctx.trigger.listOrders({
        chainId: ctx.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        verifyingAddr: ctx.endpointAddr,
      });
      debugPrint('Non-pending list orders result', result);

      assertDefined(result, 'nonPendingListOrdersResult');
      assertArray(result.orders, 'nonPendingListOrdersResult.orders');
    });

    void test('retrieves orders by specific digests', async () => {
      const result = await ctx.trigger.listOrders({
        chainId: ctx.chainId,
        verifyingAddr: ctx.endpointAddr,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: ctx.walletClientAddress,
        digests: [ethDigest, btcDigest, ethDigest2],
      });
      debugPrint('List orders by digest result', result);

      assertDefined(result, 'ordersByDigest');
      assertArray(result.orders, 'ordersByDigest.orders');
      assert.equal(
        result.orders.length,
        3,
        'should return all 3 requested orders',
      );
    });
  });
});
