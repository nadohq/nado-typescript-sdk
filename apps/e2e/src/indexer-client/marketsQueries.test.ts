import { CandlestickPeriod, IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, QUOTE_PRODUCT_ID, TimeInSeconds } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArray,
  assertDefined,
  assertNonEmptyArray,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_PRODUCT_IDS, TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[indexer-client]: market queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      client = new IndexerClient({
        url: context.endpoints.indexer,
        walletClient,
      });
    });

    void test('getFundingRate returns a valid funding rate', async () => {
      const fundingRate = await client.getFundingRate({
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });

      debugPrint('Funding rate', fundingRate.fundingRate.toString());
      assertDefined(fundingRate, 'fundingRate');
      assert.ok(
        fundingRate.fundingRate.isFinite(),
        'fundingRate should be finite',
      );
    });

    void test('getMultiProductFundingRates returns rates for multiple products', async () => {
      const fundingRates = await client.getMultiProductFundingRates({
        productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
      });

      debugPrint('Multiple products funding rate', fundingRates);
      assertDefined(fundingRates, 'fundingRates');
      assertNonEmptyArray(Object.values(fundingRates), 'fundingRates entries');
    });

    void test('getPerpPrices returns valid prices', async () => {
      const price = await client.getPerpPrices({
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });

      debugPrint('Perp prices', price);
      assertDefined(price, 'perpPrices');
      assert.ok(price.indexPrice.isFinite(), 'indexPrice should be finite');
      assert.ok(price.markPrice.isFinite(), 'markPrice should be finite');
    });

    void test('getMultiProductPerpPrices returns prices for multiple products', async () => {
      const perpPrices = await client.getMultiProductPerpPrices({
        productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
      });

      debugPrint('Multiple products perp prices', perpPrices);
      assertDefined(perpPrices, 'perpPrices');
      assertNonEmptyArray(Object.values(perpPrices), 'perpPrices entries');
    });

    void test('getOraclePrices returns prices for requested products', async () => {
      const productIds = [
        TEST_PRODUCT_IDS.SPOT_BTC,
        TEST_PRODUCT_IDS.PERP_BTC,
        TEST_PRODUCT_IDS.SPOT_ETH,
        TEST_PRODUCT_IDS.PERP_ETH,
      ];

      const oraclePrices = await client.getOraclePrices({ productIds });

      debugPrint('Oracle Prices', oraclePrices);
      assertDefined(oraclePrices, 'oraclePrices');
      assertNonEmptyArray(Object.values(oraclePrices), 'oraclePrices entries');
    });

    // TODO: What means valid USDT price?
    void test('getQuotePrice returns a valid USDT price', async () => {
      const quotePrice = await client.getQuotePrice();

      debugPrint('Quote Price (USDT)', quotePrice);
      assertDefined(quotePrice, 'quotePrice');
      assert.ok(
        quotePrice.price.isFinite(),
        'quotePrice.price should be finite',
      );
      assert.ok(quotePrice.price.gt(0), 'quotePrice.price should be positive');
    });

    void test('getCandlesticks returns candlestick data', async () => {
      const candlesticks = await client.getCandlesticks({
        limit: 2,
        maxTimeInclusive: nowInSeconds(),
        period: CandlestickPeriod.DAY,
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });

      debugPrint('Candlesticks', candlesticks);
      assertArray(candlesticks, 'candlesticks');
    });

    void test('getMarketSnapshots returns snapshots for requested products', async () => {
      const marketSnapshots = await client.getMarketSnapshots({
        granularity: TimeInSeconds.HOUR,
        limit: 1,
        productIds: [
          TEST_PRODUCT_IDS.PERP_BTC,
          TEST_PRODUCT_IDS.SPOT_ETH,
          TEST_PRODUCT_IDS.PERP_ETH,
        ],
      });

      debugPrint('Market snapshots', marketSnapshots);
      assertDefined(marketSnapshots, 'marketSnapshots');
    });

    void test('getProductSnapshots returns snapshots for a single product', async () => {
      const productSnapshots = await client.getProductSnapshots({
        limit: 2,
        maxTimestampInclusive: nowInSeconds(),
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });

      debugPrint('Product snapshots', productSnapshots);
      assertArray(productSnapshots, 'productSnapshots');
    });

    void test('getMultiProductSnapshots returns snapshots for multiple products', async () => {
      const multiProductSnapshots = await client.getMultiProductSnapshots({
        productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.SPOT_ETH],
      });

      debugPrint(
        'Multiple products snapshots',
        Object.values(multiProductSnapshots).pop(),
      );
      assertDefined(multiProductSnapshots, 'multiProductSnapshots');
    });

    void test('getMultiProductSnapshots supports multiple timestamps', async () => {
      const now = nowInSeconds();
      const multiTimestampProductSnapshots =
        await client.getMultiProductSnapshots({
          productIds: [
            QUOTE_PRODUCT_ID,
            TEST_PRODUCT_IDS.PERP_BTC,
            TEST_PRODUCT_IDS.PERP_ETH,
          ],
          maxTimestampInclusive: [
            now,
            now - TimeInSeconds.HOUR,
            now - TimeInSeconds.DAY,
          ],
        });

      debugPrint(
        'Multi timestamp and multi product snapshots',
        multiTimestampProductSnapshots,
      );
      assertDefined(
        multiTimestampProductSnapshots,
        'multiTimestampProductSnapshots',
      );
    });

    void test('getEdgeCandlesticks returns edge candlestick data', async () => {
      const edgeCandlesticks = await client.getEdgeCandlesticks({
        limit: 2,
        maxTimeInclusive: nowInSeconds(),
        period: CandlestickPeriod.DAY,
        productId: TEST_PRODUCT_IDS.SPOT_ETH,
      });

      debugPrint('Edge candlesticks', edgeCandlesticks);
      assertArray(edgeCandlesticks, 'edgeCandlesticks');
    });

    void test('getEdgeMarketSnapshots returns snapshots grouped by chain id', async () => {
      const edgeSnapshots = await client.getEdgeMarketSnapshots({
        granularity: TimeInSeconds.HOUR,
        limit: 2,
        maxTimeInclusive: nowInSeconds(),
      });

      debugPrint('Edge market snapshots', edgeSnapshots);
      assertDefined(edgeSnapshots, 'edgeMarketSnapshots');
      assert.ok(
        typeof edgeSnapshots === 'object' && !Array.isArray(edgeSnapshots),
        'edgeMarketSnapshots should be a record keyed by chain id',
      );
      const firstChainSnapshots = Object.values(edgeSnapshots)[0];
      assertArray(firstChainSnapshots ?? [], 'first chain edge snapshots');
    });

    void test('getV2Tickers returns ticker data', async () => {
      const tickers = await client.getV2Tickers({
        market: 'perp',
        edge: false,
      });

      debugPrint('Tickers', tickers);
      assertDefined(tickers, 'tickers');
      assertNonEmptyArray(Object.values(tickers), 'tickers entries');
    });
  },
);
