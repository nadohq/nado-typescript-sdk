import { createNadoClient, NadoClient } from '@nadohq/client';
import { addDecimals, QUOTE_PRODUCT_ID } from '@nadohq/shared';
import { TEST_SUBACCOUNT_NAME } from './testConstants';
import { RunContext } from './types';
import { waitForTransaction } from './waitForTransaction';

/**
 * Mints mock ERC20 tokens, approves allowance, and deposits into the given
 * subaccount. Intended for test environment setup on testnet.
 *
 * @param context - The test run context providing wallet and chain clients.
 * @param opts - Optional overrides for deposit amount and subaccount name.
 */
export async function ensureSubaccountFunded(
  context: RunContext,
): Promise<void> {
  const depositAmount = addDecimals(1000, 6);
  const subaccountName = TEST_SUBACCOUNT_NAME;

  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;

  const nadoClient: NadoClient = createNadoClient(context.env.chainEnv, {
    walletClient,
    publicClient,
  });

  await waitForTransaction(
    nadoClient.spot._mintMockERC20({
      amount: depositAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    publicClient,
  );

  await waitForTransaction(
    nadoClient.spot.approveAllowance({
      amount: depositAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    publicClient,
  );

  await waitForTransaction(
    nadoClient.spot.deposit({
      subaccountName,
      productId: QUOTE_PRODUCT_ID,
      amount: depositAmount,
    }),
    publicClient,
  );
}
