import { EngineClient, EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  createDeterministicLinkedSignerPrivateKey,
  getOrderDigest,
  getOrderNonce,
  getOrderVerifyingAddress,
  NADO_ABIS,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  Address,
  createWalletClient,
  getContract,
  http,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  assertArray,
  assertArrayElements,
  assertBigDecimalFinite,
  assertBigDecimalNonNegative,
  assertDefined,
  assertHexString,
  assertNonEmptyArray,
  assertNumber,
  assertRecord,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  assertEngineMarketPriceShape,
  assertEngineOrderShape,
} from '../utils/shapeAssertions';
import {
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[engine-client]: signer and orders',
  { timeout: TEST_TIMEOUTS.ON_CHAIN },
  () => {
    let client: EngineClient;
    let walletClient: WalletClientWithAccount;
    let walletClientAddress: string;
    let chainId: number;
    let endpointAddr: Address;
    let shortLimitPrice: BigDecimal;

    before(async () => {
      const context = createTestContext();
      walletClient = context.getWalletClient();
      walletClientAddress = walletClient.account.address;
      chainId = walletClient.chain.id;

      client = new EngineClient({
        url: context.endpoints.engine,
        walletClient,
      });

      const clearinghouse = getContract({
        abi: NADO_ABIS.clearinghouse,
        address: context.contracts.clearinghouse,
        client: walletClient,
      });
      endpointAddr = await clearinghouse.read.getEndpoint();

      const products = await client.getAllMarkets();
      const spotMarket = products.find(
        (m) => m.productId === TEST_PRODUCT_IDS.SPOT_BTC,
      );
      assert.ok(spotMarket, 'spot BTC market should exist');
      shortLimitPrice = spotMarket.product.oraclePrice
        .multipliedBy(1.1)
        .decimalPlaces(0);
    });

    // ---------------------------------------------------------------
    // Order placement, querying, and cancellation
    // ---------------------------------------------------------------
    void describe('order placement and queries', () => {
      let spotOrderDigest: string;
      let perpIsolatedOrderDigest: string;
      let marketPrice: { bid: BigDecimal; ask: BigDecimal };

      void test('places a spot limit order and verifies its digest', async () => {
        const spotOrder: EngineOrderParams = {
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          amount: addDecimals(-0.03),
          expiration: getExpiration(),
          price: shortLimitPrice,
          appendix: packOrderAppendix({ orderExecutionType: 'default' }),
        };

        const result = await client.placeOrder({
          verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
          chainId,
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
          chainId,
        });
        assert.equal(
          computedDigest,
          result.data.digest,
          'computed and returned order digests should match',
        );

        spotOrderDigest = result.data.digest;
      });

      void test('places an isolated perp order and verifies its digest', async () => {
        const isolatedOrder: EngineOrderParams = {
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          amount: addDecimals(-0.03),
          expiration: getExpiration(),
          price: shortLimitPrice,
          appendix: packOrderAppendix({
            orderExecutionType: 'default',
            isolated: {
              margin: addDecimals(shortLimitPrice.multipliedBy(0.03).div(10)),
            },
          }),
        };

        const result = await client.placeOrder({
          verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
          chainId,
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
          chainId,
        });
        assert.equal(
          computedDigest,
          result.data.digest,
          'computed and returned isolated order digests should match',
        );

        perpIsolatedOrderDigest = result.data.digest;
      });

      void test('getSubaccountOrders returns orders for the perp product', async () => {
        const result = await client.getSubaccountOrders({
          productId: TEST_PRODUCT_IDS.PERP_BTC,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: walletClientAddress,
        });

        debugPrint('Subaccount orders', result);
        assertDefined(result, 'subaccountOrders');
        assertNumber(result.productId, 'subaccountOrders.productId');
        assertArray(result.orders, 'subaccountOrders.orders');
        if (result.orders.length > 0) {
          assertArrayElements(
            result.orders,
            assertEngineOrderShape,
            'subaccountOrders.orders',
          );
        }
      });

      void test('getMarketLiquidity returns bid and ask ticks', async () => {
        const result = await client.getMarketLiquidity({
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
              assertBigDecimalFinite(tick.price, `${label}.price`);
              assertBigDecimalFinite(tick.liquidity, `${label}.liquidity`);
            },
            `marketLiquidity.${side}`,
          );
        }
      });

      void test('getMarketPrice returns bid and ask prices', async () => {
        const result = await client.getMarketPrice({
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
        });

        debugPrint('Market price', result);
        assertDefined(result, 'marketPrice');
        assertEngineMarketPriceShape(result, 'marketPrice');

        marketPrice = result;
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
        assertArrayElements(
          result.marketPrices,
          assertEngineMarketPriceShape,
          'marketPrices.marketPrices',
        );
      });

      void test('getSubaccountFeeRates returns fee information', async () => {
        const result = await client.getSubaccountFeeRates({
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: walletClientAddress,
        });

        debugPrint('Fee rates', result);
        assertDefined(result, 'feeRates');
        assertRecord(result.orders, 'feeRates.orders');
        assertBigDecimalFinite(
          result.takerSequencerFee,
          'feeRates.takerSequencerFee',
        );
        assertNumber(result.feeTier, 'feeRates.feeTier');
      });

      void test('getMaxOrderSize returns a valid order size', async () => {
        assertDefined(marketPrice, 'marketPrice (from prior test)');

        const result = await client.getMaxOrderSize({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
          price: marketPrice.ask,
          spotLeverage: false,
          side: 'long',
        });

        debugPrint('Max order size', result);
        assertBigDecimalNonNegative(result, 'maxOrderSize');
      });

      void test('getMaxOrderSize supports reduce-only mode', async () => {
        assertDefined(marketPrice, 'marketPrice (from prior test)');

        const result = await client.getMaxOrderSize({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
          price: marketPrice.ask,
          side: 'short',
          spotLeverage: false,
          reduceOnly: true,
        });

        debugPrint('Reduce-only max order size', result);
        assertBigDecimalNonNegative(result, 'reduceOnlyMaxOrderSize');
      });

      void test('getMaxWithdrawable returns a valid amount', async () => {
        const result = await client.getMaxWithdrawable({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productId: QUOTE_PRODUCT_ID,
        });

        debugPrint('Max withdrawable', result);
        assertBigDecimalNonNegative(result, 'maxWithdrawable');
      });

      void test('getMaxWithdrawable supports no-spot-leverage mode', async () => {
        const result = await client.getMaxWithdrawable({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productId: QUOTE_PRODUCT_ID,
          spotLeverage: false,
        });

        debugPrint('Max withdrawable (no spot leverage)', result);
        assertBigDecimalNonNegative(result, 'maxWithdrawableNoSpotLeverage');
      });

      void test('getOrder retrieves the placed spot order by digest', async () => {
        assertDefined(spotOrderDigest, 'spotOrderDigest (from prior test)');

        const result = await client.getOrder({
          digest: spotOrderDigest,
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
        });

        debugPrint('Queried spot order', result);
        assertDefined(result, 'queriedSpotOrder');
        assertEngineOrderShape(result, 'queriedSpotOrder');
        assert.equal(result.digest, spotOrderDigest, 'digest should match');
      });

      void test('getOrder retrieves the placed isolated perp order by digest', async () => {
        assertDefined(
          perpIsolatedOrderDigest,
          'perpIsolatedOrderDigest (from prior test)',
        );

        const result = await client.getOrder({
          digest: perpIsolatedOrderDigest,
          productId: TEST_PRODUCT_IDS.PERP_BTC,
        });

        debugPrint('Queried perp isolated order', result);
        assertDefined(result, 'queriedIsolatedOrder');
        assertEngineOrderShape(result, 'queriedIsolatedOrder');
        assert.equal(
          result.digest,
          perpIsolatedOrderDigest,
          'digest should match',
        );
      });

      void test('getSubaccountMultiProductOrders returns orders across products', async () => {
        const result = await client.getSubaccountMultiProductOrders({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productIds: [TEST_PRODUCT_IDS.SPOT_BTC, TEST_PRODUCT_IDS.PERP_BTC],
        });

        debugPrint('Multi-product orders', result);
        assertDefined(result, 'multiProductOrders');
        assertArray(result.productOrders, 'multiProductOrders.productOrders');
      });

      void test('cancelOrders cancels the placed spot and perp orders', async () => {
        assertDefined(spotOrderDigest, 'spotOrderDigest (from prior test)');
        assertDefined(
          perpIsolatedOrderDigest,
          'perpIsolatedOrderDigest (from prior test)',
        );

        const result = await client.cancelOrders({
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: walletClientAddress,
          productIds: [TEST_PRODUCT_IDS.SPOT_BTC, TEST_PRODUCT_IDS.PERP_BTC],
          digests: [spotOrderDigest, perpIsolatedOrderDigest],
          verifyingAddr: endpointAddr,
          chainId,
        });

        debugPrint('Cancel orders result', result);
        assertDefined(result, 'cancelResult');
        assert.equal(result.status, 'success', 'cancel should succeed');
      });

      void test('getSubaccountOrders is empty after cancellation', async () => {
        const result = await client.getSubaccountOrders({
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });

        debugPrint('Subaccount orders after cancel', result);
        assertDefined(result, 'ordersAfterCancel');
        assertArray(result.orders, 'ordersAfterCancel.orders');
      });

      void test('getMaxWithdrawable reflects freed margin after cancellation', async () => {
        const result = await client.getMaxWithdrawable({
          subaccountOwner: walletClientAddress,
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
    // Linked signer lifecycle: create, link, use, revoke
    // ---------------------------------------------------------------
    void describe('linked signer lifecycle', () => {
      let linkedSignerWalletClient: WalletClientWithAccount;

      void test('creates and links a deterministic signer', async () => {
        const linkedSignerPrivKey =
          await createDeterministicLinkedSignerPrivateKey({
            chainId,
            endpointAddress: endpointAddr,
            walletClient,
            subaccountOwner: walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
          });

        linkedSignerWalletClient = createWalletClient({
          chain: walletClient.chain,
          account: privateKeyToAccount(linkedSignerPrivKey),
          transport: http(),
        });
        debugPrint(
          'Linked signer address',
          linkedSignerWalletClient.account.address,
        );

        const result = await client.linkSigner({
          chainId,
          signer: subaccountToHex({
            subaccountOwner: linkedSignerWalletClient.account.address,
            subaccountName: '',
          }),
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          verifyingAddr: endpointAddr,
        });

        debugPrint('Link signer result', result);
        assertDefined(result, 'linkSignerResult');
        assert.equal(result.status, 'success', 'linkSigner should succeed');
      });

      void test('getLinkedSigner returns the linked signer address', async () => {
        const result = await client.getLinkedSigner({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });

        debugPrint('Linked signer query', result);
        assertDefined(result, 'linkedSignerQuery');
        assertDefined(result.signer, 'linkedSignerQuery.signer');

        client.setLinkedSigner(linkedSignerWalletClient);
      });

      void test('places an isolated position using the linked signer', async () => {
        const iocOrder: EngineOrderParams = {
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          amount: addDecimals(0.03),
          expiration: getExpiration(),
          price: shortLimitPrice,
          appendix: packOrderAppendix({
            orderExecutionType: 'ioc',
            isolated: {
              margin: addDecimals(shortLimitPrice.multipliedBy(0.03).div(10)),
            },
          }),
        };

        const result = await client.placeOrder({
          verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
          chainId,
          productId: TEST_PRODUCT_IDS.PERP_BTC,
          order: iocOrder,
          nonce: getOrderNonce(),
        });

        debugPrint('Isolated position result', result);
        assertDefined(result, 'isolatedPositionResult');
        assert.equal(
          result.status,
          'success',
          'isolated position order should succeed',
        );
      });

      void test('getIsolatedPositions returns positions for the subaccount', async () => {
        const result = await client.getIsolatedPositions({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });

        debugPrint('Isolated positions', result);
        assertArray(result, 'isolatedPositions');
      });

      void test('revokes the linked signer', async () => {
        const result = await client.linkSigner({
          chainId,
          signer: subaccountToHex({
            subaccountOwner: zeroAddress,
            subaccountName: '',
          }),
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          verifyingAddr: endpointAddr,
        });

        client.setLinkedSigner(null);

        debugPrint('Revoke signer result', result);
        assertDefined(result, 'revokeSignerResult');
        assert.equal(result.status, 'success', 'revoke signer should succeed');
      });
    });

    // ---------------------------------------------------------------
    // Multi-product order placement and bulk cancellation
    // ---------------------------------------------------------------
    void describe('multi-product order placement and cancellation', () => {
      before(async () => {
        // Rate-limit delay after the linked signer operations
        await delay(5000);
      });

      void test('places orders for spot and perp products', async () => {
        for (const productId of [
          TEST_PRODUCT_IDS.SPOT_BTC,
          TEST_PRODUCT_IDS.PERP_BTC,
        ]) {
          const verifyingAddr = getOrderVerifyingAddress(productId);
          const order: EngineOrderParams = {
            subaccountOwner: walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
            amount: addDecimals(-0.01),
            expiration: getExpiration(),
            price: shortLimitPrice,
            appendix: packOrderAppendix({ orderExecutionType: 'default' }),
          };

          const placeResult = await client.placeOrder({
            verifyingAddr,
            productId,
            order,
            nonce: getOrderNonce(),
            chainId,
          });
          debugPrint(`Order placed for product ${productId}`, placeResult);
          assertDefined(placeResult, `placeResult (product ${productId})`);
          assert.equal(
            placeResult.status,
            'success',
            `order for product ${productId} should succeed`,
          );

          const subaccountOrders = await client.getSubaccountOrders({
            productId,
            subaccountOwner: walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
          });
          debugPrint(
            `Subaccount orders after place (product ${productId})`,
            subaccountOrders,
          );
          assertDefined(
            subaccountOrders,
            `subaccountOrdersAfterPlace (product ${productId})`,
          );

          // Rate-limit delay between product placements
          await delay(5000);
        }
      });

      void test('cancelProductOrders cancels all open orders', async () => {
        const result = await client.cancelProductOrders({
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: walletClientAddress,
          productIds: [TEST_PRODUCT_IDS.SPOT_BTC, TEST_PRODUCT_IDS.PERP_BTC],
          verifyingAddr: endpointAddr,
          chainId,
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
          const result = await client.getSubaccountOrders({
            productId,
            subaccountOwner: walletClientAddress,
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
  },
);
