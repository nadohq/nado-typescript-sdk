import {
  EIP712BurnVlpParams,
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712MintVlpParams,
  EIP712OrderParams,
  EIP712TransferQuoteParams,
  EIP712WithdrawCollateralParams,
} from '@nadohq/contracts';
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
  // For isolated orders, this specifies whether margin can be borrowed (i.e. whether the cross account can have a negative USDC balance)
  borrowMargin?: boolean;
}>;

export type EngineLiquidateSubaccountParams =
  WithBaseEngineExecuteParams<EIP712LiquidateSubaccountParams>;

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

export type EngineMintVlpParams = WithBaseEngineExecuteParams<
  WithSpotLeverage<EIP712MintVlpParams>
>;

export type EngineBurnVlpParams =
  WithBaseEngineExecuteParams<EIP712BurnVlpParams>;

export type EnginePlaceOrdersParams = EnginePlaceOrderParams[];

export interface EngineExecuteRequestParamsByType {
  burn_vlp: EngineBurnVlpParams;
  cancel_and_place: EngineCancelAndPlaceParams;
  cancel_orders: EngineCancelOrdersParams;
  cancel_product_orders: EngineCancelProductOrdersParams;
  link_signer: EngineLinkSignerParams;
  liquidate_subaccount: EngineLiquidateSubaccountParams;
  mint_vlp: EngineMintVlpParams;
  place_order: EnginePlaceOrderParams;
  place_orders: EnginePlaceOrdersParams;
  transfer_quote: EngineTransferQuoteParams;
  withdraw_collateral: EngineWithdrawCollateralParams;
}

export type EnginePlaceOrderResult =
  EngineServerExecuteSuccessResult<'place_order'> & {
    orderParams: EIP712OrderParams;
  };
