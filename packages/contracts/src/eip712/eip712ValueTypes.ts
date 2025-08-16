import { BigDecimalish } from '@nadohq/utils';
import { Hex } from 'viem';
import {
  EIP712BurnNlpParams,
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712LeaderboardAuthenticationParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712ListTriggerOrdersParams,
  EIP712MintNlpParams,
  EIP712OrderParams,
  EIP712TransferQuoteParams,
  EIP712WithdrawCollateralParams,
} from './signatureParamTypes';

type WithEIP712Sender<
  T extends { subaccountOwner: string; subaccountName: string },
> = Omit<T, 'subaccountOwner' | 'subaccountName'> & {
  // Hex encoded bytes32
  sender: Hex;
};

export type EIP712WithdrawCollateralValues =
  WithEIP712Sender<EIP712WithdrawCollateralParams>;

export type EIP712LiquidateSubaccountValues = Omit<
  WithEIP712Sender<EIP712LiquidateSubaccountParams>,
  'liquidateeOwner' | 'liquidateeName'
> & {
  // Hex encoded bytes32
  liquidatee: string;
};

export type EIP712OrderValues = Omit<
  WithEIP712Sender<EIP712OrderParams>,
  'price'
> & {
  priceX18: BigDecimalish;
};

export type EIP712IsolatedOrderValues = EIP712OrderValues & {
  margin: BigDecimalish;
};

export type EIP712ListTriggerOrdersValues =
  WithEIP712Sender<EIP712ListTriggerOrdersParams>;

export type EIP712OrderCancellationValues =
  WithEIP712Sender<EIP712CancelOrdersParams>;

export type EIP712ProductOrdersCancellationValues =
  WithEIP712Sender<EIP712CancelProductOrdersParams>;

export type EIP712LinkSignerValues = WithEIP712Sender<EIP712LinkSignerParams>;

export type EIP712TransferQuoteValues = Omit<
  WithEIP712Sender<EIP712TransferQuoteParams>,
  'recipientSubaccountName'
> & {
  // Hex encoded bytes32
  recipient: string;
};

export type EIP712LeaderboardAuthenticationValues =
  WithEIP712Sender<EIP712LeaderboardAuthenticationParams>;

export type EIP712MintNlpValues = WithEIP712Sender<EIP712MintNlpParams>;

export type EIP712BurnNlpValues = WithEIP712Sender<EIP712BurnNlpParams>;

/**
 * All possible requests to be signed, to the EIP712 value interface
 */
export interface SignableRequestTypeToEIP712Values {
  burn_nlp: EIP712BurnNlpValues;
  cancel_orders: EIP712OrderCancellationValues;
  cancel_product_orders: EIP712ProductOrdersCancellationValues;
  leaderboard_authentication: EIP712LeaderboardAuthenticationValues;
  link_signer: EIP712LinkSignerValues;
  liquidate_subaccount: EIP712LiquidateSubaccountValues;
  list_trigger_orders: EIP712ListTriggerOrdersValues;
  mint_nlp: EIP712MintNlpValues;
  place_isolated_order: EIP712IsolatedOrderValues;
  place_order: EIP712OrderValues;
  transfer_quote: EIP712TransferQuoteValues;
  withdraw_collateral: EIP712WithdrawCollateralValues;
}
