import { EngineClient } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigDecimalFinite,
  assertDefined,
  assertEnumMember,
  assertHexString,
  assertNonEmptyArray,
  assertNumber,
  assertRecord,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { getExpiration } from '../utils/getExpiration';
import { attachRetryInterceptor } from '../utils/retryInterceptor';
import { createTestContext } from '../utils/runWithContext';
import {
  assertEngineMarketPriceShape,
  assertEngineOrderShape,
  assertMarketWithProductShape,
  assertSubaccountSummaryShape,
} from '../utils/shapeAssertions';
import {
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

const ENGINE_STATUS_VALUES = [
  'started',
  'active',
  'stopping',
  'syncing',
  'live_syncing',
  'failed',
] as const;

void describe(
  '[engine-client]: queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: EngineClient;
    let walletClientAddress: string;
    let chainId: number;

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      walletClientAddress = walletClient.account.address;
      chainId = walletClient.chain.id;
      client = new EngineClient({
        url: context.endpoints.engine,
        walletClient,
      });

      attachRetryInterceptor(client.axiosInstance);
    });

    void test('getSymbols returns market symbols', async () => {
      const result = await client.getSymbols({});

      debugPrint('Symbols', result);
      assertDefined(result, 'symbolsResult');
      assertDefined(result.symbols, 'symbolsResult.symbols');
      assertRecord(result.symbols, 'symbolsResult.symbols');
      for (const [symbolName, symbol] of Object.entries(result.symbols)) {
        assertString(symbolName, 'symbol key');
        assertNumber(symbol.productId, `symbols[${symbolName}].productId`);
        assertString(symbol.symbol, `symbols[${symbolName}].symbol`);
        assertBigDecimalFinite(
          symbol.priceIncrement,
          `symbols[${symbolName}].priceIncrement`,
        );
        assertBigDecimalFinite(
          symbol.sizeIncrement,
          `symbols[${symbolName}].sizeIncrement`,
        );
        assertBigDecimalFinite(
          symbol.minSize,
          `symbols[${symbolName}].minSize`,
        );
      }
    });

    void test('getInsurance returns a finite insurance balance', async () => {
      const insurance = await client.getInsurance();

      debugPrint('Insurance', insurance);
      assertBigDecimalFinite(insurance, 'insurance');
    });

    void test('getContracts returns chain and endpoint', async () => {
      const contracts = await client.getContracts();

      debugPrint('Contracts', contracts);
      assertDefined(contracts, 'contracts');
      assertNumber(contracts.chainId, 'contracts.chainId');
      assertHexString(contracts.endpointAddr, 'contracts.endpointAddr');
    });

    void test('getStatus returns engine status', async () => {
      const status = await client.getStatus();

      debugPrint('Engine status', status);
      assertDefined(status, 'status');
      assertEnumMember(status, ENGINE_STATUS_VALUES, 'status');
    });

    void test('getOrder returns order when digest exists', async () => {
      const openOrders = await client.getSubaccountOrders({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      if (openOrders.orders.length === 0) {
        return;
      }

      const firstOrder = openOrders.orders[0];
      const order = await client.getOrder({
        digest: firstOrder.digest,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
      });

      debugPrint('Order by digest', order);
      assertDefined(order, 'order');
      assertEngineOrderShape(order, 'order');
      assert.equal(order.digest, firstOrder.digest, 'digest should match');
      assert.equal(
        order.productId,
        TEST_PRODUCT_IDS.SPOT_BTC,
        'productId should match',
      );
    });

    // FIXME: The method returns "Invalid ABI parameter.".
    void test.skip('validateSignedOrderParams validates a signed order', async () => {
      const products = await client.getAllMarkets();
      const spotBtc = products.find(
        (m) => m.productId === TEST_PRODUCT_IDS.SPOT_BTC,
      );
      assert.ok(spotBtc, 'SPOT_BTC market should exist');

      const price = spotBtc.product.oraclePrice
        .multipliedBy(1.05)
        .decimalPlaces(0);
      const order = {
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        price,
        amount: addDecimals(0.001),
        expiration: getExpiration(),
        nonce: getOrderNonce(),
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };

      const signature = await client.sign(
        'place_order',
        getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId,
        order,
      );

      const result = await client.validateSignedOrderParams({
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        signedOrder: { order, signature },
      });

      debugPrint('Validate signed order result', result);
      assertDefined(result, 'validateResult');
      assert.equal(
        result.productId,
        TEST_PRODUCT_IDS.SPOT_BTC,
        'productId should match',
      );
      assert.equal(typeof result.valid, 'boolean', 'valid should be boolean');
    });

    void test('getEdgeAllMarkets returns markets grouped by chain id', async () => {
      const edgeMarkets = await client.getEdgeAllMarkets();

      debugPrint('Edge all markets', edgeMarkets);
      assertDefined(edgeMarkets, 'edgeMarkets');
      assertRecord(edgeMarkets, 'edgeMarkets');
      for (const [chainIdKey, markets] of Object.entries(edgeMarkets)) {
        assert.ok(Number(chainIdKey) > 0, 'chain id should be positive');
        assertNonEmptyArray(markets, `edgeMarkets[${chainIdKey}]`);
        assertArrayElements(
          markets,
          assertMarketWithProductShape,
          `edgeMarkets[${chainIdKey}]`,
        );
      }
    });

    void test('getEstimatedSubaccountSummary returns pre-state when requested', async () => {
      const result = await client.getEstimatedSubaccountSummary({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        preState: true,
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

      debugPrint('Estimated subaccount summary with pre-state', result);
      assertDefined(result, 'estimatedSummaryWithPreState');
      assertSubaccountSummaryShape(result, 'estimatedSummaryWithPreState');
    });

    void test('getMarketPrices returns prices for multiple products', async () => {
      const result = await client.getMarketPrices({
        productIds: [
          TEST_PRODUCT_IDS.SPOT_BTC,
          TEST_PRODUCT_IDS.PERP_BTC,
          TEST_PRODUCT_IDS.SPOT_ETH,
        ],
      });

      debugPrint('Market prices', result);
      assertDefined(result, 'marketPrices');
      assertNonEmptyArray(result.marketPrices, 'marketPrices.marketPrices');
      assert.equal(
        result.marketPrices.length,
        3,
        'should return prices for all 3 requested products',
      );
      assertArrayElements(
        result.marketPrices,
        assertEngineMarketPriceShape,
        'marketPrices.marketPrices',
      );
    });
  },
);
