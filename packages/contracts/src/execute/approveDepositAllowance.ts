import { BigDecimalish, toBigInt } from '@nadohq/utils';
import { ERC20_ABI, WithContract, WriteableContractInstance } from '../common';

export interface ApproveDepositAllowanceParams {
  amount: BigDecimalish;
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
