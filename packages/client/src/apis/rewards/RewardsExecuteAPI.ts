import {
  AirdropClaimProof,
  claimAirdropRewards,
  isWriteableContract,
  toBigNumber,
  WalletNotProvidedError,
} from '@nadohq/shared';
import { Hash } from 'viem';
import { BaseRewardsAPI } from './BaseRewardsAPI';

export class RewardsExecuteAPI extends BaseRewardsAPI {
  /**
   * Claims every currently claimable cash incentives reward for the connected wallet in a single
   * transaction, fetching the merkle proofs from the indexer itself.
   *
   * The Airdrop contract verifies proofs against `msg.sender`, so this can only ever claim for the
   * connected wallet. Rewards that were already settled onchain are dropped before submitting,
   * since the indexer keeps reporting them as claimable, as are rewards whose week the contract
   * does not know about yet.
   *
   * @returns Hash of the submitted claim transaction.
   * @throws `WalletNotProvidedError` when no wallet client is available to sign with.
   * @throws When the indexer reports nothing claimable, or when no claimable reward is ready to
   * claim onchain because each has either already been claimed or is not yet registered on the
   * airdrop contract.
   */
  async claimCashIncentives(): Promise<Hash> {
    const walletAddress = this.getWalletClientAddress();
    const { events } = await this.context.indexerClient.getCashIncentives({
      address: walletAddress,
    });

    const claimableRewards = events
      .map((event) => event.wallet.claim)
      .filter((claim) => claim.status === 'claimable');

    // Every reward currently comes from the same airdrop contract, so they claim in one transaction
    const airdropAddress = claimableRewards[0]?.airdropAddress;
    if (!airdropAddress) {
      throw new Error(
        'No claimable cash incentives rewards found for this wallet.',
      );
    }

    const airdropContract = this.getAirdropContract({ airdropAddress });
    if (!isWriteableContract(airdropContract)) {
      throw new WalletNotProvidedError();
    }

    // Indexed by week, 1-based, with an unused slot 0, so the last valid week is `length - 1`
    const claimed = await airdropContract.read.getClaimed([walletAddress]);

    const unclaimedProofs: AirdropClaimProof[] = [];
    for (const { week, totalAmount, proof } of claimableRewards) {
      // A reward can be published by the indexer before its merkle root is registered onchain, so
      // skip those weeks rather than failing and blocking the weeks that are ready to claim
      if (week < 1 || week >= claimed.length) {
        continue;
      }
      // Claimed amounts are cumulative, so anything below the entitlement is still claimable
      if (toBigNumber(claimed[week]).lt(toBigNumber(totalAmount))) {
        unclaimedProofs.push({ week, totalAmount, proof });
      }
    }

    if (unclaimedProofs.length === 0) {
      throw new Error(
        `No cash incentives rewards are ready to claim from the airdrop contract at ${airdropAddress}. Each claimable reward has either already been claimed onchain, or is not yet registered on the contract (it reports ${claimed.length - 1} week(s)).`,
      );
    }

    return claimAirdropRewards({
      airdropContract,
      claimProofs: unclaimedProofs,
    });
  }
}
