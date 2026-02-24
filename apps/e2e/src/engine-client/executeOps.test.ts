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
import { TriggerClient } from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
  Address,
  createWalletClient,
  getContract,
  http,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { assertDefined, assertHexString } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import { TEST_PRODUCT_IDS, TEST_SUBACCOUNT_NAME } from '../utils/testConstants';

void describe('[engine-client]: execute operations', () => {
  let client: EngineClient;
  let triggerClient: TriggerClient;
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

    triggerClient = new TriggerClient({
      url: context.endpoints.trigger,
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

  after(async () => {
    if (!client) return;
    await cleanupTestState(
      {
        engine: client,
        trigger: triggerClient,
      },
      {
        subaccountOwner: walletClientAddress,
        verifyingAddr: endpointAddr,
        chainId,
      },
    );
  });

  // ---------------------------------------------------------------
  // withdrawCollateral — fast engine withdrawal
  // ---------------------------------------------------------------
  void describe('withdrawCollateral', () => {
    void test('withdraws a small amount of quote via the engine', async () => {
      const result = await client.withdrawCollateral({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: QUOTE_PRODUCT_ID,
        amount: addDecimals(1, 6),
        verifyingAddr: endpointAddr,
        chainId,
      });

      debugPrint('Withdraw collateral result', result);
      assertDefined(result, 'withdrawResult');
      assert.equal(
        result.status,
        'success',
        'withdrawCollateral should succeed',
      );
    });
  });

  // ---------------------------------------------------------------
  // transferQuote — quote transfer between subaccounts
  // ---------------------------------------------------------------
  void describe('transferQuote', () => {
    const TRANSFER_AMOUNT = addDecimals(6);
    const TRANSFER_FEE = addDecimals(1);
    // Engine arithmetic can introduce sub-wei rounding drift
    const ROUNDING_TOLERANCE = new BigDecimal(100);

    async function getQuoteBalance(
      subaccountName: string,
    ): Promise<BigDecimal> {
      const summary = await client.getSubaccountSummary({
        subaccountOwner: walletClientAddress,
        subaccountName,
      });
      const quote = summary.balances.find(
        (b) => b.productId === QUOTE_PRODUCT_ID,
      );
      assertDefined(quote, `quoteBalance for ${subaccountName}`);
      return quote.amount;
    }

    void test('transfers quote to another subaccount', async () => {
      const balanceBefore = await getQuoteBalance(TEST_SUBACCOUNT_NAME);
      debugPrint('Default balance before transfer', balanceBefore);

      const result = await client.transferQuote({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        recipientSubaccountName: 'default2',
        amount: TRANSFER_AMOUNT,
        verifyingAddr: endpointAddr,
        chainId,
      });

      debugPrint('Transfer quote result', result);
      assertDefined(result, 'transferResult');
      assert.equal(result.status, 'success', 'transferQuote should succeed');

      const balanceAfter = await getQuoteBalance(TEST_SUBACCOUNT_NAME);
      debugPrint('Default balance after transfer', balanceAfter);

      const delta = balanceBefore.minus(balanceAfter);
      const expectedDelta = new BigDecimal(TRANSFER_AMOUNT).plus(
        new BigDecimal(TRANSFER_FEE),
      );
      assert.ok(
        delta.minus(expectedDelta).abs().lte(ROUNDING_TOLERANCE),
        `sender balance should decrease by ~${expectedDelta.toString()} (transfer + fee), got ${delta.toString()}`,
      );
    });

    void test('transfers quote back to restore balance', async () => {
      const balanceBefore = await getQuoteBalance(TEST_SUBACCOUNT_NAME);
      debugPrint('Default balance before transfer back', balanceBefore);

      const result = await client.transferQuote({
        subaccountOwner: walletClientAddress,
        subaccountName: 'default2',
        recipientSubaccountName: TEST_SUBACCOUNT_NAME,
        amount: TRANSFER_AMOUNT,
        verifyingAddr: endpointAddr,
        chainId,
      });

      debugPrint('Transfer quote back result', result);
      assertDefined(result, 'transferBackResult');
      assert.equal(
        result.status,
        'success',
        'transferQuote back should succeed',
      );

      const balanceAfter = await getQuoteBalance(TEST_SUBACCOUNT_NAME);
      debugPrint('Default balance after transfer back', balanceAfter);

      const delta = balanceAfter.minus(balanceBefore);
      const expectedDelta = new BigDecimal(TRANSFER_AMOUNT);
      assert.ok(
        delta.minus(expectedDelta).abs().lte(ROUNDING_TOLERANCE),
        `receiver balance should increase by ~${expectedDelta.toString()}, got ${delta.toString()}`,
      );
    });
  });

  // ---------------------------------------------------------------
  // cancelAndPlace — atomic cancel-and-replace
  // ---------------------------------------------------------------
  void describe('cancelAndPlace', () => {
    let orderDigest: string;

    void test('places a limit order to be replaced', async () => {
      const order: EngineOrderParams = {
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(-0.01),
        expiration: getExpiration(),
        price: shortLimitPrice,
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };

      const result = await client.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        order,
        nonce: getOrderNonce(),
      });

      debugPrint('Initial order for cancel-and-place', result);
      assertDefined(result, 'initialOrder');
      assert.equal(result.status, 'success', 'initial order should succeed');
      assertHexString(result.data.digest, 'initialOrder.data.digest');

      orderDigest = getOrderDigest({
        order: result.orderParams,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        chainId,
      });
    });

    void test('cancelAndPlace replaces the order', async () => {
      assertDefined(orderDigest, 'orderDigest (from prior test)');

      const result = await client.cancelAndPlace({
        cancelOrders: {
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
          digests: [orderDigest],
          verifyingAddr: endpointAddr,
          chainId,
        },
        placeOrder: {
          verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
          chainId,
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
          order: {
            subaccountOwner: walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
            amount: addDecimals(-0.01),
            expiration: getExpiration(),
            price: shortLimitPrice.multipliedBy(1.05).decimalPlaces(0),
            appendix: packOrderAppendix({ orderExecutionType: 'default' }),
          },
          nonce: getOrderNonce(),
        },
      });

      debugPrint('Cancel and place result', result);
      assertDefined(result, 'cancelAndPlaceResult');
      assert.equal(result.status, 'success', 'cancelAndPlace should succeed');
      assertHexString(result.data.digest, 'cancelAndPlaceResult.data.digest');
    });

    void test('cleans up remaining order', async () => {
      await client.cancelProductOrders({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
        verifyingAddr: endpointAddr,
        chainId,
      });
    });
  });

  // ---------------------------------------------------------------
  // setLinkedSigner — direct client method test
  // ---------------------------------------------------------------
  void describe('setLinkedSigner', () => {
    let linkedSignerWalletClient: WalletClientWithAccount;

    void test('setLinkedSigner updates the signing wallet used by client', async () => {
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

      // Link the signer on-chain first
      const linkResult = await client.linkSigner({
        chainId,
        signer: subaccountToHex({
          subaccountOwner: linkedSignerWalletClient.account.address,
          subaccountName: '',
        }),
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        verifyingAddr: endpointAddr,
      });

      debugPrint('Link signer result', linkResult);
      assert.equal(linkResult.status, 'success', 'linkSigner should succeed');

      // Set the linked signer on the client
      client.setLinkedSigner(linkedSignerWalletClient);

      // Verify the linked signer is used by placing an order
      const order: EngineOrderParams = {
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(-0.01),
        expiration: getExpiration(),
        price: shortLimitPrice,
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };

      const placeResult = await client.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        order,
        nonce: getOrderNonce(),
      });

      debugPrint('Order with linked signer', placeResult);
      assertDefined(placeResult, 'placeResult');
      assert.equal(
        placeResult.status,
        'success',
        'order with linked signer should succeed',
      );
      assertHexString(placeResult.data.digest, 'placeResult.data.digest');

      // Clean up: cancel order
      await client.cancelProductOrders({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
        verifyingAddr: endpointAddr,
        chainId,
      });
    });

    void test('setLinkedSigner(null) reverts to chain signer', async () => {
      client.setLinkedSigner(null);

      // Revoke the linked signer on-chain
      const revokeResult = await client.linkSigner({
        chainId,
        signer: subaccountToHex({
          subaccountOwner: zeroAddress,
          subaccountName: '',
        }),
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        verifyingAddr: endpointAddr,
      });

      debugPrint('Revoke signer result', revokeResult);
      assert.equal(
        revokeResult.status,
        'success',
        'revoke signer should succeed',
      );

      // Verify the chain signer works again by querying
      const summary = await client.getSubaccountSummary({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('Subaccount summary after reverting signer', summary);
      assertDefined(summary, 'summaryAfterRevert');
    });
  });
});
