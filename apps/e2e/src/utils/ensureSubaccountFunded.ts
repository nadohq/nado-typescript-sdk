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
 * @param subaccountName - Subaccount to fund; defaults to the shared E2E account.
 */
export async function ensureSubaccountFunded(
  context: RunContext,
  subaccountName = TEST_SUBACCOUNT_NAME,
): Promise<void> {
  const depositAmount = addDecimals(1000, 6);

  const nadoClient: NadoClient = createNadoClient(
    { chainEnv: context.env.chainEnv },
    {
      walletClient: context.walletClient,
      publicClient: context.publicClient,
    },
  );

  await waitForTransaction(
    nadoClient.spot._mintMockERC20({
      amount: depositAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    context.publicClient,
  );

  await waitForTransaction(
    nadoClient.spot.approveAllowance({
      amount: depositAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    context.publicClient,
  );

  await waitForTransaction(
    nadoClient.spot.deposit({
      subaccountName,
      productId: QUOTE_PRODUCT_ID,
      amount: depositAmount,
    }),
    context.publicClient,
  );
}
