import { ContractInstance, ERC20_ABI } from '@vertex-protocol/contracts';
import { getValidatedAddress } from '@vertex-protocol/utils';
import { getContract } from 'viem';
import { BaseVertexAPI } from '../base';
import { ProductIdOrTokenAddress } from './types';

export class BaseSpotAPI extends BaseVertexAPI {
  /**
   * Retrieves the ERC20 token contract for a spot product
   */
  async getTokenContractForProduct(
    params: ProductIdOrTokenAddress,
  ): Promise<ContractInstance<typeof ERC20_ABI>> {
    let tokenAddress: string;
    if ('productId' in params) {
      const config = await this.context.contracts.spotEngine.read.getConfig([
        params.productId,
      ]);
      tokenAddress = config.token;
    } else {
      tokenAddress = params.tokenAddress;
    }

    return getContract({
      abi: ERC20_ABI,
      address: getValidatedAddress(tokenAddress),
      client: this.context.walletClient ?? this.context.publicClient,
    });
  }
}
