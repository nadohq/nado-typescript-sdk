import { createVertexClient, VertexClient } from '@vertex-protocol/client';
import {
  getVertexEIP712Values,
  QUOTE_PRODUCT_ID,
} from '@vertex-protocol/contracts';
import { addDecimals, toBigInt } from '@vertex-protocol/utils';
import { encodeAbiParameters, encodePacked, parseAbiParameters } from 'viem';
import { prettyPrint } from '../utils/prettyPrint';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';
import { waitForTransaction } from '../utils/waitForTransaction';
import test from 'node:test';

async function collateralTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;

  const vertexClient: VertexClient = createVertexClient(context.env.chainEnv, {
    walletClient,
    publicClient,
  });

  const walletClientAddress = walletClient.account.address;

  const quoteMintAmount = addDecimals(1000, 6);
  const quoteDepositWithReferralAmount = addDecimals(500, 6);
  const quoteDepositAmount = addDecimals(500, 6);

  console.log('Minting tokens');
  await waitForTransaction(
    vertexClient.spot._mintMockERC20({
      amount: quoteMintAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    publicClient,
  );

  console.log('Approving allowance');
  await waitForTransaction(
    vertexClient.spot.approveAllowance({
      amount: quoteMintAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    publicClient,
  );

  console.log('Depositing tokens');
  await waitForTransaction(
    vertexClient.spot.deposit({
      subaccountName: 'default',
      productId: QUOTE_PRODUCT_ID,
      amount: quoteDepositAmount,
    }),
    publicClient,
  );

  console.log('Depositing tokens with referral code');
  await waitForTransaction(
    vertexClient.spot.deposit({
      subaccountName: 'default',
      productId: QUOTE_PRODUCT_ID,
      amount: quoteDepositWithReferralAmount,
      referralCode: 'Blk23MeZU3',
    }),
    publicClient,
  );

  /*
  Transfer collateral
   */

  const quoteTransferAmount = addDecimals(100, 6);

  const transferResult1 = await vertexClient.spot.transferQuote({
    amount: quoteTransferAmount,
    subaccountName: 'default',
    recipientSubaccountName: 'default2',
  });
  prettyPrint('Transfer result #1', transferResult1);

  const transferResult2 = await vertexClient.spot.transferQuote({
    amount: quoteTransferAmount,
    subaccountName: 'default2',
    recipientSubaccountName: 'default',
  });
  prettyPrint('Transfer result #2', transferResult2);

  /*
  Withdraw 50 via regular flow, and 50 via slow-mode
   */

  const withdrawAmount = addDecimals(50, 6);
  const slowModeFeeAmount = addDecimals(1, 6);

  console.log('Withdrawing tokens');
  const withdrawalResult = await vertexClient.spot.withdraw({
    subaccountName: 'default',
    productId: QUOTE_PRODUCT_ID,
    amount: withdrawAmount,
  });
  prettyPrint('Withdrawal result', withdrawalResult);

  console.log('Slow mode withdrawal');
  // 1. approve 1 USDC for submitting slow-mode tx
  await waitForTransaction(
    vertexClient.spot.approveAllowance({
      amount: slowModeFeeAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    publicClient,
  );
  // 2. generate withdraw collateral tx
  const tx = getVertexEIP712Values('withdraw_collateral', {
    amount: withdrawAmount,
    nonce: await vertexClient.context.engineClient.getTxNonce(),
    productId: QUOTE_PRODUCT_ID,
    subaccountName: 'default',
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

  console.log('Submitting slow mode withdrawal');
  // 3. submit via slow-mode
  await waitForTransaction(
    vertexClient.context.contracts.endpoint.write.submitSlowModeTransaction([
      encodedSlowModeTx,
    ]),
    publicClient,
  );
}

void test('[client]: Running collateral tests', () =>
  runWithContext(collateralTests));
