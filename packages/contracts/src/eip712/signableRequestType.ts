import {
  EIP712BurnVlpParams,
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712IsolatedOrderParams,
  EIP712LeaderboardAuthenticationParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712ListTriggerOrdersParams,
  EIP712MintVlpParams,
  EIP712OrderParams,
  EIP712TransferQuoteParams,
  EIP712WithdrawCollateralParams,
} from './signatureParamTypes';

/**
 * All possible requests to be signed, to the expected params
 */
export interface SignableRequestTypeToParams {
  burn_vlp: EIP712BurnVlpParams;
  cancel_orders: EIP712CancelOrdersParams;
  cancel_product_orders: EIP712CancelProductOrdersParams;
  leaderboard_authentication: EIP712LeaderboardAuthenticationParams;
  link_signer: EIP712LinkSignerParams;
  liquidate_subaccount: EIP712LiquidateSubaccountParams;
  list_trigger_orders: EIP712ListTriggerOrdersParams;
  mint_vlp: EIP712MintVlpParams;
  place_isolated_order: EIP712IsolatedOrderParams;
  place_order: EIP712OrderParams;
  transfer_quote: EIP712TransferQuoteParams;
  withdraw_collateral: EIP712WithdrawCollateralParams;
}

export type SignableRequestType = keyof SignableRequestTypeToParams;
