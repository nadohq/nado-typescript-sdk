import { WithContracts } from '@nadohq/contracts';
import { WalletNotProvidedError } from '@nadohq/utils';

import { NadoClientContext } from '../context';

export class BaseNadoAPI {
  readonly context: NadoClientContext;

  constructor(context: NadoClientContext) {
    this.context = context;
  }

  protected getWalletClientAddress() {
    if (!this.context.walletClient) {
      throw new WalletNotProvidedError();
    }
    return this.context.walletClient.account.address;
  }

  protected getWalletClientChainIdIfNeeded(params: {
    chainId?: number;
  }): number {
    if (params.chainId) {
      return params.chainId;
    }
    if (!this.context.walletClient) {
      throw new WalletNotProvidedError();
    }
    return this.context.walletClient.chain.id;
  }

  protected getEndpointAddress() {
    return this.context.contractAddresses.endpoint;
  }

  protected async getOrderbookAddress(productId: number) {
    return this.context.engineClient.getOrderbookAddress(productId);
  }

  protected getSubaccountOwnerIfNeeded(params: {
    subaccountOwner?: string;
  }): string {
    return params.subaccountOwner ?? this.getWalletClientAddress();
  }

  protected paramsWithContracts<T>(params: T): WithContracts<T> {
    return {
      ...params,
      ...this.context.contracts,
    };
  }
}
