import {
  addDecimals,
  createNadoClient,
  NadoClient,
  PlaceOrderParams,
} from '@nadohq/client';
import {
  BigDecimal,
  getOrderDigest,
  getOrderNonce,
  packOrderAppendix,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertDefined,
  assertHexString,
  assertNonEmptyArray,
} from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import {
  getCachedOraclePrice,
  getSharedContext,
} from '../utils/sharedTestSetup';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe('[client]: orders', { timeout: TEST_TIMEOUTS.LONG }, () => {
  let nadoClient: NadoClient;
  let walletClientAddress: string;
  let endpointAddr: string;
  let chainId: number;
  let shortLimitPrice: BigDecimal;
  let shortMarketPrice: BigDecimal;

  before(async () => {
    await delay(TEST_DELAYS.BETWEEN_SUITES);

    const context = getSharedContext();
    const walletClient = context.getWalletClient();
    walletClientAddress = walletClient.account.address;
    chainId = walletClient.chain.id;
    endpointAddr = context.contracts.endpoint;

    nadoClient = createNadoClient(context.env.chainEnv, {
      walletClient,
      publicClient: context.publicClient,
    });

    const oraclePrice = await getCachedOraclePrice(TEST_PRODUCT_IDS.SPOT_ETH);
    shortLimitPrice = oraclePrice.multipliedBy(1.1).decimalPlaces(0);
    shortMarketPrice = oraclePrice.multipliedBy(0.9).decimalPlaces(0);
  });

  after(async () => {
    await cleanupTestState(
      {
        engine: nadoClient.context.engineClient,
        trigger: nadoClient.context.triggerClient,
      },
      { subaccountOwner: walletClientAddress, endpointAddr, chainId },
      { hasEngineOrders: true, hasPerpPositions: true },
    );
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.BETWEEN_TESTS);
  });

  // ---------------------------------------------------------------
  // Spot order placement, querying, and cancellation
  // ---------------------------------------------------------------
  void describe('spot order lifecycle', () => {
    const makeOrderParams = (): PlaceOrderParams['order'] => ({
      subaccountName: TEST_SUBACCOUNT_NAME,
      expiration: getExpiration(),
      price: shortLimitPrice,
      amount: addDecimals(-3.5),
      appendix: packOrderAppendix({ orderExecutionType: 'post_only' }),
    });

    void test('places a spot limit order', async () => {
      const result = await nadoClient.market.placeOrder({
        order: makeOrderParams(),
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });

      debugPrint('Place order result', result);
      assertDefined(result, 'spotOrderResult');
      assert.equal(result.status, 'success', 'spot order should succeed');
      assertHexString(result.data.digest, 'spotOrderResult.data.digest');
    });

    void test('places an isolated perp order with custom id', async () => {
      const result = await nadoClient.market.placeOrder({
        id: 100,
        order: {
          ...makeOrderParams(),
          appendix: packOrderAppendix({
            isolated: { margin: addDecimals(1000) },
            orderExecutionType: 'post_only',
          }),
        },
        productId: TEST_PRODUCT_IDS.PERP_ETH,
      });

      debugPrint('Place iso order w/ custom id result', result);
      assertDefined(result, 'isoOrderResult');
      assert.equal(result.status, 'success', 'iso order should succeed');
      assertHexString(result.data.digest, 'isoOrderResult.data.digest');
    });

    void test('getSubaccountOrders returns orders for the spot product', async () => {
      const result = await nadoClient.context.engineClient.getSubaccountOrders({
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: walletClientAddress,
      });

      debugPrint('Subaccount orders', result);
      assertDefined(result, 'subaccountOrders');
      assertNonEmptyArray(result.orders, 'subaccountOrders.orders');
    });

    void test('cancels all spot orders', async () => {
      const ordersResult =
        await nadoClient.context.engineClient.getSubaccountOrders({
          productId: TEST_PRODUCT_IDS.SPOT_ETH,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: walletClientAddress,
        });
      assertNonEmptyArray(ordersResult.orders, 'ordersToCancel');

      const result = await nadoClient.market.cancelOrders({
        digests: ordersResult.orders.map((order) => order.digest),
        productIds: ordersResult.orders.map((order) => order.productId),
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('Cancel order result', result);
      assertDefined(result, 'cancelResult');
      assert.equal(result.status, 'success', 'cancel should succeed');
    });
  });

  // ---------------------------------------------------------------
  // Perp order placement with cancel-and-place
  // ---------------------------------------------------------------
  void describe('perp order cancel-and-place', () => {
    let perpOrderDigest: string;

    void test('places a perp limit order', async () => {
      const orderParams: PlaceOrderParams['order'] = {
        subaccountName: TEST_SUBACCOUNT_NAME,
        expiration: getExpiration(),
        price: shortLimitPrice,
        amount: addDecimals(-3.5),
        appendix: packOrderAppendix({ orderExecutionType: 'post_only' }),
      };

      const result = await nadoClient.market.placeOrder({
        order: orderParams,
        productId: TEST_PRODUCT_IDS.PERP_ETH,
      });

      debugPrint('Place perp order result', result);
      assertDefined(result, 'perpOrderResult');
      assert.equal(result.status, 'success', 'perp order should succeed');
      assertHexString(result.data.digest, 'perpOrderResult.data.digest');

      perpOrderDigest = getOrderDigest({
        order: result.orderParams,
        chainId: chainId,
        productId: TEST_PRODUCT_IDS.PERP_ETH,
      });
    });

    void test('cancel-and-place replaces the perp order with an IOC order', async () => {
      assertDefined(perpOrderDigest, 'perpOrderDigest (from prior test)');

      const result = await nadoClient.market.cancelAndPlace({
        cancelOrders: {
          digests: [perpOrderDigest],
          productIds: [TEST_PRODUCT_IDS.PERP_ETH],
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
        placeOrder: {
          order: {
            subaccountName: TEST_SUBACCOUNT_NAME,
            expiration: getExpiration(),
            price: shortMarketPrice,
            amount: addDecimals(-3.5),
            appendix: packOrderAppendix({ orderExecutionType: 'ioc' }),
          },
          productId: TEST_PRODUCT_IDS.PERP_ETH,
          nonce: getOrderNonce(),
        },
      });

      debugPrint('Cancel and place order result', result);
      assertDefined(result, 'cancelAndPlaceResult');
      assert.equal(result.status, 'success', 'cancel-and-place should succeed');
    });
  });

  // ---------------------------------------------------------------
  // Batch order placement
  // ---------------------------------------------------------------
  void describe('batch order placement', () => {
    void test('placeOrders places multiple orders at once', async () => {
      const result = await nadoClient.market.placeOrders({
        stopOnFailure: true,
        orders: [
          {
            order: {
              subaccountName: TEST_SUBACCOUNT_NAME,
              expiration: getExpiration(),
              price: shortLimitPrice,
              amount: addDecimals(-1),
              appendix: packOrderAppendix({
                orderExecutionType: 'post_only',
              }),
            },
            productId: TEST_PRODUCT_IDS.SPOT_ETH,
          },
          {
            order: {
              subaccountName: TEST_SUBACCOUNT_NAME,
              expiration: getExpiration(),
              price: shortLimitPrice,
              amount: addDecimals(-2),
              appendix: packOrderAppendix({
                orderExecutionType: 'post_only',
              }),
            },
            productId: TEST_PRODUCT_IDS.SPOT_ETH,
          },
        ],
      });

      debugPrint('Place orders result', result);
      assertDefined(result, 'placeOrdersResult');
      assertNonEmptyArray(result.data, 'placeOrdersResult.data');
      assert.equal(
        result.data.length,
        2,
        'should return results for both orders',
      );
    });
  });

  // ---------------------------------------------------------------
  // Cancel product orders
  // ---------------------------------------------------------------
  void describe('cancelProductOrders', () => {
    void test('places orders then cancels all via product IDs', async () => {
      await nadoClient.market.placeOrder({
        order: {
          subaccountName: TEST_SUBACCOUNT_NAME,
          expiration: getExpiration(),
          price: shortLimitPrice,
          amount: addDecimals(-1),
          appendix: packOrderAppendix({ orderExecutionType: 'post_only' }),
        },
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });

      await nadoClient.market.placeOrder({
        order: {
          subaccountName: TEST_SUBACCOUNT_NAME,
          expiration: getExpiration(),
          price: shortLimitPrice,
          amount: addDecimals(-1),
          appendix: packOrderAppendix({ orderExecutionType: 'post_only' }),
        },
        productId: TEST_PRODUCT_IDS.PERP_ETH,
      });

      const result = await nadoClient.market.cancelProductOrders({
        subaccountName: TEST_SUBACCOUNT_NAME,
        productIds: [TEST_PRODUCT_IDS.SPOT_ETH, TEST_PRODUCT_IDS.PERP_ETH],
      });

      debugPrint('Cancel product orders result', result);
      assertDefined(result, 'cancelProductOrdersResult');
      assert.equal(
        result.status,
        'success',
        'cancelProductOrders should succeed',
      );
    });
  });
});
