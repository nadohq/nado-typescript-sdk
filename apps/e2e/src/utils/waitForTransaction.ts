import { Hash, PublicClient } from 'viem';

export async function waitForTransaction(
  txHashPromise: Promise<Hash>,
  publicClient: PublicClient,
  confirmations = 2,
) {
  return publicClient.waitForTransactionReceipt({
    hash: await txHashPromise,
    confirmations,
  });
}
