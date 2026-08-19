import { Abi } from 'viem';
import { WriteableContractInstance } from '../types/viemTypes';

export function isWriteableContract<T extends { abi: Abi }>(
  contract: T,
): contract is T & WriteableContractInstance<T['abi']> {
  return 'write' in contract;
}
