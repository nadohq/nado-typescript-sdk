import { GetIndexerCashIncentivesParams } from '@nadohq/indexer-client';
import { BaseRewardsAPI } from './BaseRewardsAPI';
import { GetClaimedAirdropAmountsParams } from './types';

export class RewardsQueryAPI extends BaseRewardsAPI {
  /**
   * Gets cash incentives progress and claim state for a wallet. Each event's `wallet.claim` is
   * tagged on `status`, and carries the merkle proof needed to claim onchain when that status is
   * `claimable`.
   *
   * @param params
   */
  async getCashIncentives(params: GetIndexerCashIncentivesParams) {
    return this.context.indexerClient.getCashIncentives(params);
  }

  /**
   * Gets the cumulative amounts already claimed by a wallet from an airdrop contract, in raw token
   * units, indexed directly by `week`.
   *
   * Weeks are 1-based, so index 0 is always zero and the array length is one greater than the
   * number of reward events. A week is fully claimed when its entry equals the `totalAmount` of the
   * corresponding claim proof; a smaller value means there is still an amount to claim, since
   * entries are cumulative rather than per-transaction.
   *
   * @param params
   */
  async getClaimedAirdropAmounts({
    address,
    ...rest
  }: GetClaimedAirdropAmountsParams): Promise<readonly bigint[]> {
    const airdrop = this.getAirdropContract(rest);
    return airdrop.read.getClaimed([address]);
  }
}
