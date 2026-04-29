import {
  EngineCancelOrdersParams,
  EngineCancelProductOrdersParams,
  EngineOrderParams,
  EnginePlaceOrderParams,
} from '@nadohq/engine-client';
import {
  TriggerCancelOrdersParams,
  TriggerCancelProductOrdersParams,
  TriggerListOrdersParams,
  TriggerPlaceOrderParams,
} from '@nadohq/trigger-client';
import BigNumber from 'bignumber.js';
import { OptionalSignatureParams, OptionalSubaccountOwner } from '../types';

type ClientOrderParams<T extends { order: EngineOrderParams }> = Omit<
  OptionalSignatureParams<T>,
  // Order is overridden to make subaccount owner optional
  | 'order'
  // Verifying address can be derived from product ID
  | 'verifyingAddr'
> & {
  order: OptionalSubaccountOwner<EngineOrderParams>;
};

export type PlaceOrderParams = ClientOrderParams<EnginePlaceOrderParams>;

export type PlaceOrdersParams = {
  orders: PlaceOrderParams[];
  stopOnFailure?: boolean;
};

export type CancelOrdersParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineCancelOrdersParams>
>;

export type CancelProductOrdersParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineCancelProductOrdersParams>
>;

export interface CancelAndPlaceOrderParams {
  placeOrder: PlaceOrderParams;
  cancelOrders: CancelOrdersParams;
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

export type PlaceTriggerOrderParams =
  ClientOrderParams<TriggerPlaceOrderParams>;

export interface PlaceTriggerOrdersParams {
  orders: PlaceTriggerOrderParams[];
  stopOnFailure?: boolean;
}

export type CancelTriggerOrdersParams = OptionalSignatureParams<
  OptionalSubaccountOwner<TriggerCancelOrdersParams>
>;

export type CancelTriggerProductOrdersParams = OptionalSignatureParams<
  OptionalSubaccountOwner<TriggerCancelProductOrdersParams>
>;

export type GetTriggerOrdersParams =
  OptionalSignatureParams<TriggerListOrdersParams>;
