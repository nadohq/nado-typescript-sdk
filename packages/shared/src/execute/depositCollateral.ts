import { toHex } from 'viem';
import { WithContract } from '../types/nadoContractTypes';
import { BigDecimalish, subaccountNameToBytes12, toBigInt } from '../utils';

export interface DepositCollateralParams {
  subaccountName: string;
  productId: number;
  amount: BigDecimalish;
  referralCode?: string;
}

/**
 * Deposits collateral through the Endpoint contract, which will be picked up automatically by the sequencer and
 * submitted.
 *
 */
export async function depositCollateral({
  endpoint,
  subaccountName,
  productId,
  amount,
  referralCode,
}: WithContract<'endpoint', DepositCollateralParams>) {
  const subaccountNameHex = toHex(subaccountNameToBytes12(subaccountName));
  if (referralCode) {
    return endpoint.write.depositCollateralWithReferral([
      // bytes12
      subaccountNameHex,
      // uint32
      productId,
      // uint128
      toBigInt(amount),
      // string
      referralCode,
    ]);
  } else {
    return endpoint.write.depositCollateral([
      subaccountNameHex,
      productId,
      toBigInt(amount),
    ]);
  }
}
