import { BaseNadoAPI } from '../base';
import { LinkSignerParams, LiquidateSubaccountParams } from './types';

export class SubaccountExecuteAPI extends BaseNadoAPI {
  /**
   * Liquidates a subaccount
   *
   * @param params
   */
  async liquidateSubaccount(params: LiquidateSubaccountParams) {
    return this.context.engineClient.liquidateSubaccount({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
      chainId: this.getWalletClientChainIdIfNeeded(params),
    });
  }

  /**
   * Links a signer to a subaccount to allow them to sign transactions on behalf of the subaccount
   *
   * @param params
   */
  async linkSigner(params: LinkSignerParams) {
    return this.context.engineClient.linkSigner({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
      chainId: this.getWalletClientChainIdIfNeeded(params),
    });
  }
}
