import {
  approveDepositAllowance,
  depositCollateral,
  DepositCollateralParams,
  isWriteableContract,
  MintMockERC20Params,
  MOCK_ERC20_ABI,
} from '@vertex-protocol/contracts';
import { toBigInt, WalletNotProvidedError } from '@vertex-protocol/utils';
import { BaseSpotAPI } from './BaseSpotAPI';
import {
  ApproveAllowanceParams,
  BurnVlpParams,
  MintVlpParams,
  TransferQuoteParams,
  WithdrawCollateralParams,
} from './types';

export class SpotExecuteAPI extends BaseSpotAPI {
  async deposit(params: DepositCollateralParams) {
    return depositCollateral({
      endpoint: this.context.contracts.endpoint,
      subaccountName: params.subaccountName,
      productId: params.productId,
      amount: params.amount,
      referralCode: params.referralCode,
    });
  }

  async withdraw(params: WithdrawCollateralParams) {
    return this.context.engineClient.withdrawCollateral({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  async approveAllowance(params: ApproveAllowanceParams) {
    const tokenContract = await this.getTokenContractForProduct(params);
    if (!isWriteableContract(tokenContract)) {
      throw new Error(
        'Token contract does not permit writes. Is a wallet client provided?',
      );
    }

    return approveDepositAllowance({
      amount: params.amount,
      endpoint: this.context.contracts.endpoint,
      tokenContract,
    });
  }

  /**
   * Transfers quote between subaccounts under the same wallet.
   *
   * @param params
   */
  async transferQuote(params: TransferQuoteParams) {
    return this.context.engineClient.transferQuote({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
      chainId: this.getWalletClientChainIdIfNeeded(params),
    });
  }

  async mintVlp(params: MintVlpParams) {
    return this.context.engineClient.mintVlp({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  async burnVlp(params: BurnVlpParams) {
    return this.context.engineClient.burnVlp({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  async _mintMockERC20(params: MintMockERC20Params) {
    if (!this.context.walletClient) {
      throw new WalletNotProvidedError();
    }

    const config = await this.context.contracts.spotEngine.read.getConfig([
      params.productId,
    ]);

    return this.context.walletClient.writeContract({
      abi: MOCK_ERC20_ABI,
      address: config.token,
      functionName: 'mint',
      args: [this.getWalletClientAddress(), toBigInt(params.amount)],
    });
  }
}
