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
