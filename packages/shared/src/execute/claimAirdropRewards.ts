import { Hex } from 'viem';
import { AIRDROP_ABI } from '../abis';
import { WriteableContractInstance } from '../types/viemTypes';
import { BigNumberish, toBigInt } from '../utils';

/**
 * A single merkle claim proof for one reward event of the Airdrop contract.
 */
export interface AirdropClaimProof {
  /**
   * Reward event identifier within the Airdrop contract. This is not the same as the internal
   * Cash Incentives `eventId`.
   */
  week: number;
  /**
   * Cumulative claimable amount for the wallet, in raw token units (i.e. already scaled by the
   * token decimals). Must match the amount committed to by the merkle root exactly.
   */
  totalAmount: BigNumberish;
  /**
   * Merkle proof for the leaf identified by the wallet, `week` and `totalAmount`.
   */
  proof: Hex[];
}

/**
 * Parameters for claiming merkle-distributed rewards from an Airdrop contract.
 */
export interface ClaimAirdropRewardsParams {
  /** Writeable instance of the Airdrop contract holding the rewards. */
  airdropContract: WriteableContractInstance<typeof AIRDROP_ABI>;
  /**
   * Proofs to claim in a single transaction. All proofs must belong to the given Airdrop contract.
   */
  claimProofs: AirdropClaimProof[];
}

/**
 * Claims one or more merkle-distributed rewards from an Airdrop contract in a single transaction.
 *
 * @param params
 * @returns The transaction hash of the submitted claim.
 */
export function claimAirdropRewards({
  airdropContract,
  claimProofs,
}: ClaimAirdropRewardsParams) {
  return airdropContract.write.claim([
    claimProofs.map((claimProof) => ({
      // uint32
      week: claimProof.week,
      // uint256
      totalAmount: toBigInt(claimProof.totalAmount),
      // bytes32[]
      proof: claimProof.proof,
    })),
  ]);
}
