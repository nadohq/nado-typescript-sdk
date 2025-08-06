import {
  GetEngineMaxMintVlpAmountParams,
  GetEngineMaxWithdrawableParams,
} from '@nadohq/engine-client';
import { BigDecimal, getValidatedAddress, toBigDecimal } from '@nadohq/utils';
import { BaseSpotAPI } from './BaseSpotAPI';
import { GetTokenAllowanceParams, GetTokenWalletBalanceParams } from './types';

export class SpotQueryAPI extends BaseSpotAPI {
  /**
   * Gets the estimated max withdrawable amount for a product
   * @param params
   */
  async getMaxWithdrawable(params: GetEngineMaxWithdrawableParams) {
    return this.context.engineClient.getMaxWithdrawable(params);
  }

  /**
   * Queries engine to determine maximum quote amount for minting VLP.
   *
   * @param params
   */
  async getMaxMintVlpAmount(params: GetEngineMaxMintVlpAmountParams) {
    return this.context.engineClient.getMaxMintVlpAmount(params);
  }

  /**
   * Helper to get current token balance in the user's wallet (i.e. not in a Nado subaccount)
   */
  async getTokenWalletBalance({
    address,
    ...rest
  }: GetTokenWalletBalanceParams): Promise<bigint> {
    const token = await this.getTokenContractForProduct(rest);
    return token.read.balanceOf([getValidatedAddress(address)]);
  }

  /**
   * Helper to get current token allowance
   */
  async getTokenAllowance({
    address,
    ...rest
  }: GetTokenAllowanceParams): Promise<BigDecimal> {
    const token = await this.getTokenContractForProduct(rest);
    return toBigDecimal(
      await token.read.allowance([
        getValidatedAddress(address),
        this.getEndpointAddress(),
      ]),
    );
  }
}
