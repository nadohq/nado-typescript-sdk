import { BaseNadoAPI } from '../base';
import {
  LinkSignerParams,
  LiquidateSubaccountParams,
  OrderSignerParams,
} from './types';

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

  /**
   * Adds an order signer to a subaccount. Order signers can only place and cancel orders; up to
   * 15 per subaccount, added by the owner or the linked signer.
   *
   * @param params
   */
  async addOrderSigner(params: OrderSignerParams) {
    return this.context.engineClient.addOrderSigner({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
      chainId: this.getWalletClientChainIdIfNeeded(params),
    });
  }

  /**
   * Deletes an order signer from a subaccount. Cancels the open orders that signer placed.
   *
   * @param params
   */
  async deleteOrderSigner(params: OrderSignerParams) {
    return this.context.engineClient.deleteOrderSigner({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
      chainId: this.getWalletClientChainIdIfNeeded(params),
    });
  }
}
