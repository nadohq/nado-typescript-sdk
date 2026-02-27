import { createNadoClient, NadoClient } from '@nadohq/client';
import { CandlestickPeriod } from '@nadohq/indexer-client';
import {
  addDecimals,
  BigDecimal,
  nowInSeconds,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
  TimeInSeconds,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertBigDecimalFinite,
  assertBigDecimalNonNegative,
  assertDefined,
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
  assertCandlestickShape,
  assertEngineMarketPriceShape,
  assertEngineOrderShape,
  assertFundingRateShape,
  assertIndexerOrderShape,
  assertLinkedSignerShape,
  assertMarketSnapshotShape,
  assertMarketWithProductShape,
  assertProductSnapshotShape,
  assertSubaccountSummaryShape,
} from '../utils/shapeAssertions';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe('[client]: queries', { timeout: TEST_TIMEOUTS.DEFAULT }, () => {
  let nadoClient: NadoClient;
  let walletClientAddress: string;
  let chainId: number;
  let endpointAddr: string;

  before(async () => {
    await delay(TEST_DELAYS.BETWEEN_SUITES);

    const context = createTestContext();
    const walletClient = context.getWalletClient();
    const publicClient = context.publicClient;
    walletClientAddress = walletClient.account.address;
    chainId = walletClient.chain.id;
    endpointAddr = context.contracts.endpoint;

    nadoClient = createNadoClient(context.env.chainEnv, {
      walletClient,
      publicClient,
    });
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.BETWEEN_TESTS);
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
    assertArrayElements(allMarkets, assertMarketWithProductShape, 'allMarkets');
  });

  void test('getEdgeAllMarkets returns edge market data', async () => {
    const edgeMarkets = await nadoClient.market.getEdgeAllMarkets();

    debugPrint('Edge all markets', edgeMarkets);
    assertDefined(edgeMarkets, 'edgeMarkets');
    assertRecord(edgeMarkets, 'edgeMarkets');
    for (const [chainId, markets] of Object.entries(edgeMarkets)) {
      assertNumber(Number(chainId), `edgeMarkets key ${chainId}`);
      assertNonEmptyArray(markets, `edgeMarkets[${chainId}]`);
      assertArrayElements(
        markets,
        assertMarketWithProductShape,
        `edgeMarkets[${chainId}]`,
      );
    }
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
    assertArrayElements(candlesticks, assertCandlestickShape, 'candlesticks');
  });

  void test('getEdgeMarketSnapshots returns edge market snapshots', async () => {
    const snapshots = await nadoClient.market.getEdgeMarketSnapshots({
      granularity: TimeInSeconds.HOUR,
      limit: 2,
      maxTimeInclusive: nowInSeconds(),
    });

    debugPrint('Edge market snapshots', snapshots);
    assertDefined(snapshots, 'edgeMarketSnapshots');
    assertRecord(snapshots, 'edgeMarketSnapshots');
    for (const [chainId, chainSnapshots] of Object.entries(snapshots)) {
      assertArray(chainSnapshots, `edgeMarketSnapshots[${chainId}]`);
      assertArrayElements(
        chainSnapshots,
        assertMarketSnapshotShape,
        `edgeMarketSnapshots[${chainId}]`,
      );
    }
  });

  void test('getLatestMarketPrices returns prices for requested products', async () => {
    const prices = await nadoClient.market.getLatestMarketPrices({
      productIds: [TEST_PRODUCT_IDS.SPOT_ETH, TEST_PRODUCT_IDS.PERP_ETH],
    });

    debugPrint('Latest market prices', prices);
    assertDefined(prices, 'latestMarketPrices');
    assertNonEmptyArray(prices.marketPrices, 'latestMarketPrices.marketPrices');
    assert.equal(
      prices.marketPrices.length,
      2,
      'should return prices for all 2 requested products',
    );
    assertArrayElements(
      prices.marketPrices,
      assertEngineMarketPriceShape,
      'latestMarketPrices.marketPrices',
    );
  });

  void test('getMarketLiquidity returns order book depth', async () => {
    const liquidity = await nadoClient.market.getMarketLiquidity({
      productId: TEST_PRODUCT_IDS.PERP_ETH,
      depth: 5,
    });

    debugPrint('Market liquidity', liquidity);
    assertDefined(liquidity, 'marketLiquidity');
    assertArray(liquidity.bids, 'marketLiquidity.bids');
    assertArray(liquidity.asks, 'marketLiquidity.asks');
    for (const side of ['bids', 'asks'] as const) {
      assertArrayElements(
        liquidity[side],
        (tick, label) => {
          assertBigDecimalFinite(tick.price, `${label}.price`);
          assertBigDecimalFinite(tick.liquidity, `${label}.liquidity`);
        },
        `marketLiquidity.${side}`,
      );
    }
  });

  void test('getSubaccountSummary returns subaccount state', async () => {
    const summary = await nadoClient.subaccount.getSubaccountSummary({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Subaccount state', summary);
    assertDefined(summary, 'subaccountSummary');
    assertSubaccountSummaryShape(summary, 'subaccountSummary');
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
    assertRecord(feeRates.orders, 'feeRates.orders');
    for (const [productId, rates] of Object.entries(feeRates.orders)) {
      assertBigDecimalFinite(
        rates.maker,
        `feeRates.orders[${productId}].maker`,
      );
      assertBigDecimalFinite(
        rates.taker,
        `feeRates.orders[${productId}].taker`,
      );
    }
    assertBigDecimalFinite(
      feeRates.takerSequencerFee,
      'feeRates.takerSequencerFee',
    );
    assertNumber(feeRates.feeTier, 'feeRates.feeTier');
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
    assertLinkedSignerShape(linkedSigner, 'linkedSigner');
  });

  void describe('open order queries', () => {
    before(async () => {
      const marketPrice = await nadoClient.market.getLatestMarketPrice({
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });
      const farPrice = marketPrice.ask.multipliedBy(1.15).decimalPlaces(0);

      await nadoClient.market.placeOrder({
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        order: {
          subaccountName: TEST_SUBACCOUNT_NAME,
          expiration: getExpiration(),
          price: farPrice,
          amount: addDecimals(-0.01),
          appendix: packOrderAppendix({ orderExecutionType: 'post_only' }),
        },
        spotLeverage: false,
      });
    });

    after(async () => {
      await cleanupTestState(
        {
          engine: nadoClient.context.engineClient,
          trigger: nadoClient.context.triggerClient,
        },
        {
          subaccountOwner: walletClientAddress,
          endpointAddr,
          chainId,
        },
      );
    });

    void test('getOpenSubaccountOrders returns orders for a product', async () => {
      const orders = await nadoClient.market.getOpenSubaccountOrders({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      debugPrint('Open subaccount orders', orders);
      assertDefined(orders, 'openOrders');
      assertNumber(orders.productId, 'openOrders.productId');
      assertArray(orders.orders, 'openOrders.orders');
      assertArrayElements(
        orders.orders,
        assertEngineOrderShape,
        'openOrders.orders',
      );
    });

    void test('getOpenSubaccountMultiProductOrders returns orders across products', async () => {
      const orders =
        await nadoClient.market.getOpenSubaccountMultiProductOrders({
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
      assertArrayElements(
        orders.productOrders,
        (po, label) => {
          assertNumber(po.productId, `${label}.productId`);
          assertArray(po.orders, `${label}.orders`);
        },
        'multiProductOrders.productOrders',
      );

      const btcOrders = orders.productOrders.find(
        (po) => po.productId === TEST_PRODUCT_IDS.SPOT_BTC,
      );
      assertDefined(btcOrders, 'multiProductOrders SPOT_BTC entry');
      assertArrayElements(
        btcOrders.orders,
        assertEngineOrderShape,
        'multiProductOrders SPOT_BTC orders',
      );
    });
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
    assertArrayElements(
      result.healthGroups,
      (group, label) => {
        assertNumber(group.spotProductId, `${label}.spotProductId`);
        assertNumber(group.perpProductId, `${label}.perpProductId`);
      },
      'healthGroupsResult.healthGroups',
    );
  });

  void test('getLatestMarketPrice returns bid and ask', async () => {
    const result = await nadoClient.market.getLatestMarketPrice({
      productId: TEST_PRODUCT_IDS.SPOT_BTC,
    });

    debugPrint('Latest market price', result);
    assertDefined(result, 'latestMarketPrice');
    assertEngineMarketPriceShape(result, 'latestMarketPrice');
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
    assertArrayElements(candlesticks, assertCandlestickShape, 'candlesticks');
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
    assertBigDecimalNonNegative(result, 'maxOrderSize');
  });

  void test('getFundingRate returns a valid funding rate', async () => {
    const result = await nadoClient.market.getFundingRate({
      productId: TEST_PRODUCT_IDS.PERP_BTC,
    });

    debugPrint('Funding rate', result);
    assertDefined(result, 'fundingRate');
    assertFundingRateShape(result, 'fundingRate');
  });

  void test('getMultiProductFundingRates returns rates for multiple products', async () => {
    const result = await nadoClient.market.getMultiProductFundingRates({
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
    });

    debugPrint('Multi-product funding rates', result);
    assertDefined(result, 'fundingRates');
    assertRecord(result, 'fundingRates');
    for (const rate of Object.values(result)) {
      assertFundingRateShape(rate, 'fundingRates entry');
    }
  });

  void test('getProductSnapshots returns snapshots for a product', async () => {
    const result = await nadoClient.market.getProductSnapshots({
      productId: TEST_PRODUCT_IDS.PERP_BTC,
      limit: 2,
      maxTimestampInclusive: nowInSeconds(),
    });

    debugPrint('Product snapshots', result);
    assertArray(result, 'productSnapshots');
    assertArrayElements(result, assertProductSnapshotShape, 'productSnapshots');
  });

  void test('getMarketSnapshots returns snapshots for requested products', async () => {
    const result = await nadoClient.market.getMarketSnapshots({
      granularity: TimeInSeconds.HOUR,
      limit: 1,
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.SPOT_ETH],
    });

    debugPrint('Market snapshots', result);
    assertArray(result, 'marketSnapshots');
    assertArrayElements(result, assertMarketSnapshotShape, 'marketSnapshots');
  });

  void test('getMultiProductSnapshots returns snapshots for multiple products', async () => {
    const result = await nadoClient.market.getMultiProductSnapshots({
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.SPOT_ETH],
    });

    debugPrint('Multi-product snapshots', result);
    assertDefined(result, 'multiProductSnapshots');
    assertRecord(result, 'multiProductSnapshots');
    for (const [timestamp, productMap] of Object.entries(result)) {
      assertDefined(productMap, `multiProductSnapshots[${timestamp}]`);
      for (const snapshot of Object.values(productMap)) {
        assertProductSnapshotShape(
          snapshot,
          `multiProductSnapshots[${timestamp}] entry`,
        );
      }
    }
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
    assertArrayElements(result, assertIndexerOrderShape, 'historicalOrders');
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
    assertBigDecimalFinite(result.indexPrice, 'perpPrices.indexPrice');
    assertBigDecimalFinite(result.markPrice, 'perpPrices.markPrice');
    assertBigDecimalFinite(result.updateTime, 'perpPrices.updateTime');
    assertNumber(result.productId, 'perpPrices.productId');
  });

  void test('getMultiProductPerpPrices returns prices for multiple products', async () => {
    const result = await nadoClient.perp.getMultiProductPerpPrices({
      productIds: [TEST_PRODUCT_IDS.PERP_BTC, TEST_PRODUCT_IDS.PERP_ETH],
    });

    debugPrint('Multi-product perp prices', result);
    assertDefined(result, 'perpPrices');
    assertRecord(result, 'perpPrices');
    for (const prices of Object.values(result)) {
      assertBigDecimalFinite(prices.indexPrice, 'perpPrices entry.indexPrice');
      assertBigDecimalFinite(prices.markPrice, 'perpPrices entry.markPrice');
      assertNumber(prices.productId, 'perpPrices entry.productId');
    }
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
    assertBigDecimalNonNegative(result, 'maxWithdrawable');
  });

  void test('getMaxMintNlpAmount returns a finite amount', async () => {
    const result = await nadoClient.spot.getMaxMintNlpAmount({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      spotLeverage: true,
    });

    debugPrint('Max mint NLP amount', result);
    assertBigDecimalNonNegative(result, 'maxMintNlpAmount');
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
    assertSubaccountSummaryShape(result, 'estimatedSummary');
  });
});
