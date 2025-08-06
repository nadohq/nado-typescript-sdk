import { keccak256 } from 'viem';
import { Subaccount, WalletClientWithAccount } from '../common';
import { getNadoEIP712Domain } from '../eip712';
import { subaccountToHex } from './bytes32';

interface Params extends Subaccount {
  walletClient: WalletClientWithAccount;
  chainId: number;
  endpointAddress: string;
}

/**
 * Deterministically creates a new private key from a predetermined EIP712 message. This is used to
 * reliably create an authorized signer delegate for the subaccount across different clients. Used on the FE in order
 * to have a consistent private key for the subaccount linked signer across different clients.
 *
 * @param params
 */
export async function createDeterministicLinkedSignerPrivateKey(
  params: Params,
) {
  const {
    chainId,
    endpointAddress,
    walletClient,
    subaccountName,
    subaccountOwner,
  } = params;

  const signedMessage = await walletClient.signTypedData({
    domain: getNadoEIP712Domain(endpointAddress, chainId),
    types: {
      CreateLinkedSignerWallet: [{ name: 'subaccount', type: 'bytes32' }],
    },
    primaryType: 'CreateLinkedSignerWallet',
    message: {
      subaccount: subaccountToHex({
        subaccountOwner,
        subaccountName,
      }),
    },
  });

  return keccak256(signedMessage);
}
