import {
  EngineOrderParams,
  EngineServerExecuteResult,
} from '@nadohq/engine-client';
import {
  BigDecimal,
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  OrderAppendix,
  Subaccount,
} from '@nadohq/shared';
import { TriggerCriteria, TriggerOrderStatus } from './clientModelTypes';
import {
  TriggerServerOrder,
  TriggerServerStatusTypeFilter,
  TriggerServerTriggerTypeFilter,
} from './serverQueryTypes';

type WithOptionalNonce<T> = Omit<T, 'nonce'> & { nonce?: string };

interface SignatureParams {
  /**
   * Address derived from productId for placement (see getOrderVerifyingAddr)
   * endpoint address for cancellation & listing
   */
  verifyingAddr: string;
  chainId: number;
}

/**
 * Executes
 */

export interface TriggerPlaceOrderParams extends SignatureParams {
  id?: number;
  productId: number;
  order: EngineOrderParams;
  triggerCriteria: TriggerCriteria;
  // If not given, engine defaults to true (leverage/borrow enabled)
  spotLeverage?: boolean;
  // For isolated orders, this specifies whether margin can be borrowed (i.e. whether the cross account can have a negative USDT balance)
  borrowMargin?: boolean;
  digest?: string;
  nonce?: string;
}

export interface TriggerPlaceOrdersParams {
  orders: TriggerPlaceOrderParams[];
  /**
   * If `true`, aborts the batch after the first failed order; if `false`, remaining orders continue to execute.
   * If not provided, the default value is `false`.
   */
  cancelOnFailure?: boolean;
}

export type TriggerCancelOrdersParams = SignatureParams &
  WithOptionalNonce<EIP712CancelOrdersParams>;

export type TriggerCancelProductOrdersParams = SignatureParams &
  WithOptionalNonce<EIP712CancelProductOrdersParams>;

/**
 * Queries
 */

export interface TriggerListOrdersParams extends Subaccount, SignatureParams {
  // In millis, defaults to 90s in the future
  recvTime?: BigDecimal;
  // If not given, defaults to all products
  productIds?: number[];
  // In seconds
  maxUpdateTimeInclusive?: number;
  // When provided, the associated trigger orders are returned regardless of other filters
  digests?: string[];
  limit?: number;
  // Filter by status types
  statusTypes?: TriggerServerStatusTypeFilter[];
  // Filter by trigger types
  triggerTypes?: TriggerServerTriggerTypeFilter[];
  // Filter by reduce-only orders
  reduceOnly?: boolean;
}

export interface TriggerOrder {
  productId: number;
  triggerCriteria: TriggerCriteria;
  price: BigDecimal;
  amount: BigDecimal;
  expiration: number;
  nonce: string;
  digest: string;
  appendix: OrderAppendix;
}

export interface TriggerOrderInfo {
  order: TriggerOrder;
  serverOrder: TriggerServerOrder;
  status: TriggerOrderStatus;
  updatedAt: number;
  placementTime: number;
}

export interface TriggerListOrdersResponse {
  orders: TriggerOrderInfo[];
}

export interface TriggerListTwapExecutionsParams {
  digest: string;
}

export type TwapExecutionStatus =
  | {
      type: 'pending';
    }
  | {
      type: 'executed';
      executedTime: number;
      executeResponse: EngineServerExecuteResult;
    }
  | {
      type: 'failed';
      error: string;
    }
  | {
      type: 'cancelled';
      reason: string;
    };

export interface TwapExecutionInfo {
  executionId: number;
  scheduledTime: number;
  status: TwapExecutionStatus;
  updatedAt: number;
}

export interface TriggerListTwapExecutionsResponse {
  executions: TwapExecutionInfo[];
}
