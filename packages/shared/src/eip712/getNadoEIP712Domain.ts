import { TypedDataDomain } from 'abitype';
import { getValidatedAddress } from '../utils/getValidatedAddress';

/**
 * Gives the EIP712 data domain for order signing
 *
 * @param contractAddress usually the address of the orderbook (for orders) or sequencer (for other operations)
 * @param chainId
 */
export function getNadoEIP712Domain(
  contractAddress: string,
  chainId: number,
): TypedDataDomain {
  return {
    name: 'Nado',
    version: '0.0.1',
    chainId,
    verifyingContract: getValidatedAddress(contractAddress),
  };
}
