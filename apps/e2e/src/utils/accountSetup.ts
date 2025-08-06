import { createNadoClient, NadoClient, QUOTE_PRODUCT_ID } from '@nadohq/client';
import { addDecimals } from '@nadohq/utils';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';
import { waitForTransaction } from '../utils/waitForTransaction';

async function accountSetup(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;

  const nadoClient: NadoClient = createNadoClient(context.env.chainEnv, {
    walletClient,
    publicClient,
  });

  const quoteDepositAmount = addDecimals(1000, 6);

  console.log('Minting tokens');
  await waitForTransaction(
    nadoClient.spot._mintMockERC20({
      amount: quoteDepositAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    publicClient,
  );

  console.log('Approving allowance');
  await waitForTransaction(
    nadoClient.spot.approveAllowance({
      amount: quoteDepositAmount,
      productId: QUOTE_PRODUCT_ID,
    }),
    publicClient,
  );

  console.log('Depositing tokens');
  await waitForTransaction(
    nadoClient.spot.deposit({
      subaccountName: 'default',
      productId: QUOTE_PRODUCT_ID,
      amount: quoteDepositAmount,
    }),
    publicClient,
  );
}

console.log('[utils]: Running account setup');
void runWithContext(accountSetup);
