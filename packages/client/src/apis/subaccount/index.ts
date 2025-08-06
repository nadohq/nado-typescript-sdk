import { createDeterministicLinkedSignerPrivateKey } from '@nadohq/contracts';
import { WalletNotProvidedError } from '@nadohq/utils';
import { Mixin } from 'ts-mixer';
import { privateKeyToAccount } from 'viem/accounts';
import { SubaccountExecuteAPI } from './SubaccountExecuteAPI';
import { SubaccountQueryAPI } from './SubaccountQueryAPI';
import { CreateStandardLinkedSignerResult } from './types';

export * from './types';

export class SubaccountAPI extends Mixin(
  SubaccountExecuteAPI,
  SubaccountQueryAPI,
) {
  /**
   * Given the current context, create a "standard" link signer Account for the subaccount
   * The "standard" linked signer private key is deterministically generated so that the frontend running on
   * different clients can have a consistent private key for the subaccount linked signer.
   *
   * @param subaccountName
   */
  async createStandardLinkedSigner(
    subaccountName: string,
  ): Promise<CreateStandardLinkedSignerResult> {
    const walletClient = this.context.walletClient;

    if (!walletClient) {
      throw new WalletNotProvidedError();
    }

    const privateKey = await createDeterministicLinkedSignerPrivateKey({
      chainId: walletClient.chain.id,
      endpointAddress: this.getEndpointAddress(),
      walletClient,
      subaccountName,
      subaccountOwner: walletClient.account.address,
    });

    return {
      privateKey,
      account: privateKeyToAccount(privateKey),
    };
  }
}
