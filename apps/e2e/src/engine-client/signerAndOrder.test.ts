import { EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  getOrderDigest,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertBigNumberFinite,
  assertBigNumberNonNegative,
  assertDefined,
  assertHexString,
  assertNonEmptyArray,
  assertNumber,
  assertRecord,
} from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  assertEngineMarketPriceShape,
  assertEngineOrderShape,
} from '../utils/shapeAssertions';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe('[engine-client]: signer and orders', () => {
  let tc: RunContext;
  let shortLimitPrice: BigNumber;

  before(async () => {
    await delay(TEST_DELAYS.LONG);

    tc = createTestContext();

    const markets = await tc.engine.getAllMarkets();
    const oraclePrice = markets.find(
      (m) => m.productId === TEST_PRODUCT_IDS.SPOT_BTC,
    )!.product.oraclePrice;
    shortLimitPrice = oraclePrice.multipliedBy(1.1).decimalPlaces(0);
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

  // ---------------------------------------------------------------
  // Order placement, querying, and cancellation
  // ---------------------------------------------------------------
  void describe('order placement and queries', () => {
    function makeSpotOrder(): EngineOrderParams {
      return {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(-0.03),
        expiration: getExpiration(),
        price: shortLimitPrice,
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };
    }

    function makePerpOrder(
      opts?: Partial<{
        amount: EngineOrderParams['amount'];
        isolated: boolean;
      }>,
    ): EngineOrderParams {
      const amount = opts?.amount ?? addDecimals(-0.01);
      const appendix = opts?.isolated
        ? packOrderAppendix({
            orderExecutionType: 'default',
            isolated: {
              margin: addDecimals(shortLimitPrice.multipliedBy(0.03).div(10)),
            },
          })
        : packOrderAppendix({ orderExecutionType: 'default' });

      return {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount,
        expiration: getExpiration(),
        price: shortLimitPrice,
        appendix,
      };
    }

    async function placeAndGetDigest(
      productId: number,
      order: EngineOrderParams,
    ): Promise<{
      digest: string;
      result: Awaited<ReturnType<typeof tc.engine.placeOrder>>;
    }> {
      const result = await tc.engine.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(productId),
        chainId: tc.chainId,
        productId,
        order,
        nonce: getOrderNonce(),
      });
      assertDefined(result, 'placeOrderResult');
      assert.equal(result.status, 'success', 'order should succeed');
      return { digest: result.data.digest, result };
    }

    void test('places a spot limit order and verifies its digest', async () => {
      const spotOrder: EngineOrderParams = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(-0.03),
        expiration: getExpiration(),
        price: shortLimitPrice,
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };

      const result = await tc.engine.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId: tc.chainId,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        order: spotOrder,
        nonce: getOrderNonce(),
      });

      debugPrint('Spot order result', result);
      assertDefined(result, 'spotOrderResult');
      assert.equal(result.status, 'success', 'spot order should succeed');
      assertHexString(result.data.digest, 'spotOrderResult.data.digest');

      const computedDigest = getOrderDigest({
        order: result.orderParams,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        chainId: tc.chainId,
      });
      assert.equal(
        computedDigest,
        result.data.digest,
        'computed and returned order digests should match',
      );
    });

    void test('places an isolated perp order and verifies its digest', async () => {
      const isolatedOrder = makePerpOrder({
        amount: addDecimals(-0.03),
        isolated: true,
      });

      const result = await tc.engine.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
        chainId: tc.chainId,
        productId: TEST_PRODUCT_IDS.PERP_BTC,
        order: isolatedOrder,
        nonce: getOrderNonce(),
      });

      debugPrint('Isolated perp order result', result);
      assertDefined(result, 'isolatedOrderResult');
      assert.equal(result.status, 'success', 'isolated order should succeed');
      assertHexString(result.data.digest, 'isolatedOrderResult.data.digest');

      const computedDigest = getOrderDigest({
        order: result.orderParams,
        productId: TEST_PRODUCT_IDS.PERP_BTC,
        chainId: tc.chainId,
      });
      assert.equal(
        computedDigest,
        result.data.digest,
        'computed and returned isolated order digests should match',
      );
    });

    void test('getSubaccountOrders returns orders for the perp product', async () => {
      await placeAndGetDigest(TEST_PRODUCT_IDS.PERP_BTC, makePerpOrder());

      const result = await tc.engine.getSubaccountOrders({
        productId: TEST_PRODUCT_IDS.PERP_BTC,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
      });

      debugPrint('Subaccount orders', result);
      assertDefined(result, 'subaccountOrders');
      assertNumber(result.productId, 'subaccountOrders.productId');
      assertArray(result.orders, 'subaccountOrders.orders');
      assertArrayElements(
        result.orders,
        assertEngineOrderShape,
        'subaccountOrders.orders',
      );
    });

    void test('getMarketLiquidity returns bid and ask ticks', async () => {
      const result = await tc.engine.getMarketLiquidity({
        depth: 10,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      debugPrint('Market liquidity', result);
      assertDefined(result, 'marketLiquidity');
      assertArray(result.bids, 'marketLiquidity.bids');
      assertArray(result.asks, 'marketLiquidity.asks');
      for (const side of ['bids', 'asks'] as const) {
        assertArrayElements(
          result[side],
          (tick, label) => {
            assertBigNumberFinite(tick.price, `${label}.price`);
            assertBigNumberFinite(tick.liquidity, `${label}.liquidity`);
          },
          `marketLiquidity.${side}`,
        );
      }
    });

    void test('getMarketPrice returns bid and ask prices', async () => {
      const result = await tc.engine.getMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      debugPrint('Market price', result);
      assertDefined(result, 'marketPrice');
      assertEngineMarketPriceShape(result, 'marketPrice');
    });

    void test('getMarketPrices returns prices for multiple products', async () => {
      const result = await tc.engine.getMarketPrices({
        productIds: [
          TEST_PRODUCT_IDS.SPOT_BTC,
          TEST_PRODUCT_IDS.PERP_BTC,
          TEST_PRODUCT_IDS.SPOT_ETH,
        ],
      });

      debugPrint('Market prices', result);
      assertDefined(result, 'marketPrices');
      assertNonEmptyArray(result.marketPrices, 'marketPrices.marketPrices');
      assertArrayElements(
        result.marketPrices,
        assertEngineMarketPriceShape,
        'marketPrices.marketPrices',
      );
    });

    void test('getSubaccountFeeRates returns fee information', async () => {
      const result = await tc.engine.getSubaccountFeeRates({
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
      });

      debugPrint('Fee rates', result);
      assertDefined(result, 'feeRates');
      assertRecord(result.orders, 'feeRates.orders');
      assertBigNumberFinite(
        result.takerSequencerFee,
        'feeRates.takerSequencerFee',
      );
      assertNumber(result.feeTier, 'feeRates.feeTier');
    });

    void test('getMaxOrderSize returns a valid order size', async () => {
      const marketPrice = await tc.engine.getMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      const result = await tc.engine.getMaxOrderSize({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        price: marketPrice.ask,
        spotLeverage: false,
        side: 'long',
      });

      debugPrint('Max order size', result);
      assertBigNumberNonNegative(result, 'maxOrderSize');
    });

    void test('getMaxOrderSize supports reduce-only mode', async () => {
      const marketPrice = await tc.engine.getMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      const result = await tc.engine.getMaxOrderSize({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        price: marketPrice.ask,
        side: 'short',
        spotLeverage: false,
        reduceOnly: true,
      });

      debugPrint('Reduce-only max order size', result);
      assertBigNumberNonNegative(result, 'reduceOnlyMaxOrderSize');
    });

    void test('getMaxWithdrawable returns a valid amount', async () => {
      const result = await tc.engine.getMaxWithdrawable({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: QUOTE_PRODUCT_ID,
      });

      debugPrint('Max withdrawable', result);
      assertBigNumberNonNegative(result, 'maxWithdrawable');
    });

    void test('getMaxWithdrawable supports no-spot-leverage mode', async () => {
      const result = await tc.engine.getMaxWithdrawable({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: QUOTE_PRODUCT_ID,
        spotLeverage: false,
      });

      debugPrint('Max withdrawable (no spot leverage)', result);
      assertBigNumberNonNegative(result, 'maxWithdrawableNoSpotLeverage');
    });

    void test('getOrder retrieves the placed spot order by digest', async () => {
      const { digest } = await placeAndGetDigest(
        TEST_PRODUCT_IDS.SPOT_BTC,
        makeSpotOrder(),
      );

      const result = await tc.engine.getOrder({
        digest,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      debugPrint('Queried spot order', result);
      assertDefined(result, 'queriedSpotOrder');
      assertEngineOrderShape(result, 'queriedSpotOrder');
      assert.equal(result.digest, digest, 'digest should match');
    });

    void test('getOrder retrieves the placed isolated perp order by digest', async () => {
      const { digest } = await placeAndGetDigest(
        TEST_PRODUCT_IDS.PERP_BTC,
        makePerpOrder({ amount: addDecimals(-0.03), isolated: true }),
      );

      const result = await tc.engine.getOrder({
        digest,
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });

      debugPrint('Queried perp isolated order', result);
      assertDefined(result, 'queriedIsolatedOrder');
      assertEngineOrderShape(result, 'queriedIsolatedOrder');
      assert.equal(result.digest, digest, 'digest should match');
    });

    void test('getSubaccountMultiProductOrders returns orders across products', async () => {
      await placeAndGetDigest(TEST_PRODUCT_IDS.SPOT_BTC, makeSpotOrder());
      await placeAndGetDigest(TEST_PRODUCT_IDS.PERP_BTC, makePerpOrder());

      const result = await tc.engine.getSubaccountMultiProductOrders({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC, TEST_PRODUCT_IDS.PERP_BTC],
      });

      debugPrint('Multi-product orders', result);
      assertDefined(result, 'multiProductOrders');
      assertArray(result.productOrders, 'multiProductOrders.productOrders');
    });

    void test('cancelOrders cancels the placed spot and perp orders', async () => {
      const { digest: spotDigest } = await placeAndGetDigest(
        TEST_PRODUCT_IDS.SPOT_BTC,
        makeSpotOrder(),
      );
      const { digest: perpDigest } = await placeAndGetDigest(
        TEST_PRODUCT_IDS.PERP_BTC,
        makePerpOrder(),
      );

      const result = await tc.engine.cancelOrders({
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC, TEST_PRODUCT_IDS.PERP_BTC],
        digests: [spotDigest, perpDigest],
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Cancel orders result', result);
      assertDefined(result, 'cancelResult');
      assert.equal(result.status, 'success', 'cancel should succeed');
    });

    void test('getSubaccountOrders is empty after cancellation', async () => {
      const result = await tc.engine.getSubaccountOrders({
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('Subaccount orders after cancel', result);
      assertDefined(result, 'ordersAfterCancel');
      assertArray(result.orders, 'ordersAfterCancel.orders');
    });

    void test('getMaxWithdrawable reflects freed margin after cancellation', async () => {
      const result = await tc.engine.getMaxWithdrawable({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: QUOTE_PRODUCT_ID,
      });

      debugPrint('Max withdrawable after cancel', result);
      assertDefined(result, 'maxWithdrawableAfterCancel');
      assert.ok(
        result.isFinite(),
        'maxWithdrawableAfterCancel should be finite',
      );
    });
  });

  // ---------------------------------------------------------------
  // Multi-product order placement and bulk cancellation
  // ---------------------------------------------------------------
  void describe('multi-product order placement and cancellation', () => {
    void test('places orders for spot and perp products', async () => {
      for (const productId of [
        TEST_PRODUCT_IDS.SPOT_BTC,
        TEST_PRODUCT_IDS.PERP_BTC,
      ]) {
        const verifyingAddr = getOrderVerifyingAddress(productId);
        const order: EngineOrderParams = {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          amount: addDecimals(-0.01),
          expiration: getExpiration(),
          price: shortLimitPrice,
          appendix: packOrderAppendix({ orderExecutionType: 'default' }),
        };

        const placeResult = await tc.engine.placeOrder({
          verifyingAddr,
          productId,
          order,
          nonce: getOrderNonce(),
          chainId: tc.chainId,
        });
        debugPrint(`Order placed for product ${productId}`, placeResult);
        assertDefined(placeResult, `placeResult (product ${productId})`);
        assert.equal(
          placeResult.status,
          'success',
          `order for product ${productId} should succeed`,
        );

        await delay(TEST_DELAYS.STANDARD);
      }
    });

    void test('cancelProductOrders cancels all open orders', async () => {
      const result = await tc.engine.cancelProductOrders({
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC, TEST_PRODUCT_IDS.PERP_BTC],
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Cancel product orders result', result);
      assertDefined(result, 'cancelProductOrdersResult');
      assert.equal(
        result.status,
        'success',
        'cancelProductOrders should succeed',
      );
    });

    void test('verifies all orders are cancelled', async () => {
      for (const productId of [
        TEST_PRODUCT_IDS.SPOT_BTC,
        TEST_PRODUCT_IDS.PERP_BTC,
      ]) {
        const result = await tc.engine.getSubaccountOrders({
          productId,
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });

        debugPrint(`Orders after cancel (product ${productId})`, result);
        assertDefined(result, `ordersAfterCancel (product ${productId})`);
        assertArray(
          result.orders,
          `ordersAfterCancel.orders (product ${productId})`,
        );
      }
    });
  });
});
