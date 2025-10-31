import { BigDecimalish } from '../utils/math';
import { OrderExecutionType } from './OrderExecutionType';

/**
 * Encodes whether the order will be sent to the trigger service
 */
export type OrderAppendixTriggerType =
  | 'price'
  | 'twap'
  // TWAP with specified order amounts, which will be specified in the Trigger Order itself
  | 'twap_custom_amounts';

/**
 * Fields associated with a TWAP trigger order.
 */
export interface OrderAppendixTwapFields {
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
   *
   * Implementation Note:
   * Packed appendix uses precision of 6 decimals on backend.
   * SDK automatically converts to/from x18 during packing/unpacking.
   */
  margin: BigDecimalish;
}

/**
 * All the fields encoded by the order appendix
 */
export interface OrderAppendix {
  reduceOnly?: boolean;
  orderExecutionType: OrderExecutionType;
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
  twap?: OrderAppendixTwapFields;
}
