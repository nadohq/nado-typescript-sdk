import {
  GetEngineDynamicFeeQuoteParams,
  GetEngineDynamicFeeQuoteResponse,
  GetEngineMaxMintNlpAmountParams,
  GetEngineMaxWithdrawableParams,
  GetEngineMaxWithdrawableResponse,
  GetEngineMaxWithdrawableWithDynamicFeeResponse,
} from '@nadohq/engine-client';
import { getValidatedAddress, toBigNumber } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { BaseSpotAPI } from './BaseSpotAPI';
import { GetTokenAllowanceParams, GetTokenWalletBalanceParams } from './types';

export class SpotQueryAPI extends BaseSpotAPI {
  /**
   * Gets the estimated max withdrawable amount for a product
   * @param params
   */
  async getMaxWithdrawable(
    params: GetEngineMaxWithdrawableParams,
  ): Promise<GetEngineMaxWithdrawableResponse>;
  /**
   * Gets the estimated max withdrawable amount for a product, with the current dynamic fee of
   * Withdraw Collateral V2 reserved instead of the flat fee. The reserved fee is returned as
   * `fee`.
   * @param params
   * @returns The max withdrawable with the current dynamic fee reserved, and the reserved fee.
   */
  async getMaxWithdrawable(
    params: GetEngineMaxWithdrawableParams,
    options: { withDynamicFee: true },
  ): Promise<GetEngineMaxWithdrawableWithDynamicFeeResponse>;
  async getMaxWithdrawable(
    params: GetEngineMaxWithdrawableParams,
    options?: { withDynamicFee?: boolean },
  ): Promise<
    | GetEngineMaxWithdrawableResponse
    | GetEngineMaxWithdrawableWithDynamicFeeResponse
  > {
    if (options?.withDynamicFee) {
      return this.context.engineClient.getMaxWithdrawable(params, {
        withDynamicFee: true,
      });
    }

    return this.context.engineClient.getMaxWithdrawable(params);
  }

  /**
   * Gets the current dynamic fee for a V2 withdrawal or V2 quote transfer. The fee is priced
   * again at execution, so pass a `maxFeeX18` with some headroom when executing.
   * @param params
   * @returns The current required fee, the fee cap, and the V2 demand pressure.
   */
  async getDynamicFeeQuote(
    params: GetEngineDynamicFeeQuoteParams,
  ): Promise<GetEngineDynamicFeeQuoteResponse> {
    return this.context.engineClient.getDynamicFeeQuote(params);
  }

  /**
   * Queries engine to determine maximum quote amount for minting NLP.
   *
   * @param params
   */
  async getMaxMintNlpAmount(params: GetEngineMaxMintNlpAmountParams) {
    return this.context.engineClient.getMaxMintNlpAmount(params);
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
  }: GetTokenAllowanceParams): Promise<BigNumber> {
    const token = await this.getTokenContractForProduct(rest);
    return toBigNumber(
      await token.read.allowance([
        getValidatedAddress(address),
        this.getEndpointAddress(),
      ]),
    );
  }
}
