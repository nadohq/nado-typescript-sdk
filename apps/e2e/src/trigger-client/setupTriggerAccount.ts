import {
  addDecimals,
  depositCollateral,
  MOCK_ERC20_ABI,
  NADO_ABIS,
  toBigInt,
} from '@nadohq/shared';
import { TriggerServerStatusTypeFilter } from '@nadohq/trigger-client';
import { getContract } from 'viem';
import { TEST_SUBACCOUNT_NAME } from '../utils/testConstants';
import { RunContext } from '../utils/types';
import { waitForTransaction } from '../utils/waitForTransaction';

/** Status type filters that match all non-terminal trigger order states. */
export const PENDING_TRIGGER_STATUS_TYPES: TriggerServerStatusTypeFilter[] = [
  'triggering',
  'waiting_price',
  'waiting_dependency',
  'twap_executing',
];

/**
 * Deposits test collateral (10 000 USDC) into the default subaccount.
 * Mints mock tokens, approves the endpoint, and calls depositCollateral.
 */
export async function depositTestCollateral(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;

  const clearinghouse = getContract({
    abi: NADO_ABIS.clearinghouse,
    address: context.contracts.clearinghouse,
    client: walletClient,
  });
  const quote = getContract({
    abi: MOCK_ERC20_ABI,
    address: await clearinghouse.read.getQuote(),
    client: walletClient,
  });
  const endpoint = getContract({
    abi: NADO_ABIS.endpoint,
    address: context.contracts.endpoint,
    client: walletClient,
  });

  const depositAmount = toBigInt(addDecimals(10000, 6));

  await waitForTransaction(
    quote.write.mint([walletClient.account.address, depositAmount]),
    publicClient,
  );
  await waitForTransaction(
    quote.write.approve([context.contracts.endpoint, depositAmount]),
    publicClient,
  );
  await waitForTransaction(
    depositCollateral({
      amount: depositAmount,
      endpoint,
      productId: 0,
      subaccountName: TEST_SUBACCOUNT_NAME,
    }),
    publicClient,
  );
}
