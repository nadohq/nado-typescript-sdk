import { ERC20_ABI } from '../abis';
import { WithContract } from '../types/nadoContractTypes';
import { WriteableContractInstance } from '../types/viemTypes';
import { BigNumberish, toBigInt } from '../utils';

export interface ApproveDepositAllowanceParams {
  amount: BigNumberish;
  tokenContract: WriteableContractInstance<typeof ERC20_ABI>;
}

/**
 * Approves the endpoint contract to spend the amount of tokens specified
 */
export function approveDepositAllowance({
  endpoint,
  amount,
  tokenContract,
}: WithContract<'endpoint', ApproveDepositAllowanceParams>) {
  return tokenContract.write.approve([endpoint.address, toBigInt(amount)]);
}
