import { BigDecimalish } from '@nadohq/utils';
import { OrderExpirationType } from './OrderExpirationType';

/**
 * Encodes whether the order will be sent to the trigger service
 */
export type OrderAppendixTriggerType =
  | 'price'
  | 'twap'
  // TWAP with specified "random" order amounts, which will be specified in the Trigger Order itself
  | 'twap_random';

/**
 * Fields associated with a TWAP trigger order.
 */
export interface OrderAppendixTWAPFields {
  /**
   * Number of TWAP orders to be placed.
   */
  numOrders: number;
  /**
   * Maximum slippage on each TWAP order, based on the oracle price at time of order execution.
   * Ex: 0.01 means 1% slippage.
   */
  slippageFrac: number;
}

/**
 * Fields associated with an isolated order
 */
export interface OrderAppendixIsolatedFields {
  /**
   * Amount of margin to transfer into the isolated position.
   */
  margin: BigDecimalish;
}

/**
 * All the fields encoded by the order appendix
 */
export interface OrderAppendix {
  reduceOnly: boolean;
  orderExpirationType: OrderExpirationType;
  /**
   * Specify the type of trigger that will be used for the order if the order will be sent to the trigger service.
   */
  triggerType?: OrderAppendixTriggerType;
  /**
   * Specify if the order is for an isolated position
   * An order CANNOT be both a TWAP order and an isolated order.
   */
  isolated?: OrderAppendixIsolatedFields;
  /**
   * Specify if the order is a TWAP order
   * An order CANNOT be both a TWAP order and an isolated order.
   */
  twap?: OrderAppendixTWAPFields;
}
