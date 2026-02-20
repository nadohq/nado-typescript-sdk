import { createNadoClient, NadoClient } from '@nadohq/client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArray,
  assertDefined,
  assertNonEmptyArray,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe('[client]: queries', { timeout: TEST_TIMEOUTS.DEFAULT }, () => {
  let nadoClient: NadoClient;
  let walletClientAddress: string;

  before(() => {
    const context = createTestContext();
    const walletClient = context.getWalletClient();
    const publicClient = context.publicClient;
    walletClientAddress = walletClient.account.address;

    nadoClient = createNadoClient(context.env.chainEnv, {
      walletClient,
      publicClient,
    });
  });

  void test('getTime returns engine server time', async () => {
    const time = await nadoClient.context.engineClient.getTime();

    debugPrint('Engine time', time);
    assertDefined(time, 'engineTime');
  });

  void test('getSymbols returns market symbols', async () => {
    const symbols = await nadoClient.context.engineClient.getSymbols({});

    debugPrint('Symbols', symbols);
    assertDefined(symbols, 'symbols');
    assertDefined(symbols.symbols, 'symbols.symbols');
    assert.ok(
      Object.keys(symbols.symbols).length > 0,
      'should have at least one symbol',
    );
  });

  void test('getAllMarkets returns product definitions', async () => {
    const allMarkets = await nadoClient.market.getAllMarkets();

    debugPrint('All Markets', allMarkets);
    assertNonEmptyArray(allMarkets, 'allMarkets');
  });

  void test('getEdgeAllMarkets returns edge market data', async () => {
    const edgeMarkets = await nadoClient.market.getEdgeAllMarkets();

    debugPrint('Edge all markets', edgeMarkets);
    assertDefined(edgeMarkets, 'edgeMarkets');
    assert.ok(
      Object.keys(edgeMarkets).length > 0,
      'edgeMarkets should have at least one edge entry',
    );
  });

  void test('getLatestMarketPrices returns prices for requested products', async () => {
    const prices = await nadoClient.market.getLatestMarketPrices({
      productIds: [
        TEST_PRODUCT_IDS.SPOT_BTC,
        TEST_PRODUCT_IDS.PERP_BTC,
        TEST_PRODUCT_IDS.SPOT_ETH,
      ],
    });

    debugPrint('Latest market prices', prices);
    assertDefined(prices, 'latestMarketPrices');
  });

  void test('getMarketLiquidity returns order book depth', async () => {
    const liquidity = await nadoClient.market.getMarketLiquidity({
      productId: TEST_PRODUCT_IDS.SPOT_ETH,
      depth: 5,
    });

    debugPrint('Market liquidity', liquidity);
    assertDefined(liquidity, 'marketLiquidity');
    assertArray(liquidity.bids, 'marketLiquidity.bids');
    assertArray(liquidity.asks, 'marketLiquidity.asks');
  });

  void test('getSubaccountSummary returns subaccount state', async () => {
    const summary = await nadoClient.subaccount.getSubaccountSummary({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Subaccount state', summary);
    assertDefined(summary, 'subaccountSummary');
    assertDefined(summary.health, 'subaccountSummary.health');
    assertArray(summary.balances, 'subaccountSummary.balances');
  });

  void test('getIsolatedPositions returns isolated positions', async () => {
    const positions = await nadoClient.subaccount.getIsolatedPositions({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Isolated positions', positions);
    assertArray(positions, 'isolatedPositions');
  });

  void test('getSubaccountFeeRates returns fee information', async () => {
    const feeRates = await nadoClient.subaccount.getSubaccountFeeRates({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Subaccount fee rates', feeRates);
    assertDefined(feeRates, 'feeRates');
  });

  void test('getSubaccountLinkedSignerWithRateLimit returns signer info', async () => {
    const linkedSigner =
      await nadoClient.subaccount.getSubaccountLinkedSignerWithRateLimit({
        subaccount: {
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
      });

    debugPrint('Linked signer with rate limit', linkedSigner);
    assertDefined(linkedSigner, 'linkedSigner');
  });

  void test('getReferralCode returns referral info or 422 when unset', async () => {
    try {
      const referralCode = await nadoClient.subaccount.getReferralCode({
        subaccount: {
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
      });

      debugPrint('Referral code', referralCode);
      assertDefined(referralCode, 'referralCode');
    } catch (error) {
      // 422 Unprocessable Entity is expected when the account has no referral code
      assert.ok(
        error instanceof Error && error.message.includes('422'),
        `expected 422 when referral code is unset, got: ${String(error)}`,
      );
    }
  });

  void test('getOpenSubaccountOrders returns orders for a product', async () => {
    const orders = await nadoClient.market.getOpenSubaccountOrders({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      productId: TEST_PRODUCT_IDS.SPOT_BTC,
    });

    debugPrint('Open subaccount orders', orders);
    assertDefined(orders, 'openOrders');
    assertArray(orders.orders, 'openOrders.orders');
  });

  void test('getOpenSubaccountMultiProductOrders returns orders across products', async () => {
    const orders = await nadoClient.market.getOpenSubaccountMultiProductOrders({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      productIds: [
        TEST_PRODUCT_IDS.SPOT_BTC,
        TEST_PRODUCT_IDS.PERP_BTC,
        TEST_PRODUCT_IDS.SPOT_ETH,
      ],
    });

    debugPrint('Open subaccount multi-product orders', orders);
    assertDefined(orders, 'multiProductOrders');
    assertArray(orders.productOrders, 'multiProductOrders.productOrders');
  });
});
