import {
  EIP712BurnNlpParams,
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712MintNlpParams,
  EIP712OrderParams,
  EIP712TransferQuoteParams,
  EIP712WithdrawCollateralParams,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { EngineServerExecuteSuccessResult } from './serverExecuteTypes';

/**
 * Either verifying address or signature must be provided;
 * If signature is not provided, the verifying address with the engine signer will be used to sign.
 */
export type SignatureParams =
  | {
      // Endpoint address for all executes except order placement
      verifyingAddr: string;
      chainId: number;
    }
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
export type WithBaseEngineExecuteParams<T> = SignatureParams &
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
  withdraw_collateral: EngineWithdrawCollateralParams;
}

export type EnginePlaceOrderResult =
  EngineServerExecuteSuccessResult<'place_order'> & {
    orderParams: EIP712OrderParams;
  };
