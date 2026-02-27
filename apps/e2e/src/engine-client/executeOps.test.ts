import { EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  createDeterministicLinkedSignerPrivateKey,
  getOrderDigest,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { createWalletClient, http, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { assertDefined, assertHexString } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import {
  getCachedOraclePrice,
  getSharedClients,
  TestClients,
} from '../utils/sharedTestSetup';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
} from '../utils/testConstants';

void describe('[engine-client]: execute operations', () => {
  let tc: TestClients;
  let shortLimitPrice: BigDecimal;

  before(async () => {
    await delay(TEST_DELAYS.BETWEEN_SUITES);

    tc = getSharedClients();

    const oraclePrice = await getCachedOraclePrice(TEST_PRODUCT_IDS.SPOT_BTC);
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
      { hasEngineOrders: true },
    );
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.RATE_LIMIT);
  });

  // ---------------------------------------------------------------
  // withdrawCollateral — fast engine withdrawal
  // ---------------------------------------------------------------
  void describe('withdrawCollateral', () => {
    void test('withdraws a small amount of quote via the engine', async () => {
      const result = await tc.engine.withdrawCollateral({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: QUOTE_PRODUCT_ID,
        amount: addDecimals(1, 6),
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
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
    // Engine arithmetic plus interest accrual between balance snapshots can drift
    const ROUNDING_TOLERANCE = new BigDecimal(1e12);

    async function getQuoteBalance(
      subaccountName: string,
    ): Promise<BigDecimal> {
      const summary = await tc.engine.getSubaccountSummary({
        subaccountOwner: tc.walletClientAddress,
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

      const result = await tc.engine.transferQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        recipientSubaccountName: 'default2',
        amount: TRANSFER_AMOUNT,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
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

      const result = await tc.engine.transferQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: 'default2',
        recipientSubaccountName: TEST_SUBACCOUNT_NAME,
        amount: TRANSFER_AMOUNT,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
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
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(-0.01),
        expiration: getExpiration(),
        price: shortLimitPrice,
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };

      const result = await tc.engine.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId: tc.chainId,
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
        chainId: tc.chainId,
      });
    });

    void test('cancelAndPlace replaces the order', async () => {
      assertDefined(orderDigest, 'orderDigest (from prior test)');

      const result = await tc.engine.cancelAndPlace({
        cancelOrders: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
          digests: [orderDigest],
          verifyingAddr: tc.endpointAddr,
          chainId: tc.chainId,
        },
        placeOrder: {
          verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
          chainId: tc.chainId,
          productId: TEST_PRODUCT_IDS.SPOT_BTC,
          order: {
            subaccountOwner: tc.walletClientAddress,
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
      await tc.engine.cancelProductOrders({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
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
          chainId: tc.chainId,
          endpointAddress: tc.endpointAddr,
          walletClient: tc.walletClient,
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });

      linkedSignerWalletClient = createWalletClient({
        chain: tc.walletClient.chain,
        account: privateKeyToAccount(linkedSignerPrivKey),
        transport: http(),
      });

      // Link the signer on-chain first
      const linkResult = await tc.engine.linkSigner({
        chainId: tc.chainId,
        signer: subaccountToHex({
          subaccountOwner: linkedSignerWalletClient.account.address,
          subaccountName: '',
        }),
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        verifyingAddr: tc.endpointAddr,
      });

      debugPrint('Link signer result', linkResult);
      assert.equal(linkResult.status, 'success', 'linkSigner should succeed');

      // Set the linked signer on the client
      tc.engine.setLinkedSigner(linkedSignerWalletClient);

      // Verify the linked signer is used by placing an order
      const order: EngineOrderParams = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(-0.01),
        expiration: getExpiration(),
        price: shortLimitPrice,
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };

      const placeResult = await tc.engine.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId: tc.chainId,
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
      await tc.engine.cancelProductOrders({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });
    });

    void test('setLinkedSigner(null) reverts to chain signer', async () => {
      tc.engine.setLinkedSigner(null);

      // Revoke the linked signer on-chain
      const revokeResult = await tc.engine.linkSigner({
        chainId: tc.chainId,
        signer: subaccountToHex({
          subaccountOwner: zeroAddress,
          subaccountName: '',
        }),
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        verifyingAddr: tc.endpointAddr,
      });

      debugPrint('Revoke signer result', revokeResult);
      assert.equal(
        revokeResult.status,
        'success',
        'revoke signer should succeed',
      );
    });
  });
});
