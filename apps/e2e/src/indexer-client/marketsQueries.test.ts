import { CandlestickPeriod, IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, QUOTE_PRODUCT_ID, TimeInSeconds } from '@nadohq/shared';
import assert from 'node:assert';
import { before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertBigNumberFinite,
  assertBigNumberPositive,
  assertDefined,
  assertNonEmptyArray,
  assertNumber,
  assertRecord,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  assertCandlestickShape,
  assertFundingRateShape,
  assertMarketSnapshotShape,
  assertPerpPricesShape,
  assertProductSnapshotShape,
  assertV2SymbolShape,
  assertV2TickerShape,
} from '../utils/shapeAssertions';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[indexer-client]: market queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;

    before(async () => {
      await delay(TEST_DELAYS.BETWEEN_SUITES);

      const tc = createTestContext();
      client = tc.indexer;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.BETWEEN_TESTS);
    });

    void test('getFundingRate returns a valid funding rate', async () => {
      const fundingRate = await client.getFundingRate({
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });

      debugPrint('Funding rate', fundingRate.fundingRate.toString());
      assertDefined(fundingRate, 'fundingRate');
      assertFundingRateShape(fundingRate, 'fundingRate');
    });

    void test('getMultiProductFundingRates returns rates for multiple products', async () => {
      const fundingRates = await client.getMultiProductFundingRates({
        productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
      });

      debugPrint('Multiple products funding rate', fundingRates);
      assertDefined(fundingRates, 'fundingRates');
      assertRecord(fundingRates, 'fundingRates');
      for (const rate of Object.values(fundingRates)) {
        assertFundingRateShape(rate, 'fundingRates entry');
      }
    });

    void test('getPerpPrices returns valid prices', async () => {
      const price = await client.getPerpPrices({
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });

      debugPrint('Perp prices', price);
      assertDefined(price, 'perpPrices');
      assertPerpPricesShape(price, 'perpPrices');
    });

    void test('getMultiProductPerpPrices returns prices for multiple products', async () => {
      const perpPrices = await client.getMultiProductPerpPrices({
        productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
      });

      debugPrint('Multiple products perp prices', perpPrices);
      assertDefined(perpPrices, 'perpPrices');
      assertRecord(perpPrices, 'perpPrices');
      for (const prices of Object.values(perpPrices)) {
        assertPerpPricesShape(prices, 'perpPrices entry');
      }
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
      assertNonEmptyArray(oraclePrices, 'oraclePrices');
      for (let i = 0; i < oraclePrices.length; i++) {
        const price = oraclePrices[i];
        const label = `oraclePrices[${i}]`;
        assertNumber(price.productId, `${label}.productId`);
        assertBigNumberFinite(price.oraclePrice, `${label}.oraclePrice`);
        assertBigNumberFinite(price.updateTime, `${label}.updateTime`);
      }
    });

    void test('getQuotePrice returns a valid USDT price', async () => {
      const quotePrice = await client.getQuotePrice();

      debugPrint('Quote Price (USDT)', quotePrice);
      assertDefined(quotePrice, 'quotePrice');
      assertBigNumberPositive(quotePrice.price, 'quotePrice.price');
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
      assertArrayElements(candlesticks, assertCandlestickShape, 'candlesticks');
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
      assertArray(marketSnapshots, 'marketSnapshots');
      assertArrayElements(
        marketSnapshots,
        assertMarketSnapshotShape,
        'marketSnapshots',
      );
    });

    void test('getProductSnapshots returns snapshots for a single product', async () => {
      const productSnapshots = await client.getProductSnapshots({
        limit: 2,
        maxTimestampInclusive: nowInSeconds(),
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });

      debugPrint('Product snapshots', productSnapshots);
      assertArray(productSnapshots, 'productSnapshots');
      assertArrayElements(
        productSnapshots,
        assertProductSnapshotShape,
        'productSnapshots',
      );
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
      assertRecord(multiProductSnapshots, 'multiProductSnapshots');
      for (const [timestamp, productMap] of Object.entries(
        multiProductSnapshots,
      )) {
        assertDefined(productMap, `multiProductSnapshots[${timestamp}]`);
        for (const snapshot of Object.values(productMap)) {
          assertProductSnapshotShape(
            snapshot,
            `multiProductSnapshots[${timestamp}] entry`,
          );
        }
      }
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
      assertRecord(
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
      assertArrayElements(
        edgeCandlesticks,
        assertCandlestickShape,
        'edgeCandlesticks',
      );
    });

    void test('getEdgeMarketSnapshots returns snapshots grouped by chain id', async () => {
      const edgeSnapshots = await client.getEdgeMarketSnapshots({
        granularity: TimeInSeconds.HOUR,
        limit: 2,
        maxTimeInclusive: nowInSeconds(),
      });

      debugPrint('Edge market snapshots', edgeSnapshots);
      assertDefined(edgeSnapshots, 'edgeMarketSnapshots');
      assertRecord(edgeSnapshots, 'edgeMarketSnapshots');
      for (const [chainId, chainSnapshots] of Object.entries(edgeSnapshots)) {
        assertArray(chainSnapshots, `edgeMarketSnapshots[${chainId}]`);
        assertArrayElements(
          chainSnapshots,
          assertMarketSnapshotShape,
          `edgeMarketSnapshots[${chainId}]`,
        );
      }
    });

    void test('getV2Tickers returns ticker data', async () => {
      const tickers = await client.getV2Tickers({
        market: 'perp',
        edge: false,
      });

      debugPrint('Tickers', tickers);
      assertDefined(tickers, 'tickers');
      assertRecord(tickers, 'tickers');
      for (const ticker of Object.values(tickers)) {
        assertV2TickerShape(ticker, 'tickers entry');
      }
    });

    void test('getV2Symbols returns symbol data', async () => {
      const symbols = await client.getV2Symbols();

      debugPrint('Symbols', symbols);
      assertDefined(symbols, 'symbols');
      assertRecord(symbols, 'symbols');
      for (const symbol of Object.values(symbols)) {
        assertV2SymbolShape(symbol, 'symbols entry');
      }
    });

    void test('getV2Symbols filters by product type', async () => {
      const perpSymbols = await client.getV2Symbols({
        productType: 'perp',
      });

      debugPrint('Perp Symbols', perpSymbols);
      assertDefined(perpSymbols, 'perpSymbols');
      assertRecord(perpSymbols, 'perpSymbols');
      for (const symbol of Object.values(perpSymbols)) {
        assertV2SymbolShape(symbol, 'perpSymbols entry');
        assert.equal(
          symbol.type,
          'perp',
          `Expected perp but got ${symbol.type} for product ${symbol.productId}`,
        );
      }
    });
  },
);
