import { EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  toBigDecimal,
} from '@nadohq/shared';
import { TriggerPlaceOrderParams } from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
  assertHexString,
  assertNumber,
  assertString,
} from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { getSharedClients, TestClients } from '../utils/sharedTestSetup';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
} from '../utils/testConstants';

void describe('[trigger-client]: placement', () => {
  let tc: TestClients;
  let midPrice: BigDecimal;

  before(async () => {
    await delay(TEST_DELAYS.BETWEEN_SUITES);

    tc = getSharedClients();

    const marketPrice = await tc.engine.getMarketPrice({
      productId: TEST_PRODUCT_IDS.SPOT_ETH,
    });
    midPrice = marketPrice.ask.plus(marketPrice.bid).div(2);
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
    await delay(TEST_DELAYS.BETWEEN_TESTS);
  });

  void test('places a short stop order via oracle price above', async () => {
    const nonce = getOrderNonce();
    const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

    const order: EngineOrderParams = {
      amount: addDecimals(0.1),
      expiration: getExpiration(),
      price: 1000,
      subaccountName: TEST_SUBACCOUNT_NAME,
      subaccountOwner: tc.walletClientAddress,
      appendix: packOrderAppendix({
        orderExecutionType: 'default',
        triggerType: 'price',
      }),
    };

    const params: TriggerPlaceOrderParams = {
      chainId: tc.chainId,
      order,
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
      nonce,
      id: 1000,
    };

    const result = await tc.trigger.placeTriggerOrder(params);
    debugPrint('Short stop order result', result.data);

    assertDefined(result, 'shortStopResult');
    assert.equal(result.status, 'success', 'should return success status');
    assertDefined(result.data, 'shortStopResult.data');
    assertHexString(result.data.digest, 'shortStopResult.data.digest');
  });

  void test('places a long stop order via oracle price below', async () => {
    const nonce = getOrderNonce();
    const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC);

    const order: EngineOrderParams = {
      amount: addDecimals(0.01),
      expiration: getExpiration(),
      price: 60000,
      subaccountName: TEST_SUBACCOUNT_NAME,
      subaccountOwner: tc.walletClientAddress,
      appendix: packOrderAppendix({
        orderExecutionType: 'ioc',
        triggerType: 'price',
      }),
    };

    const params: TriggerPlaceOrderParams = {
      chainId: tc.chainId,
      order,
      productId: TEST_PRODUCT_IDS.PERP_BTC,
      triggerCriteria: {
        type: 'price',
        criteria: {
          type: 'oracle_price_below',
          triggerPrice: toBigDecimal(60000),
        },
      },
      verifyingAddr,
      nonce,
    };

    const result = await tc.trigger.placeTriggerOrder(params);
    debugPrint('Long stop order result', result);

    assertDefined(result, 'longStopResult');
    assert.equal(result.status, 'success', 'should return success status');
    assertDefined(result.data, 'longStopResult.data');
    assertHexString(result.data.digest, 'longStopResult.data.digest');
  });

  void test('places a short stop mid-book order via mid price above', async () => {
    const nonce = getOrderNonce();
    const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

    const order: EngineOrderParams = {
      amount: addDecimals(0.2),
      expiration: getExpiration(),
      price: 1000,
      subaccountName: TEST_SUBACCOUNT_NAME,
      subaccountOwner: tc.walletClientAddress,
      appendix: packOrderAppendix({
        orderExecutionType: 'default',
        triggerType: 'price',
      }),
    };

    const params: TriggerPlaceOrderParams = {
      chainId: tc.chainId,
      order,
      productId: TEST_PRODUCT_IDS.SPOT_ETH,
      spotLeverage: true,
      triggerCriteria: {
        type: 'price',
        criteria: {
          type: 'mid_price_above',
          triggerPrice: midPrice.multipliedBy(2),
        },
      },
      verifyingAddr,
      nonce,
      id: 1000,
    };

    const result = await tc.trigger.placeTriggerOrder(params);
    debugPrint('Short stop mid-book order result', result.data);

    assertDefined(result, 'shortStopMidBookResult');
    assert.equal(result.status, 'success', 'should return success status');
    assertDefined(result.data, 'shortStopMidBookResult.data');
    assertHexString(result.data.digest, 'shortStopMidBookResult.data.digest');
  });

  void test('places a reduce-only order', async () => {
    const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

    const order: EngineOrderParams = {
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
    };

    const params: TriggerPlaceOrderParams = {
      chainId: tc.chainId,
      order,
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

    const result = await tc.trigger.placeTriggerOrder(params);
    debugPrint('Reduce-only order result', result.data);

    assertDefined(result, 'reduceOnlyResult');
    assert.equal(result.status, 'success', 'should return success status');
    assertDefined(result.data, 'reduceOnlyResult.data');
    assertHexString(result.data.digest, 'reduceOnlyResult.data.digest');
  });

  void test('places an isolated margin order', async () => {
    const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

    const order: EngineOrderParams = {
      amount: addDecimals(0.15),
      expiration: getExpiration(),
      price: 3000,
      subaccountName: TEST_SUBACCOUNT_NAME,
      subaccountOwner: tc.walletClientAddress,
      appendix: packOrderAppendix({
        orderExecutionType: 'default',
        triggerType: 'price',
        isolated: { margin: addDecimals(100) },
      }),
    };

    const params: TriggerPlaceOrderParams = {
      chainId: tc.chainId,
      order,
      productId: TEST_PRODUCT_IDS.SPOT_ETH,
      spotLeverage: true,
      triggerCriteria: {
        type: 'price',
        criteria: {
          type: 'mid_price_below',
          triggerPrice: midPrice.multipliedBy(0.8),
        },
      },
      verifyingAddr,
    };

    const result = await tc.trigger.placeTriggerOrder(params);
    debugPrint('Isolated order result', result.data);

    assertDefined(result, 'isolatedResult');
    assert.equal(result.status, 'success', 'should return success status');
    assertDefined(result.data, 'isolatedResult.data');
    assertHexString(result.data.digest, 'isolatedResult.data.digest');
  });

  void test('places a TWAP order and lists its executions', async () => {
    const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

    const order: EngineOrderParams = {
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
    };

    const params: TriggerPlaceOrderParams = {
      chainId: tc.chainId,
      order,
      productId: TEST_PRODUCT_IDS.SPOT_ETH,
      spotLeverage: true,
      triggerCriteria: {
        type: 'time',
        criteria: { interval: 30 },
      },
      verifyingAddr,
      id: 4000,
    };

    const placeResult = await tc.trigger.placeTriggerOrder(params);
    debugPrint('TWAP order result', placeResult.data);

    assertDefined(placeResult, 'twapResult');
    assert.equal(placeResult.status, 'success', 'should return success status');
    assertDefined(placeResult.data, 'twapResult.data');
    assertHexString(placeResult.data.digest, 'twapResult.data.digest');

    const execResult = await tc.trigger.listTwapExecutions({
      digest: placeResult.data.digest,
    });
    debugPrint('TWAP executions result', execResult);

    assertDefined(execResult, 'twapExecutionsResult');
    assertArray(execResult.executions, 'twapExecutionsResult.executions');
    assertArrayElements(
      execResult.executions,
      (exec, label) => {
        assertNumber(exec.executionId, `${label}.executionId`);
        assertNumber(exec.scheduledTime, `${label}.scheduledTime`);
        assertDefined(exec.status, `${label}.status`);
        assertString(exec.status.type, `${label}.status.type`);
        assertNumber(exec.updatedAt, `${label}.updatedAt`);
      },
      'twapExecutionsResult.executions',
    );
  });

  void test('places batch trigger orders', async () => {
    const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

    const makeOrder = (price: number): EngineOrderParams => ({
      amount: addDecimals(0.05),
      expiration: getExpiration(),
      price,
      subaccountName: TEST_SUBACCOUNT_NAME,
      subaccountOwner: tc.walletClientAddress,
      appendix: packOrderAppendix({
        orderExecutionType: 'default',
        triggerType: 'price',
      }),
    });

    const batchParams: TriggerPlaceOrderParams[] = [
      {
        chainId: tc.chainId,
        order: makeOrder(3100),
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        spotLeverage: true,
        triggerCriteria: {
          type: 'price',
          criteria: {
            type: 'oracle_price_below',
            triggerPrice: toBigDecimal(3100),
          },
        },
        verifyingAddr,
        id: 5000,
      },
      {
        chainId: tc.chainId,
        order: makeOrder(3200),
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        spotLeverage: true,
        triggerCriteria: {
          type: 'price',
          criteria: {
            type: 'oracle_price_below',
            triggerPrice: toBigDecimal(3200),
          },
        },
        verifyingAddr,
        id: 5001,
      },
    ];

    const result = await tc.trigger.placeTriggerOrders({
      orders: batchParams,
      stopOnFailure: false,
    });
    debugPrint('Batch place orders result', result.data);

    assertDefined(result, 'batchResult');
    assert.equal(result.status, 'success', 'should return success status');
    assertDefined(result.data, 'batchResult.data');
    assertArray(result.data, 'batchResult.data');
    assert.equal(
      result.data.length,
      2,
      'should return results for both orders',
    );
    assertArrayElements(
      result.data,
      (entry, label) => {
        assertHexString(entry.digest, `${label}.digest`);
      },
      'batchResult.data',
    );
  });
});
