import {
  EIP712BurnLpParams,
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712IsolatedOrderParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712MintLpParams,
  EIP712OrderParams,
  EIP712TransferQuoteParams,
  EIP712WithdrawCollateralParams,
} from '@vertex-protocol/contracts';
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
}>;

export type EngineIsolatedOrderParams = WithoutNonce<EIP712IsolatedOrderParams>;

export type EnginePlaceIsolatedOrderParams = WithBaseEngineExecuteParams<{
  id?: number;
  productId: number;
  order: EngineIsolatedOrderParams;
  // Whether the cross subaccount can borrow quote for the margin transfer into the isolated subaccount. If not given, engine defaults to false
  borrowMargin?: boolean;
}>;

export type EngineLiquidateSubaccountParams =
  WithBaseEngineExecuteParams<EIP712LiquidateSubaccountParams>;

export type EngineMintLpParams = WithBaseEngineExecuteParams<
  WithSpotLeverage<EIP712MintLpParams>
>;

export type EngineBurnLpParams =
  WithBaseEngineExecuteParams<EIP712BurnLpParams>;

export type EngineWithdrawCollateralParams = WithBaseEngineExecuteParams<
  WithSpotLeverage<EIP712WithdrawCollateralParams>
>;

export type EngineCancelOrdersParams =
  WithBaseEngineExecuteParams<EIP712CancelOrdersParams>;

export type EngineCancelAndPlaceParams = {
  cancelOrders: EngineCancelOrdersParams;
  placeOrder: EnginePlaceOrderParams;
};

export type EngineCancelProductOrdersParams =
  WithBaseEngineExecuteParams<EIP712CancelProductOrdersParams>;

export type EngineLinkSignerParams =
  WithBaseEngineExecuteParams<EIP712LinkSignerParams>;

export type EngineTransferQuoteParams =
  WithBaseEngineExecuteParams<EIP712TransferQuoteParams>;

export interface EngineExecuteRequestParamsByType {
  liquidate_subaccount: EngineLiquidateSubaccountParams;
  mint_lp: EngineMintLpParams;
  withdraw_collateral: EngineWithdrawCollateralParams;
  burn_lp: EngineBurnLpParams;
  place_order: EnginePlaceOrderParams;
  place_isolated_order: EnginePlaceIsolatedOrderParams;
  cancel_orders: EngineCancelOrdersParams;
  cancel_and_place: EngineCancelAndPlaceParams;
  cancel_product_orders: EngineCancelProductOrdersParams;
  link_signer: EngineLinkSignerParams;
  transfer_quote: EngineTransferQuoteParams;
}

export type EnginePlaceOrderResult =
  EngineServerExecuteSuccessResult<'place_order'> & {
    orderParams: EIP712OrderParams;
  };

export type EnginePlaceIsolatedOrderResult =
  EngineServerExecuteSuccessResult<'place_isolated_order'> & {
    orderParams: EIP712IsolatedOrderParams;
  };
