import { getValidatedAddress } from '@nadohq/utils';
import { TypedDataDomain } from 'abitype';

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
    // TODO: Rename to Nado
    name: 'Vertex',
    version: '0.0.1',
    chainId,
    verifyingContract: getValidatedAddress(contractAddress),
  };
}
