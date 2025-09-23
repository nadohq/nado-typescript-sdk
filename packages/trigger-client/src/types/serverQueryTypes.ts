import { EngineServerExecuteResult } from '@nadohq/engine-client';
import { EIP712ListTriggerOrdersValues, SignedTx } from '@nadohq/shared';
import { TriggerServerPlaceOrderParams } from './serverExecuteTypes';

export type TriggerServerOrderStatus =
  | {
      cancelled: TriggerServerCancelReason;
    }
  | {
      triggered: EngineServerExecuteResult;
    }
  | {
      internal_error: string;
    }
  | 'triggering'
  | 'waiting_price'
  | 'waiting_dependency'
  | {
      twap_executing: {
        current_execution: number;
        total_executions: number;
      };
    }
  | {
      twap_completed: {
        executed: number;
        total: number;
      };
    };

/**
 * Request types
 */

export type TriggerServerTriggerTypeFilter = 'price_trigger' | 'time_trigger';

export type TriggerServerStatusTypeFilter =
  | 'cancelled'
  | 'triggered'
  | 'internal_error'
  | 'triggering'
  | 'waiting_price'
  | 'waiting_dependency'
  | 'twap_executing'
  | 'twap_completed';

export interface TriggerServerListTriggerOrdersParams
  extends SignedTx<EIP712ListTriggerOrdersValues> {
  // If not given, defaults to all products
  product_ids?: number[];
  max_update_time?: number;
  digests?: string[];
  limit?: number;
  trigger_types?: TriggerServerTriggerTypeFilter[];
  status_types?: TriggerServerStatusTypeFilter[];
  reduce_only?: boolean;
}

export interface TriggerServerListTwapExecutionsParams {
  digest: string;
}

export interface TriggerServerQueryRequestByType {
  list_trigger_orders: TriggerServerListTriggerOrdersParams;
  list_twap_executions: TriggerServerListTwapExecutionsParams;
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

export type TriggerServerCancelReason =
  | 'user_requested'
  | 'linked_signer_changed'
  | 'expired'
  | 'account_health'
  | 'isolated_subaccount_closed'
  | 'dependent_order_cancelled';

export type TriggerServerTwapExecutionStatus =
  | 'pending'
  | {
      executed: {
        executed_time: number;
        execute_response: EngineServerExecuteResult;
      };
    }
  | {
      failed: string;
    }
  | {
      cancelled: TriggerServerCancelReason;
    };

export interface TriggerServerTwapExecutionInfo {
  execution_id: number;
  scheduled_time: number;
  status: TriggerServerTwapExecutionStatus;
  updated_at: number;
}

export interface TriggerServerTwapExecutionsResponse {
  executions: TriggerServerTwapExecutionInfo[];
}

export interface TriggerServerQueryResponseByType {
  list_trigger_orders: TriggerServerListTriggerOrdersResponse;
  list_twap_executions: TriggerServerTwapExecutionsResponse;
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
