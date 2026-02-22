import { EngineClient, EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  toBigDecimal,
} from '@nadohq/shared';
import { TriggerClient, TriggerPlaceOrderParams } from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Address } from 'viem';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
  assertHexString,
  assertNumber,
  assertString,
} from '../utils/assertions';
import { cancelAllTriggerOrders } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { ensureSubaccountFunded } from '../utils/ensureSubaccountFunded';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[trigger-client]: placement',
  { timeout: TEST_TIMEOUTS.ON_CHAIN },
  () => {
    let client: TriggerClient;
    let chainId: number;
    let subaccountOwner: string;
    let endpointAddr: Address;
    let midPrice: BigDecimal;

    // Stored across tests: TWAP placement -> TWAP executions query
    let twapDigest: string;

    before(async () => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      chainId = walletClient.chain.id;
      subaccountOwner = walletClient.account.address;
      endpointAddr = context.contracts.endpoint;

      client = new TriggerClient({
        url: context.endpoints.trigger,
        walletClient,
      });

      await ensureSubaccountFunded(context, {
        depositAmount: addDecimals(10000, 6),
      });

      const engineClient = new EngineClient({
        url: context.endpoints.engine,
        walletClient,
      });
      const marketPrice = await engineClient.getMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });
      midPrice = marketPrice.ask.plus(marketPrice.bid).div(2);
    });

    after(async () => {
      if (!client) return;
      await cancelAllTriggerOrders(client, {
        subaccountOwner,
        verifyingAddr: endpointAddr,
        chainId,
      });
    });

    void test('places a short stop order via oracle price above', async () => {
      const nonce = getOrderNonce();
      const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

      const order: EngineOrderParams = {
        amount: addDecimals(0.1),
        expiration: getExpiration(),
        price: 1000,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner,
        appendix: packOrderAppendix({
          orderExecutionType: 'default',
          triggerType: 'price',
        }),
      };

      const params: TriggerPlaceOrderParams = {
        chainId,
        order,
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        spotLeverage: true,
        triggerCriteria: {
          type: 'price',
          criteria: {
            type: 'oracle_price_above',
            triggerPrice: new BigDecimal(2500),
          },
        },
        verifyingAddr,
        nonce,
        id: 1000,
      };

      const result = await client.placeTriggerOrder(params);
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
        subaccountOwner,
        appendix: packOrderAppendix({
          orderExecutionType: 'ioc',
          triggerType: 'price',
        }),
      };

      const params: TriggerPlaceOrderParams = {
        chainId,
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

      const result = await client.placeTriggerOrder(params);
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
        subaccountOwner,
        appendix: packOrderAppendix({
          orderExecutionType: 'default',
          triggerType: 'price',
        }),
      };

      const params: TriggerPlaceOrderParams = {
        chainId,
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

      const result = await client.placeTriggerOrder(params);
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
        subaccountOwner,
        appendix: packOrderAppendix({
          reduceOnly: true,
          orderExecutionType: 'default',
          triggerType: 'price',
        }),
      };

      const params: TriggerPlaceOrderParams = {
        chainId,
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

      const result = await client.placeTriggerOrder(params);
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
        subaccountOwner,
        appendix: packOrderAppendix({
          orderExecutionType: 'default',
          triggerType: 'price',
          isolated: { margin: addDecimals(100) },
        }),
      };

      const params: TriggerPlaceOrderParams = {
        chainId,
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

      const result = await client.placeTriggerOrder(params);
      debugPrint('Isolated order result', result.data);

      assertDefined(result, 'isolatedResult');
      assert.equal(result.status, 'success', 'should return success status');
      assertDefined(result.data, 'isolatedResult.data');
      assertHexString(result.data.digest, 'isolatedResult.data.digest');
    });

    void test('places a TWAP order with time-based trigger', async () => {
      const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

      const order: EngineOrderParams = {
        amount: addDecimals(1),
        expiration: getExpiration(),
        price: 950,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner,
        appendix: packOrderAppendix({
          orderExecutionType: 'ioc',
          triggerType: 'twap',
          twap: { numOrders: 5, slippageFrac: 0.01 },
        }),
      };

      const params: TriggerPlaceOrderParams = {
        chainId,
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

      const result = await client.placeTriggerOrder(params);
      debugPrint('TWAP order result', result.data);

      assertDefined(result, 'twapResult');
      assert.equal(result.status, 'success', 'should return success status');
      assertDefined(result.data, 'twapResult.data');
      assertHexString(result.data.digest, 'twapResult.data.digest');

      twapDigest = result.data.digest;
    });

    void test('lists TWAP executions for the placed order', async () => {
      assertDefined(twapDigest, 'twapDigest (from prior TWAP placement)');

      const result = await client.listTwapExecutions({
        digest: twapDigest,
      });
      debugPrint('TWAP executions result', result);

      assertDefined(result, 'twapExecutionsResult');
      assertArray(result.executions, 'twapExecutionsResult.executions');
      if (result.executions.length > 0) {
        assertArrayElements(
          result.executions,
          (exec, label) => {
            assertNumber(exec.executionId, `${label}.executionId`);
            assertNumber(exec.scheduledTime, `${label}.scheduledTime`);
            assertDefined(exec.status, `${label}.status`);
            assertString(exec.status.type, `${label}.status.type`);
            assertNumber(exec.updatedAt, `${label}.updatedAt`);
          },
          'twapExecutionsResult.executions',
        );
      }
    });

    void test('places batch trigger orders', async () => {
      const verifyingAddr = getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_ETH);

      const makeOrder = (price: number): EngineOrderParams => ({
        amount: addDecimals(0.05),
        expiration: getExpiration(),
        price,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner,
        appendix: packOrderAppendix({
          orderExecutionType: 'default',
          triggerType: 'price',
        }),
      });

      const batchParams: TriggerPlaceOrderParams[] = [
        {
          chainId,
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
          chainId,
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

      const result = await client.placeTriggerOrders({
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
  },
);
