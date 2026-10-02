import {
  BigNumberish,
  EIP712BurnNlpParams,
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712MintNlpParams,
  EIP712OrderParams,
  EIP712TransferQuoteParams,
  EIP712WithdrawCollateralParams,
  EIP712WithdrawCollateralV2Params,
  SignatureParams,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { EngineServerExecuteSuccessResult } from './serverExecuteTypes';

/**
 * Either verifying address or signature must be provided;
 * If signature is not provided, the verifying address with the engine signer will be used to sign.
 */
export type SignatureParamsOrSignature =
  | SignatureParams
  | {
      signature: string;
    };

type WithoutNonce<T extends { nonce: unknown }> = Omit<T, 'nonce'>;

type WithSpotLeverage<T> = T & {
  spotLeverage?: boolean;
};

export type WithSignature<T> = T & {
  signature: string;
};

// Params associated with all engine executes
export type WithBaseEngineExecuteParams<T> = SignatureParamsOrSignature &
  Omit<T, 'nonce'> & {
    nonce?: string;
  };

export type EngineOrderParams = WithoutNonce<EIP712OrderParams>;

export type EnginePlaceOrderParams = WithBaseEngineExecuteParams<{
  id?: number;
  productId: number;
  order: EngineOrderParams;
  // If not given, engine defaults to true (leverage/borrow enabled)
  spotLeverage?: boolean;
  // For isolated orders, this specifies whether margin can be borrowed (i.e. whether the cross account can have a negative USDT balance)
  borrowMargin?: boolean;
}>;

export type EngineLiquidateSubaccountParams =
  WithBaseEngineExecuteParams<EIP712LiquidateSubaccountParams>;

export type EngineWithdrawCollateralParams = WithBaseEngineExecuteParams<
  WithSpotLeverage<EIP712WithdrawCollateralParams>
>;

/** Params for the `withdraw_collateral_v2` execute: a withdrawal with custom recipient, charged a dynamic fee. */
export type EngineWithdrawCollateralV2Params = WithBaseEngineExecuteParams<
  WithSpotLeverage<EIP712WithdrawCollateralV2Params>
> & {
  /**
   * Highest fee accepted, in the product's x18 units. If the fee at execution is higher, the
   * request fails with `FEE_TOO_LOW` (2135); otherwise exactly the required fee is charged.
   * If omitted, up to the cap is accepted (optional here, unlike {@link EngineTransferQuoteV2Params}
   * where the API requires it). Set to 0 to only execute while the fee is free. Not signed.
   */
  maxFeeX18?: BigNumberish;
};

export type EngineCancelOrdersParams =
  WithBaseEngineExecuteParams<EIP712CancelOrdersParams> & {
    /**
     * The current unfilled amount of the order. If provided, the cancel will fail if the
     * order's unfilled amount does not match this value. Used to prevent race conditions
     * where a fill occurs at the same time as a cancel.
     */
    requiredUnfilledAmount?: BigNumber;
  };

export interface EngineCancelAndPlaceParams {
  cancelOrders: EngineCancelOrdersParams;
  placeOrder: EnginePlaceOrderParams;
  /**
   * The current unfilled amount of the order being cancelled. If provided, the cancel will
   * fail if the order's unfilled amount does not match this value.
   */
  requiredUnfilledAmount?: BigNumber;
  /**
   * If `true`, the cancel_and_place operation will fail if the order being cancelled has been
   * partially filled.
   */
  placeRequiresUnfilled?: boolean;
}

export type EngineCancelProductOrdersParams =
  WithBaseEngineExecuteParams<EIP712CancelProductOrdersParams>;

export type EngineLinkSignerParams =
  WithBaseEngineExecuteParams<EIP712LinkSignerParams>;

export type EngineTransferQuoteParams =
  WithBaseEngineExecuteParams<EIP712TransferQuoteParams>;

/**
 * Params for the `transfer_quote_v2` execute: a quote transfer charged a dynamic fee. Same signed
 * `TransferQuote` struct as `transfer_quote`, plus a `maxFeeX18` fee bound.
 */
export type EngineTransferQuoteV2Params =
  WithBaseEngineExecuteParams<EIP712TransferQuoteParams> & {
    /**
     * Highest fee the sender accepts, in USDT0 x18. If the fee at execution is higher, the
     * request fails with `FEE_TOO_LOW` (2135); otherwise exactly the required fee is charged,
     * never `maxFeeX18`. Required by the API, unlike {@link EngineWithdrawCollateralV2Params}
     * where it is optional. Set to 0 to only execute while the fee is free. Not signed.
     */
    maxFeeX18: BigNumberish;
  };

export type EngineMintNlpParams = WithBaseEngineExecuteParams<
  WithSpotLeverage<EIP712MintNlpParams>
>;

export type EngineBurnNlpParams =
  WithBaseEngineExecuteParams<EIP712BurnNlpParams>;

export type EnginePlaceOrdersParams = {
  orders: EnginePlaceOrderParams[];
  /**
   * If `true`, aborts the batch after the first failed order; if `false`, remaining orders continue to execute.
   * If not provided, the default value is `false`.
   */
  stopOnFailure?: boolean;
};

export interface EngineExecuteRequestParamsByType {
  burn_nlp: EngineBurnNlpParams;
  cancel_and_place: EngineCancelAndPlaceParams;
  cancel_orders: EngineCancelOrdersParams;
  cancel_product_orders: EngineCancelProductOrdersParams;
  link_signer: EngineLinkSignerParams;
  liquidate_subaccount: EngineLiquidateSubaccountParams;
  mint_nlp: EngineMintNlpParams;
  place_order: EnginePlaceOrderParams;
  place_orders: EnginePlaceOrdersParams;
  transfer_quote: EngineTransferQuoteParams;
  /** Params for the `transfer_quote_v2` execute. */
  transfer_quote_v2: EngineTransferQuoteV2Params;
  withdraw_collateral: EngineWithdrawCollateralParams;
  withdraw_collateral_v2: EngineWithdrawCollateralV2Params;
}

export type EnginePlaceOrderResult =
  EngineServerExecuteSuccessResult<'place_order'> & {
    orderParams: EIP712OrderParams;
  };
