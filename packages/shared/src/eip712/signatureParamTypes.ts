import { Address, Hex } from 'viem';
import { Subaccount } from '../types/subaccountTypes';
import { BigNumberish } from '../utils';

export interface SignedTx<TBaseTx> {
  tx: TBaseTx;
  signature: string;
}

export interface SignedEIP712OrderParams {
  order: EIP712OrderParams;
  signature: string;
}

export interface EIP712WithdrawCollateralParams extends Subaccount {
  productId: number;
  amount: BigNumberish;
  nonce: string;
}

export interface EIP712WithdrawCollateralV2Params extends EIP712WithdrawCollateralParams {
  // 20-byte recipient address. The zero address sends funds to the subaccount owner.
  sendTo: Address;
  // Reserved uint128 for forward-compatible withdrawal features.
  appendix: BigNumberish;
}

export interface EIP712LiquidateSubaccountParams extends Subaccount {
  // Subaccount being liquidated
  liquidateeOwner: string;
  liquidateeName: string;
  // 0 = spread, 1 = long, 2 = short
  mode: number;
  // Spot & perp pair
  healthGroup: BigNumberish;
  amount: BigNumberish;
  nonce: string;
}

export interface EIP712OrderParams extends Subaccount {
  // Expiration time in seconds, with order type encoded if relevant
  expiration: BigNumberish;
  // Limit price
  price: BigNumberish;
  // Positive for buy, negative for sell
  amount: BigNumberish;
  // A unique nonce to identify the order
  nonce: string;
  // Packed order appendix (uint128) to encode order details such as order execution behavior, isolated, etc.
  appendix: BigNumberish;
}

export interface EIP712ListTriggerOrdersParams extends Subaccount {
  recvTime: BigNumberish;
}

export interface EIP712UpdateDependencyParams extends Subaccount {
  // Digest (bytes32 hex string) of the order the trigger orders currently depend on
  oldDigest: string;
  // Digest (bytes32 hex string) of the replacement order the trigger orders should depend on
  newDigest: string;
  nonce: string;
}

export interface EIP712CancelOrdersParams extends Subaccount {
  productIds: number[];
  digests: string[];
  nonce: string;
}

export interface EIP712CancelProductOrdersParams extends Subaccount {
  productIds: number[];
  nonce: string;
}

export interface EIP712LinkSignerParams extends Subaccount {
  signer: Hex;
  nonce: string;
}

export interface EIP712TransferQuoteParams extends Subaccount {
  recipientSubaccountName: string;
  amount: BigNumberish;
  nonce: string;
}

export interface EIP712LeaderboardAuthenticationParams extends Subaccount {
  expiration: BigNumberish;
  contestIds: number[];
}

export interface EIP712SocialAuthenticationParams extends Subaccount {
  expiration: BigNumberish;
  provider: 'twitter';
}

export interface EIP712MintNlpParams extends Subaccount {
  quoteAmount: BigNumberish;
  nonce: string;
}

export interface EIP712BurnNlpParams extends Subaccount {
  nlpAmount: BigNumberish;
  nonce: string;
}

/**
 * Params for the mobile service API's `NadoAuthentication` envelope.
 */
export interface EIP712NadoAuthenticationParams extends Subaccount {
  // Namespaced method string, e.g. `mobile:execute_set_private_mode`.
  method: string;
  // keccak256 of the msgpack-encoded request payload.
  payloadHash: Hex;
  nonce: string;
}
