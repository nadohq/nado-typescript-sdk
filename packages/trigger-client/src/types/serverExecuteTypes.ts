import { EIP712OrderValues } from '@nadohq/contracts';
import {
  EngineServerExecuteFailureResult,
  EngineServerExecuteRequestByType,
  EngineServerExecuteSuccessResult,
} from '@nadohq/engine-client';
import { TriggerServerTriggerCriteria } from './serverModelTypes';

export interface TriggerServerPlaceOrderParams {
  id: number | null;
  product_id: number;
  order: EIP712OrderValues;
  trigger: TriggerServerTriggerCriteria;
  signature: string;
  digest: string | null;
  // Trigger service defaults this to true
  spot_leverage: boolean | null;
}

export type TriggerServerCancelOrdersParams =
  EngineServerExecuteRequestByType['cancel_orders'];

export type TriggerServerCancelProductOrdersParams =
  EngineServerExecuteRequestByType['cancel_product_orders'];

export interface TriggerServerExecuteRequestByType {
  place_order: TriggerServerPlaceOrderParams;
  cancel_orders: TriggerServerCancelOrdersParams;
  cancel_product_orders: TriggerServerCancelProductOrdersParams;
}

export type TriggerServerExecuteRequestType =
  keyof TriggerServerExecuteRequestByType;

export type TriggerServerExecuteSuccessResult<
  T extends TriggerServerExecuteRequestType = TriggerServerExecuteRequestType,
> = EngineServerExecuteSuccessResult<T>;

export type TriggerServerExecuteResult<
  T extends TriggerServerExecuteRequestType = TriggerServerExecuteRequestType,
> = TriggerServerExecuteSuccessResult<T> | EngineServerExecuteFailureResult;
