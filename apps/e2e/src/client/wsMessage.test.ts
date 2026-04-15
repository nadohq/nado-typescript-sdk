import { createNadoClient, NadoClient, PlaceOrderParams } from '@nadohq/client';
import { CandlestickPeriod } from '@nadohq/indexer-client';
import {
  addDecimals,
  getOrderDigest,
  getOrderNonce,
  getOrderVerifyingAddress,
  nowInSeconds,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
  subaccountToHex,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[client]: WS message building',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let nadoClient: NadoClient;
    let chainId: number;
    let walletClientAddress: string;

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      const context = createTestContext();
      chainId = context.chainId;
      walletClientAddress = context.walletClientAddress;

      nadoClient = createNadoClient(context.env.chainEnv, {
        walletClient: context.walletClient,
        publicClient: context.publicClient,
      });
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    // ---------------------------------------------------------------
    // Execute messages
    // ---------------------------------------------------------------
    void describe('execute messages', () => {
      void test('buildPlaceOrderMessage returns a valid payload', async () => {
        const orderParams: PlaceOrderParams['order'] = {
          subaccountName: TEST_SUBACCOUNT_NAME,
          expiration: nowInSeconds() + 60,
          price: 28000,
          amount: addDecimals(0.01),
          appendix: packOrderAppendix({ orderExecutionType: 'default' }),
        };

        const wsOrder = {
          ...orderParams,
          subaccountOwner: walletClientAddress,
          nonce: getOrderNonce(),
        };
        const wsOrderSig = await nadoClient.context.engineClient.sign(
          'place_order',
          getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
          chainId,
          wsOrder,
        );

        const result = nadoClient.ws.execute.buildPlaceOrderMessage({
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
          order: wsOrder,
          signature: wsOrderSig,
        }).payload;

        debugPrint('Place Order WS request', result);
        assertDefined(result, 'placeOrderPayload');
        assert.equal(typeof result, 'object', 'payload should be an object');
      });

      void test('buildCancelOrdersMessage returns a valid message', () => {
        const orderParams: PlaceOrderParams['order'] = {
          subaccountName: TEST_SUBACCOUNT_NAME,
          expiration: nowInSeconds() + 60,
          price: 28000,
          amount: addDecimals(0.01),
          appendix: packOrderAppendix({ orderExecutionType: 'default' }),
        };

        const wsOrder = {
          ...orderParams,
          subaccountOwner: walletClientAddress,
          nonce: getOrderNonce(),
        };

        const digest = getOrderDigest({
          order: wsOrder,
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
          chainId,
        });

        const result = nadoClient.ws.execute.buildCancelOrdersMessage({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
          digests: [digest],
          signature: '',
          nonce: getOrderNonce(),
        });

        debugPrint('Cancel Order WS request', result);
        assertDefined(result, 'cancelOrdersMessage');
      });

      void test('buildWithdrawCollateralMessage returns a valid message', async () => {
        const result =
          await nadoClient.ws.execute.buildWithdrawCollateralMessage({
            subaccountOwner: walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
            productId: QUOTE_PRODUCT_ID,
            amount: addDecimals(4999),
            signature: '',
          });

        debugPrint('Withdraw Collateral WS request', result);
        assertDefined(result, 'withdrawCollateralMessage');
      });
    });

    // ---------------------------------------------------------------
    // Query messages
    // ---------------------------------------------------------------
    void describe('query messages', () => {
      void test('buildQueryMessage for subaccount_info returns a valid message', () => {
        const result = nadoClient.ws.query.buildQueryMessage(
          'subaccount_info',
          {
            subaccount: subaccountToHex({
              subaccountOwner: walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            }),
          },
        );

        debugPrint('Query subaccount info WS request', result);
        assertDefined(result, 'querySubaccountInfoMessage');
      });
    });

    // ---------------------------------------------------------------
    // Subscription messages
    // ---------------------------------------------------------------
    void describe('subscription messages', () => {
      void test('builds a trade subscription message', () => {
        const stream = nadoClient.ws.subscription.buildSubscriptionParams(
          'trade',
          { product_id: QUOTE_PRODUCT_ID },
        );
        const result = nadoClient.ws.subscription.buildSubscriptionMessage(
          1,
          'subscribe',
          stream,
        );

        debugPrint('Trade subscription WS request', result);
        assertDefined(result, 'tradeSubscriptionMessage');
      });

      void test('builds a fill unsubscription message', () => {
        const stream = nadoClient.ws.subscription.buildSubscriptionParams(
          'fill',
          {
            product_id: TEST_PRODUCT_IDS.SPOT_BTC,
            subaccount: subaccountToHex({
              subaccountOwner: walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            }),
          },
        );
        const result = nadoClient.ws.subscription.buildSubscriptionMessage(
          1,
          'unsubscribe',
          stream,
        );

        debugPrint('Fill unsubscribe WS request', result);
        assertDefined(result, 'fillUnsubscribeMessage');
      });

      void test('builds a position_change subscription for all products', () => {
        const stream = nadoClient.ws.subscription.buildSubscriptionParams(
          'position_change',
          {
            subaccount: subaccountToHex({
              subaccountOwner: walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            }),
          },
        );
        const result = nadoClient.ws.subscription.buildSubscriptionMessage(
          5,
          'subscribe',
          stream,
        );

        debugPrint(
          'Position Change (all products) subscription WS request',
          result,
        );
        assertDefined(result, 'positionChangeSubscriptionMessage');
      });

      void test('builds a latest_candlestick subscription message', () => {
        const stream = nadoClient.ws.subscription.buildSubscriptionParams(
          'latest_candlestick',
          {
            product_id: TEST_PRODUCT_IDS.SPOT_BTC,
            granularity: CandlestickPeriod.HOUR,
          },
        );
        const result = nadoClient.ws.subscription.buildSubscriptionMessage(
          6,
          'subscribe',
          stream,
        );

        debugPrint('Latest Candlestick subscription WS request', result);
        assertDefined(result, 'latestCandlestickSubscriptionMessage');
      });

      void test('builds a liquidation subscription message', () => {
        const stream = nadoClient.ws.subscription.buildSubscriptionParams(
          'liquidation',
          { product_id: TEST_PRODUCT_IDS.SPOT_BTC },
        );
        const result = nadoClient.ws.subscription.buildSubscriptionMessage(
          7,
          'subscribe',
          stream,
        );

        debugPrint('Liquidation subscription WS request', result);
        assertDefined(result, 'liquidationSubscriptionMessage');
      });

      void test('builds a funding_payment subscription message', () => {
        const stream = nadoClient.ws.subscription.buildSubscriptionParams(
          'funding_payment',
          { product_id: TEST_PRODUCT_IDS.SPOT_BTC },
        );
        const result = nadoClient.ws.subscription.buildSubscriptionMessage(
          8,
          'subscribe',
          stream,
        );

        debugPrint('Funding payment subscription WS request', result);
        assertDefined(result, 'fundingPaymentSubscriptionMessage');
      });

      void test('builds a list subscriptions message', () => {
        const result = nadoClient.ws.subscription.buildSubscriptionMessage(
          9,
          'list',
          {},
        );

        debugPrint('List subscriptions WS request', result);
        assertDefined(result, 'listSubscriptionsMessage');
      });
    });
  },
);
