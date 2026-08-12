import {
  approveDepositAllowance,
  depositCollateral,
  DepositCollateralParams,
  isWriteableContract,
  MOCK_ERC20_ABI,
  toBigInt,
  WalletNotProvidedError,
} from '@nadohq/shared';
import { BaseSpotAPI } from './BaseSpotAPI';
import {
  ApproveAllowanceParams,
  BurnNlpParams,
  MintMockERC20Params,
  MintNlpParams,
  TransferQuoteParams,
  WithdrawCollateralParams,
  WithdrawCollateralV2Params,
} from './types';

export class SpotExecuteAPI extends BaseSpotAPI {
  async deposit(params: DepositCollateralParams) {
    if (!isWriteableContract(this.context.contracts.endpoint)) {
      throw new WalletNotProvidedError();
    }
  
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

  /**
   * Withdraws collateral to a custom recipient address via the `withdraw_collateral_v2` execute.
   *
   * When `sendTo` is the zero address, funds are sent to the subaccount owner. When `sendTo` is a
   * non-zero address, the transaction must be signed by the subaccount owner (linked signers are
   * not permitted).
   *
   * @param params
   */
  async withdrawV2(params: WithdrawCollateralV2Params) {
    return this.context.engineClient.withdrawCollateralV2({
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

  async mintNlp(params: MintNlpParams) {
    return this.context.engineClient.mintNlp({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  async burnNlp(params: BurnNlpParams) {
    return this.context.engineClient.burnNlp({
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
