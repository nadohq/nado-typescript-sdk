import {
  ENGINE_ERROR_CODES,
  EngineOrderParams,
  EngineServerFailureError,
} from '@nadohq/engine-client';
import {
  addDecimals,
  createDeterministicLinkedSignerPrivateKey,
  getOrderDigest,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
  subaccountToHex,
  toBigNumber,
  WalletClientWithAccount,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { after, before, beforeEach, describe, test } from 'node:test';
import { createWalletClient, http, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { assertDefined, assertHexString } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe('[engine-client]: execute operations', () => {
  let tc: RunContext;
  let shortLimitPrice: BigNumber;

  before(async () => {
    await delay(TEST_DELAYS.LONG);

    tc = createTestContext();

    const markets = await tc.engine.getAllMarkets();
    const oraclePrice = markets.find(
      (m) => m.productId === TEST_PRODUCT_IDS.SPOT_BTC,
    )!.product.oraclePrice;
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
    );
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.STANDARD);
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
  // withdrawCollateralV2 — fast engine withdrawal with custom recipient
  // ---------------------------------------------------------------
  void describe('withdrawCollateralV2', () => {
    void test('withdraws a small amount of quote to the owner via the engine', async () => {
      const result = await tc.engine.withdrawCollateralV2({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: QUOTE_PRODUCT_ID,
        amount: addDecimals(1, 6),
        // Zero address sends funds to the subaccount owner.
        sendTo: zeroAddress,
        appendix: 0,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Withdraw collateral v2 result', result);
      assertDefined(result, 'withdrawV2Result');
      assert.equal(
        result.status,
        'success',
        'withdrawCollateralV2 should succeed',
      );
    });

    void test('withdraws with a maxFeeX18 bound on the dynamic fee', async () => {
      // The fee cap is the highest the dynamic fee can ever be, so it always succeeds
      const feeQuote = await tc.engine.getDynamicFeeQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        kind: 'withdrawal',
        productId: QUOTE_PRODUCT_ID,
      });

      const result = await tc.engine.withdrawCollateralV2({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productId: QUOTE_PRODUCT_ID,
        amount: addDecimals(1, 6),
        sendTo: zeroAddress,
        appendix: 0,
        maxFeeX18: feeQuote.feeCap,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Withdraw collateral v2 (max fee) result', result);
      assertDefined(result, 'withdrawV2MaxFeeResult');
      assert.equal(
        result.status,
        'success',
        'withdrawCollateralV2 with maxFeeX18 should succeed',
      );
    });

    void test('rejects a withdrawal when maxFeeX18 is below the required fee', async (context) => {
      const feeQuote = await tc.engine.getDynamicFeeQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        kind: 'withdrawal',
        productId: QUOTE_PRODUCT_ID,
      });

      await assertRejectsWithFeeTooLow(
        context,
        feeQuote.requiredFee,
        () =>
          tc.engine.withdrawCollateralV2({
            subaccountOwner: tc.walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
            productId: QUOTE_PRODUCT_ID,
            amount: addDecimals(1, 6),
            sendTo: zeroAddress,
            appendix: 0,
            // Only execute while the fee is free
            maxFeeX18: 0,
            verifyingAddr: tc.endpointAddr,
            chainId: tc.chainId,
          }),
        'withdrawCollateralV2',
      );
    });
  });

  // ---------------------------------------------------------------
  // transferQuote — quote transfer between subaccounts
  // ---------------------------------------------------------------
  void describe('transferQuote', () => {
    const TRANSFER_AMOUNT = addDecimals(6);
    const TRANSFER_BACK_AMOUNT = addDecimals(5);

    async function getQuoteBalance(subaccountName: string): Promise<BigNumber> {
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
      assert.ok(
        delta.gte(toBigNumber(TRANSFER_AMOUNT)),
        `sender balance should decrease by at least the transfer amount (${TRANSFER_AMOUNT.toString()}), got delta ${delta.toString()}`,
      );
    });

    void test('transfers quote back to restore balance', async () => {
      const balanceBefore = await getQuoteBalance(TEST_SUBACCOUNT_NAME);
      debugPrint('Default balance before transfer back', balanceBefore);

      const result = await tc.engine.transferQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: 'default2',
        recipientSubaccountName: TEST_SUBACCOUNT_NAME,
        amount: TRANSFER_BACK_AMOUNT,
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
      assert.ok(
        delta.gt(0),
        `receiver balance should increase after transfer back, got delta ${delta.toString()}`,
      );
    });
  });

  // ---------------------------------------------------------------
  // transferQuoteV2 — quote transfer charged a dynamic fee
  // ---------------------------------------------------------------
  void describe('transferQuoteV2', () => {
    const TRANSFER_AMOUNT = addDecimals(6);
    const TRANSFER_BACK_AMOUNT = addDecimals(5);

    async function getQuoteBalance(subaccountName: string): Promise<BigNumber> {
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

    void test('transfers quote to another subaccount with a bounded fee', async () => {
      // The fee cap is the highest the dynamic fee can ever be, so it always succeeds
      const feeQuote = await tc.engine.getDynamicFeeQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        kind: 'transfer_quote',
        recipientSubaccountName: 'default2',
      });
      debugPrint('Transfer fee quote', feeQuote);

      const balanceBefore = await getQuoteBalance(TEST_SUBACCOUNT_NAME);

      const result = await tc.engine.transferQuoteV2({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        recipientSubaccountName: 'default2',
        amount: TRANSFER_AMOUNT,
        maxFeeX18: feeQuote.feeCap,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Transfer quote v2 result', result);
      assertDefined(result, 'transferV2Result');
      assert.equal(
        result.status,
        'success',
        'transferQuoteV2 should succeed while the fee is within the bound',
      );

      const balanceAfter = await getQuoteBalance(TEST_SUBACCOUNT_NAME);
      const delta = balanceBefore.minus(balanceAfter);
      assert.ok(
        delta.gte(toBigNumber(TRANSFER_AMOUNT)),
        `sender balance should decrease by at least the transfer amount (${TRANSFER_AMOUNT.toString()}), got delta ${delta.toString()}`,
      );
    });

    void test('rejects a transfer when maxFeeX18 is below the required fee', async (context) => {
      const feeQuote = await tc.engine.getDynamicFeeQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        kind: 'transfer_quote',
        recipientSubaccountName: 'default2',
      });

      await assertRejectsWithFeeTooLow(
        context,
        feeQuote.requiredFee,
        () =>
          tc.engine.transferQuoteV2({
            subaccountOwner: tc.walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
            recipientSubaccountName: 'default2',
            amount: TRANSFER_BACK_AMOUNT,
            // Only execute while the fee is free
            maxFeeX18: 0,
            verifyingAddr: tc.endpointAddr,
            chainId: tc.chainId,
          }),
        'transferQuoteV2',
      );
    });

    void test('transfers quote back to restore balance', async () => {
      const feeQuote = await tc.engine.getDynamicFeeQuote({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: 'default2',
        kind: 'transfer_quote',
        recipientSubaccountName: TEST_SUBACCOUNT_NAME,
      });

      const balanceBefore = await getQuoteBalance(TEST_SUBACCOUNT_NAME);

      const result = await tc.engine.transferQuoteV2({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: 'default2',
        recipientSubaccountName: TEST_SUBACCOUNT_NAME,
        amount: TRANSFER_BACK_AMOUNT,
        maxFeeX18: feeQuote.feeCap,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Transfer quote v2 back result', result);
      assertDefined(result, 'transferV2BackResult');
      assert.equal(
        result.status,
        'success',
        'transferQuoteV2 back should succeed',
      );

      const balanceAfter = await getQuoteBalance(TEST_SUBACCOUNT_NAME);
      const delta = balanceAfter.minus(balanceBefore);
      assert.ok(
        delta.gt(0),
        `receiver balance should increase after transfer back, got delta ${delta.toString()}`,
      );
    });
  });

  // ---------------------------------------------------------------
  // cancelAndPlace — atomic cancel-and-replace
  // ---------------------------------------------------------------
  void describe('cancelAndPlace', () => {
    void test('cancelAndPlace replaces the order', async () => {
      const placeResult = await tc.engine.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId: tc.chainId,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        order: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          amount: addDecimals(-0.01),
          expiration: getExpiration(),
          price: shortLimitPrice,
          appendix: packOrderAppendix({ orderExecutionType: 'default' }),
        },
        nonce: getOrderNonce(),
      });

      assertDefined(placeResult, 'initialOrder');
      assert.equal(
        placeResult.status,
        'success',
        'initial order should succeed',
      );

      const orderDigest = getOrderDigest({
        order: placeResult.orderParams,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        chainId: tc.chainId,
      });

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

      // Wait for engine to propagate the linked signer before signing with it
      await delay(TEST_DELAYS.LONG);

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

/**
 * Asserts the execute rejects with `FEE_TOO_LOW` (2135) when its `maxFeeX18` is below the
 * required fee. Data-dependent: skips when the dynamic fee is currently free, as a bound of 0
 * (only execute while the fee is free) would then succeed.
 */
async function assertRejectsWithFeeTooLow(
  context: TestContext,
  requiredFee: BigNumber,
  execute: () => Promise<unknown>,
  label: string,
) {
  if (requiredFee.lte(0)) {
    context.skip('dynamic fee is currently free, cannot assert FeeTooLow');
    return;
  }

  await assert.rejects(
    execute,
    (err: unknown) => {
      assert.ok(
        err instanceof EngineServerFailureError,
        'error should be EngineServerFailureError',
      );
      assert.equal(
        err.errorCode,
        ENGINE_ERROR_CODES.FEE_TOO_LOW,
        `error code should be FEE_TOO_LOW (2135), got ${err.errorCode}`,
      );
      return true;
    },
    `${label} with maxFeeX18 below the required fee should be rejected`,
  );
}
