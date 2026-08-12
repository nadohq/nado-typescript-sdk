import { AIRDROP_ABI, ContractInstance } from '@nadohq/shared';
import { getContract } from 'viem';
import { BaseNadoAPI } from '../base';
import { AirdropAddressParams } from './types';

export class BaseRewardsAPI extends BaseNadoAPI {
  /**
   * Builds a contract instance for an Airdrop contract. Airdrop addresses are not part of the core
   * Nado deployment; they are returned by the indexer alongside a claim proof.
   */
  protected getAirdropContract({
    airdropAddress,
  }: AirdropAddressParams): ContractInstance<typeof AIRDROP_ABI> {
    return getContract({
      abi: AIRDROP_ABI,
      address: airdropAddress,
      client: this.context.walletClient ?? this.context.publicClient,
    });
  }
}
