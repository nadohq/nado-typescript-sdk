import {
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  Subaccount,
} from '@nadohq/contracts';
import { EngineOrderParams } from '@nadohq/engine-client';
import { BigDecimal } from '@nadohq/utils';
import { TriggerServerOrder } from './serverQueryTypes';
import { TriggerCriteria, TriggerOrderStatus } from './clientModelTypes';

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
  digest?: string;
  nonce?: string;
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
  productId?: number;
  // Pending trigger orders only, ignores cancelled & triggered orders
  pending: boolean;
  // In seconds
  maxUpdateTimeInclusive?: number;
  // When provided, the associated trigger orders are returned regardless of other filters
  digests?: string[];
  limit?: number;
}

export interface TriggerOrder {
  productId: number;
  triggerCriteria: TriggerCriteria;
  price: BigDecimal;
  amount: BigDecimal;
  expiration: BigDecimal;
  nonce: string;
  digest: string;
}

export interface TriggerOrderInfo {
  order: TriggerOrder;
  serverOrder: TriggerServerOrder;
  status: TriggerOrderStatus;
  updatedAt: number;
}

export interface TriggerListOrdersResponse {
  orders: TriggerOrderInfo[];
}
