import {
  EngineServerExecuteFailureResult,
  EngineServerExecuteRequestByType,
  EngineServerExecuteSuccessResult,
} from '@nadohq/engine-client';
import { EIP712OrderValues } from '@nadohq/shared';
import { TriggerServerTriggerCriteria } from './serverModelTypes';

/**
 * Where a fired trigger executes. `clob_only` fills on the order book, `otc_only` on Prime and
 * cancels if no Prime plan is available at fire time, `smart_router` lets the service pick the
 * cheaper venue at fire time.
 */
export type TriggerServerRoutingMode =
  | 'clob_only'
  | 'otc_only'
  | 'smart_router';

export interface TriggerServerPlaceOrderParams {
  id: number | null;
  product_id: number;
  order: EIP712OrderValues;
  trigger: TriggerServerTriggerCriteria;
  signature: string;
  digest: string | null;
  // Trigger service defaults this to true
  spot_leverage: boolean | null;
  borrow_margin: boolean | null;
  // Trigger service defaults this to `clob_only`; omitted rather than sent as null
  routing_mode?: TriggerServerRoutingMode;
}

export type TriggerServerCancelOrdersParams =
  EngineServerExecuteRequestByType['cancel_orders'];

export type TriggerServerCancelProductOrdersParams =
  EngineServerExecuteRequestByType['cancel_product_orders'];

export type TriggerServerUpdateDependencyParams =
  EngineServerExecuteRequestByType['update_dependency'];

export interface TriggerServerPlaceOrdersParams {
  orders: TriggerServerPlaceOrderParams[];
  stop_on_failure: boolean | null;
}

export interface TriggerServerExecuteRequestByType {
  place_order: TriggerServerPlaceOrderParams;
  place_orders: TriggerServerPlaceOrdersParams;
  cancel_orders: TriggerServerCancelOrdersParams;
  cancel_product_orders: TriggerServerCancelProductOrdersParams;
  update_dependency: TriggerServerUpdateDependencyParams;
}

export type TriggerServerExecuteRequestType =
  keyof TriggerServerExecuteRequestByType;

export type TriggerServerExecuteSuccessResult<
  T extends TriggerServerExecuteRequestType = TriggerServerExecuteRequestType,
> = EngineServerExecuteSuccessResult<T>;

export type TriggerServerExecuteResult<
  T extends TriggerServerExecuteRequestType = TriggerServerExecuteRequestType,
> = TriggerServerExecuteSuccessResult<T> | EngineServerExecuteFailureResult;
