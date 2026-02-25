import { createNadoClient, NadoClient } from '@nadohq/client';
import {
  addDecimals,
  getNadoEIP712Values,
  QUOTE_PRODUCT_ID,
  toBigInt,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { encodeAbiParameters, encodePacked, parseAbiParameters } from 'viem';
import { assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_SUBACCOUNT_NAME, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';
import { waitForTransaction } from '../utils/waitForTransaction';

void describe(
  '[client]: collateral operations',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let nadoClient: NadoClient;
    let publicClient: RunContext['publicClient'];
    let walletClientAddress: string;

    const MINT_AMOUNT = addDecimals(1000, 6);
    const DEPOSIT_AMOUNT = addDecimals(500, 6);
    const TRANSFER_AMOUNT = addDecimals(100);
    const WITHDRAW_AMOUNT = addDecimals(50, 6);
    const SLOW_MODE_FEE_AMOUNT = addDecimals(1, 6);

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      publicClient = context.publicClient;
      walletClientAddress = walletClient.account.address;

      nadoClient = createNadoClient(context.env.chainEnv, {
        walletClient,
        publicClient,
      });
    });

    beforeEach(async () => {
      await delay(150);
    });

    // ---------------------------------------------------------------
    // Mint, approve, and deposit
    // ---------------------------------------------------------------
    void describe('deposit flow', () => {
      void test('mints mock ERC20 tokens', async () => {
        const receipt = await waitForTransaction(
          nadoClient.spot._mintMockERC20({
            amount: MINT_AMOUNT,
            productId: QUOTE_PRODUCT_ID,
          }),
          publicClient,
        );

        assertDefined(receipt, 'mintReceipt');
        assert.equal(receipt.status, 'success', 'mint tx should succeed');
      });

      void test('approves allowance for the full minted amount', async () => {
        const receipt = await waitForTransaction(
          nadoClient.spot.approveAllowance({
            amount: MINT_AMOUNT,
            productId: QUOTE_PRODUCT_ID,
          }),
          publicClient,
        );

        assertDefined(receipt, 'approveReceipt');
        assert.equal(receipt.status, 'success', 'approve tx should succeed');
      });

      void test('deposits tokens into the default subaccount', async () => {
        const receipt = await waitForTransaction(
          nadoClient.spot.deposit({
            subaccountName: TEST_SUBACCOUNT_NAME,
            productId: QUOTE_PRODUCT_ID,
            amount: DEPOSIT_AMOUNT,
          }),
          publicClient,
        );

        assertDefined(receipt, 'depositReceipt');
        assert.equal(receipt.status, 'success', 'deposit tx should succeed');
      });
    });

    // ---------------------------------------------------------------
    // Collateral transfers between subaccounts
    // ---------------------------------------------------------------
    void describe('collateral transfers', () => {
      void test('transfers quote from default to default2', async () => {
        const result = await nadoClient.spot.transferQuote({
          amount: TRANSFER_AMOUNT,
          subaccountName: TEST_SUBACCOUNT_NAME,
          recipientSubaccountName: 'default2',
        });

        debugPrint('Transfer result #1', result);
        assertDefined(result, 'transferResult1');
        assert.equal(result.status, 'success', 'transfer #1 should succeed');
      });

      void test('transfers quote back from default2 to default', async () => {
        const result = await nadoClient.spot.transferQuote({
          amount: TRANSFER_AMOUNT,
          subaccountName: 'default2',
          recipientSubaccountName: TEST_SUBACCOUNT_NAME,
        });

        debugPrint('Transfer result #2', result);
        assertDefined(result, 'transferResult2');
        assert.equal(result.status, 'success', 'transfer #2 should succeed');
      });
    });

    // ---------------------------------------------------------------
    // Withdrawals (fast and slow-mode)
    // ---------------------------------------------------------------
    void describe('withdrawals', () => {
      void test('withdraws tokens via the fast path', async () => {
        const result = await nadoClient.spot.withdraw({
          subaccountName: TEST_SUBACCOUNT_NAME,
          productId: QUOTE_PRODUCT_ID,
          amount: WITHDRAW_AMOUNT,
        });

        debugPrint('Withdrawal result', result);
        assertDefined(result, 'withdrawalResult');
        assert.equal(result.status, 'success', 'withdrawal should succeed');
      });

      void test('submits a slow-mode withdrawal via on-chain tx', async () => {
        // Approve the slow-mode fee
        const approveReceipt = await waitForTransaction(
          nadoClient.spot.approveAllowance({
            amount: SLOW_MODE_FEE_AMOUNT,
            productId: QUOTE_PRODUCT_ID,
          }),
          publicClient,
        );
        assertDefined(approveReceipt, 'slowModeApproveReceipt');
        assert.equal(
          approveReceipt.status,
          'success',
          'slow-mode approve should succeed',
        );

        // Build the withdraw collateral EIP-712 tx
        const tx = getNadoEIP712Values('withdraw_collateral', {
          amount: WITHDRAW_AMOUNT,
          nonce: await nadoClient.context.engineClient.getTxNonce(),
          productId: QUOTE_PRODUCT_ID,
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: walletClientAddress,
        });

        const encodedTx = encodeAbiParameters(
          parseAbiParameters('bytes32, uint32, uint128, uint64'),
          [tx.sender, tx.productId, toBigInt(tx.amount), toBigInt(tx.nonce)],
        );
        const encodedSlowModeTx = encodePacked(
          ['uint8', 'bytes'],
          [
            // Withdraw collateral enum value
            2,
            encodedTx,
          ],
        );

        // Submit via slow-mode on-chain
        const receipt = await waitForTransaction(
          nadoClient.context.contracts.endpoint.write.submitSlowModeTransaction(
            [encodedSlowModeTx],
          ),
          publicClient,
        );

        assertDefined(receipt, 'slowModeWithdrawalReceipt');
        assert.equal(
          receipt.status,
          'success',
          'slow-mode withdrawal tx should succeed',
        );
      });
    });
  },
);
