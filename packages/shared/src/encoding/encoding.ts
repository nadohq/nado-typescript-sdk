import {
  encodeAbiParameters,
  encodePacked,
  parseAbiParameters,
  type Hex,
} from 'viem';
import {
  EIP712WithdrawCollateralParams,
  SignedEIP712OrderParams,
  SignedTx,
} from '../eip712';
import { addDecimals, toBigInt } from '../utils';

/**
 * Transaction type identifiers for slow mode transactions.
 */
export enum SlowModeTxType {
  DepositCollateral = 1,
  WithdrawCollateral = 2,
  LinkSigner = 13,
  ClaimBuilderFee = 31,
  WithdrawCollateralV2 = 32,
}

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

export interface ClaimBuilderFeeParams {
  /** The sender subaccount as bytes32 */
  sender: Hex;
  /** The builder ID to claim fees for */
  builderId: number;
}

/**
 * Encodes a ClaimBuilderFee slow mode transaction.
 *
 * Format: [tx_type_byte] + [abi_encoded_params]
 *
 * @param params - The claim builder fee parameters
 * @returns The encoded transaction bytes ready to submit via endpoint.submitSlowModeTransaction
 */
export function encodeClaimBuilderFeeTx(params: ClaimBuilderFeeParams): Hex {
  const txBytes = encodeAbiParameters(
    parseAbiParameters('bytes32 sender, uint32 builderId'),
    [params.sender, params.builderId],
  );

  return encodePacked(
    ['uint8', 'bytes'],
    [SlowModeTxType.ClaimBuilderFee, txBytes],
  );
}
