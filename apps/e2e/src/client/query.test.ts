import { createNadoClient, NadoClient } from '@nadohq/client';
import { CandlestickPeriod } from '@nadohq/indexer-client';
import {
  BigDecimal,
  nowInSeconds,
  QUOTE_PRODUCT_ID,
  TimeInSeconds,
} from '@nadohq/shared';
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

  void test('getEdgeCandlesticks returns edge candlestick data', async () => {
    const candlesticks = await nadoClient.market.getEdgeCandlesticks({
      productId: TEST_PRODUCT_IDS.SPOT_ETH,
      maxTimeInclusive: nowInSeconds(),
      limit: 2,
      period: CandlestickPeriod.DAY,
    });

    debugPrint('Edge candlesticks', candlesticks);
    assertArray(candlesticks, 'candlesticks');
  });

  void test('getEdgeMarketSnapshots returns edge market snapshots', async () => {
    const snapshots = await nadoClient.market.getEdgeMarketSnapshots({
      granularity: TimeInSeconds.HOUR,
      limit: 2,
      maxTimeInclusive: nowInSeconds(),
    });

    debugPrint('Edge market snapshots', snapshots);
    assertDefined(snapshots, 'edgeMarketSnapshots');
    assert.ok(
      typeof snapshots === 'object' && !Array.isArray(snapshots),
      'edgeMarketSnapshots should be record of chain id to snapshots',
    );
    const firstChainSnapshots = Object.values(snapshots)[0];
    assertArray(firstChainSnapshots ?? [], 'first chain snapshots');
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

  void describe('spot token queries', () => {
    void test('getTokenWalletBalance returns wallet token balance', async () => {
      const balance = await nadoClient.spot.getTokenWalletBalance({
        address: walletClientAddress,
        productId: QUOTE_PRODUCT_ID,
      });

      debugPrint('Token wallet balance', balance);
      assertDefined(balance, 'tokenWalletBalance');
      assert.equal(typeof balance, 'bigint', 'balance should be bigint');
      assert.ok(balance >= 0n, 'balance should be non-negative');
    });

    void test('getTokenAllowance returns allowance for endpoint', async () => {
      const allowance = await nadoClient.spot.getTokenAllowance({
        address: walletClientAddress,
        productId: QUOTE_PRODUCT_ID,
      });

      debugPrint('Token allowance', allowance);
      assertDefined(allowance, 'tokenAllowance');
      assert.ok(
        allowance.isFinite() && allowance.gte(0),
        'allowance should be finite and non-negative',
      );
    });
  });

  // ---------------------------------------------------------------
  // MarketAPI queries
  // ---------------------------------------------------------------

  void test('getHealthGroups returns health group definitions', async () => {
    const result = await nadoClient.market.getHealthGroups();

    debugPrint('Health groups', result);
    assertDefined(result, 'healthGroupsResult');
    assertArray(result.healthGroups, 'healthGroupsResult.healthGroups');
  });

  void test('getLatestMarketPrice returns bid and ask', async () => {
    const result = await nadoClient.market.getLatestMarketPrice({
      productId: TEST_PRODUCT_IDS.SPOT_BTC,
    });

    debugPrint('Latest market price', result);
    assertDefined(result, 'latestMarketPrice');
    assert.ok(result.bid.isFinite(), 'bid should be finite');
    assert.ok(result.ask.isFinite(), 'ask should be finite');
  });

  void test('getCandlesticks returns candlestick data', async () => {
    const candlesticks = await nadoClient.market.getCandlesticks({
      productId: TEST_PRODUCT_IDS.SPOT_ETH,
      period: CandlestickPeriod.DAY,
      maxTimeInclusive: nowInSeconds(),
      limit: 2,
    });

    debugPrint('Candlesticks', candlesticks);
    assertArray(candlesticks, 'candlesticks');
  });

  void test('getMaxOrderSize returns a finite max order size', async () => {
    const marketPrice = await nadoClient.market.getLatestMarketPrice({
      productId: TEST_PRODUCT_IDS.SPOT_BTC,
    });

    const result = await nadoClient.market.getMaxOrderSize({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      productId: TEST_PRODUCT_IDS.SPOT_BTC,
      price: marketPrice.bid,
      side: 'long',
      spotLeverage: false,
    });

    debugPrint('Max order size', result);
    assertDefined(result, 'maxOrderSize');
    assert.ok(
      result instanceof BigDecimal && result.isFinite(),
      'maxOrderSize should be a finite BigDecimal',
    );
  });

  void test('getFundingRate returns a valid funding rate', async () => {
    const result = await nadoClient.market.getFundingRate({
      productId: TEST_PRODUCT_IDS.PERP_BTC,
    });

    debugPrint('Funding rate', result);
    assertDefined(result, 'fundingRate');
    assert.ok(result.fundingRate.isFinite(), 'fundingRate should be finite');
  });

  void test('getMultiProductFundingRates returns rates for multiple products', async () => {
    const result = await nadoClient.market.getMultiProductFundingRates({
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
    });

    debugPrint('Multi-product funding rates', result);
    assertDefined(result, 'fundingRates');
    assertNonEmptyArray(Object.values(result), 'fundingRates entries');
  });

  void test('getProductSnapshots returns snapshots for a product', async () => {
    const result = await nadoClient.market.getProductSnapshots({
      productId: TEST_PRODUCT_IDS.PERP_BTC,
      limit: 2,
      maxTimestampInclusive: nowInSeconds(),
    });

    debugPrint('Product snapshots', result);
    assertArray(result, 'productSnapshots');
  });

  void test('getMarketSnapshots returns snapshots for requested products', async () => {
    const result = await nadoClient.market.getMarketSnapshots({
      granularity: TimeInSeconds.HOUR,
      limit: 1,
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.SPOT_ETH],
    });

    debugPrint('Market snapshots', result);
    assertDefined(result, 'marketSnapshots');
  });

  void test('getMultiProductSnapshots returns snapshots for multiple products', async () => {
    const result = await nadoClient.market.getMultiProductSnapshots({
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.SPOT_ETH],
    });

    debugPrint('Multi-product snapshots', result);
    assertDefined(result, 'multiProductSnapshots');
  });

  void test('getHistoricalOrders returns historical order data', async () => {
    const result = await nadoClient.market.getHistoricalOrders({
      subaccounts: [
        {
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
      ],
      limit: 5,
    });

    debugPrint('Historical orders', result);
    assertArray(result, 'historicalOrders');
  });

  // ---------------------------------------------------------------
  // PerpAPI queries
  // ---------------------------------------------------------------

  void test('getPerpPrices returns index and mark prices', async () => {
    const result = await nadoClient.perp.getPerpPrices({
      productId: TEST_PRODUCT_IDS.PERP_BTC,
    });

    debugPrint('Perp prices', result);
    assertDefined(result, 'perpPrices');
    assert.ok(result.indexPrice.isFinite(), 'indexPrice should be finite');
    assert.ok(result.markPrice.isFinite(), 'markPrice should be finite');
  });

  void test('getMultiProductPerpPrices returns prices for multiple products', async () => {
    const result = await nadoClient.perp.getMultiProductPerpPrices({
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
    });

    debugPrint('Multi-product perp prices', result);
    assertDefined(result, 'perpPrices');
    assertNonEmptyArray(Object.values(result), 'perpPrices entries');
  });

  // ---------------------------------------------------------------
  // SpotAPI queries
  // ---------------------------------------------------------------

  void test('getMaxWithdrawable returns a finite amount', async () => {
    const result = await nadoClient.spot.getMaxWithdrawable({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      productId: QUOTE_PRODUCT_ID,
    });

    debugPrint('Max withdrawable', result);
    assertDefined(result, 'maxWithdrawable');
    assert.ok(
      result instanceof BigDecimal && result.isFinite(),
      'maxWithdrawable should be a finite BigDecimal',
    );
  });

  void test('getMaxMintNlpAmount returns a finite amount', async () => {
    const result = await nadoClient.spot.getMaxMintNlpAmount({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      spotLeverage: true,
    });

    debugPrint('Max mint NLP amount', result);
    assertDefined(result, 'maxMintNlpAmount');
    assert.ok(
      result instanceof BigDecimal && result.isFinite(),
      'maxMintNlpAmount should be a finite BigDecimal',
    );
  });

  // ---------------------------------------------------------------
  // SubaccountAPI query
  // ---------------------------------------------------------------

  void test('getEngineEstimatedSubaccountSummary returns estimated state', async () => {
    const result =
      await nadoClient.subaccount.getEngineEstimatedSubaccountSummary({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        txs: [
          {
            type: 'apply_delta',
            tx: {
              productId: QUOTE_PRODUCT_ID,
              amountDelta: new BigDecimal(1000000000000000000n),
              vQuoteDelta: new BigDecimal(0),
            },
          },
        ],
      });

    debugPrint('Estimated subaccount summary', result);
    assertDefined(result, 'estimatedSummary');
    assertDefined(result.health, 'estimatedSummary.health');
    assertArray(result.balances, 'estimatedSummary.balances');
  });
});
