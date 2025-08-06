import { addDecimals, toBigInt } from '@nadohq/utils';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import {
  EIP712WithdrawCollateralParams,
  SignedEIP712OrderParams,
  SignedTx,
} from './eip712';

export function encodeSignedWithdrawCollateralTx(
  signed: SignedTx<EIP712WithdrawCollateralParams>,
) {
  return encodeAbiParameters(
    parseAbiParameters(
      '(tuple(address sender, string subaccountName, uint32 productId, uint128 amount, uint64 nonce), bytes signature)',
    ),
    [
      [
        [
          signed.tx.subaccountOwner,
          signed.tx.subaccountName,
          signed.tx.productId,
          signed.tx.amount,
          signed.tx.nonce,
        ],
        signed.signature,
      ],
    ],
  );
}

export function encodeSignedOrder(signed: SignedEIP712OrderParams) {
  return encodeAbiParameters(
    parseAbiParameters(
      '(tuple(tuple(address sender, string subaccountName, int128 priceX18, int128 amount, uint64 expiration, uint64 nonce), bytes signature))',
    ),
    [
      [
        [
          signed.order.subaccountOwner,
          signed.order.subaccountName,
          toBigInt(addDecimals(signed.order.price)),
          signed.order.amount,
          signed.order.expiration,
          signed.order.nonce,
        ],
        signed.signature,
      ],
    ],
  );
}
