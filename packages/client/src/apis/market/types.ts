import {
  EngineCancelOrdersParams,
  EngineCancelProductOrdersParams,
  EngineIsolatedOrderParams,
  EngineOrderParams,
  EnginePlaceIsolatedOrderParams,
  EnginePlaceOrderParams,
} from '@vertex-protocol/engine-client';
import {
  TriggerCancelOrdersParams,
  TriggerCancelProductOrdersParams,
  TriggerListOrdersParams,
  TriggerPlaceOrderParams,
} from '@vertex-protocol/trigger-client';
import { OptionalSignatureParams, OptionalSubaccountOwner } from '../types';

type ClientOrderParams<T> = Omit<OptionalSignatureParams<T>, 'order'> & {
  order: OptionalSubaccountOwner<EngineOrderParams>;
};

export type PlaceOrderParams = ClientOrderParams<EnginePlaceOrderParams>;

/**
 * Same as PlaceOrderParams but with isolated fields for isolated margin trading
 */
export type PlaceIsolatedOrderParams = Omit<
  OptionalSignatureParams<EnginePlaceIsolatedOrderParams>,
  'order'
> & {
  order: OptionalSubaccountOwner<EngineIsolatedOrderParams>;
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
}

export type PlaceTriggerOrderParams =
  ClientOrderParams<TriggerPlaceOrderParams>;

export type CancelTriggerOrdersParams = OptionalSignatureParams<
  OptionalSubaccountOwner<TriggerCancelOrdersParams>
>;

export type CancelTriggerProductOrdersParams = OptionalSignatureParams<
  OptionalSubaccountOwner<TriggerCancelProductOrdersParams>
>;

export type GetTriggerOrdersParams =
  OptionalSignatureParams<TriggerListOrdersParams>;
