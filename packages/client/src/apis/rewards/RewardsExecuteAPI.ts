import { toBigInt, toBigNumber } from '@nadohq/shared';
import { Hex } from 'viem';
import { BaseNadoAPI } from '../base';

export class RewardsExecuteAPI extends BaseNadoAPI {
  /**
   * Claims all available foundation rewards. Foundation rewards are tokens associated with the chain.
   * Typically, foundations for these chains will issue rewards for us to give to users.
   */
  async claimFoundationRewards() {
    const address = this.getWalletClientAddress();

    // Get claimed to determine which weeks haven't yet been claimed
    const claimed =
      await this.context.contracts.foundationRewardsAirdrop.read.getClaimed([
        address,
      ]);
    const proofs =
      await this.context.indexerClient.getClaimFoundationRewardsMerkleProofs({
        address,
      });

    // Get proofs for all weeks that haven't yet been claimed
    const proofsToClaim: {
      week: number;
      totalAmount: bigint;
      proof: Hex[];
    }[] = [];
    proofs.forEach((item, idx) => {
      if (idx === 0) {
        // week 0 is invalid
        return;
      }

      // There's no partial claim, so find weeks where there's a claimable amount and amt claimed is zero
      if (toBigNumber(item.totalAmount).gt(0) && claimed[idx] === 0n) {
        proofsToClaim.push({
          proof: item.proof,
          totalAmount: toBigInt(item.totalAmount),
          week: idx,
        });
      }
    });

    return this.context.contracts.foundationRewardsAirdrop.write.claim([
      proofsToClaim,
    ]);
  }
}
