import { EIP712ListTriggerOrdersValues, SignedTx } from '@nadohq/contracts';
import { EngineServerExecuteResult } from '@nadohq/engine-client';
import { TriggerServerPlaceOrderParams } from './serverExecuteTypes';

export type TriggerServerOrderStatus =
  | 'pending'
  | {
      // Result from sending to engine
      triggered: EngineServerExecuteResult;
    }
  | {
      // Reason string
      cancelled: string;
    }
  | {
      // Error message
      internal_error: string;
    };

/**
 * Request types
 */

export interface TriggerServerListTriggerOrdersParams
  extends SignedTx<EIP712ListTriggerOrdersValues> {
  pending: boolean;
  // If not given, defaults to all products
  product_id?: number;
  max_update_time?: number;
  digests?: string[];
  limit?: number;
}

export interface TriggerServerQueryRequestByType {
  list_trigger_orders: TriggerServerListTriggerOrdersParams;
}

export type TriggerServerQueryRequestType =
  keyof TriggerServerQueryRequestByType;

/**
 * Response types
 */

export type TriggerServerOrder = TriggerServerPlaceOrderParams & {
  // Digest is always populated here
  digest: string;
};

export interface TriggerServerOrderInfo {
  order: TriggerServerOrder;
  status: TriggerServerOrderStatus;
  updated_at: number;
}

export interface TriggerServerListTriggerOrdersResponse {
  orders: TriggerServerOrderInfo[];
}

export interface TriggerServerQueryResponseByType {
  list_trigger_orders: TriggerServerListTriggerOrdersResponse;
}

export interface TriggerServerQuerySuccessResponse<
  TQueryType extends
    keyof TriggerServerQueryResponseByType = TriggerServerQueryRequestType,
> {
  status: 'success';
  data: TriggerServerQueryResponseByType[TQueryType];
}

export interface TriggerServerQueryFailureResponse {
  status: 'failure';
  error: string;
  error_code: number;
}

export type TriggerServerQueryResponse<
  TQueryType extends
    keyof TriggerServerQueryResponseByType = TriggerServerQueryRequestType,
> =
  | TriggerServerQuerySuccessResponse<TQueryType>
  | TriggerServerQueryFailureResponse;
