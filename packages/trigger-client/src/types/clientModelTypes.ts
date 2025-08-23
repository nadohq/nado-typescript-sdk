import { EngineServerExecuteResult } from '@nadohq/engine-client';
import { BigDecimalish } from '@nadohq/shared';

/*
Price trigger
 */

export type PriceTriggerRequirementType =
  | 'oracle_price_above'
  | 'oracle_price_below'
  | 'last_price_above'
  | 'last_price_below'
  | 'mid_price_above'
  | 'mid_price_below';

export interface PriceTriggerDependency {
  /**
   * Digest of the order that this trigger depends on.
   */
  digest: string;
  /**
   * Whether to trigger on partial fills.
   */
  onPartialFill: boolean;
}

export interface PriceTriggerCriteria {
  type: PriceTriggerRequirementType;
  triggerPrice: BigDecimalish;
  dependency?: PriceTriggerDependency;
}

/*
Time trigger (for TWAP)
 */

export interface TimeTriggerCriteria {
  /**
   * For TWAP: Trigger interval in seconds
   */
  interval: BigDecimalish;
  /**
   * For TWAP: By default, trigger service will split up orders as per total amount / interval
   * If you want to specify the amounts for each interval, you can provide them here.
   */
  amounts?: BigDecimalish[];
}

/**
 * All possible trigger conditions that can be used to place a trigger order.
 */
export type TriggerCriteria =
  | {
      type: 'price';
      criteria: PriceTriggerCriteria;
    }
  | {
      type: 'time';
      criteria: TimeTriggerCriteria;
    };

export type TriggerCriteriaType = TriggerCriteria['type'];

export type TriggerOrderStatus =
  | {
      type: 'pending';
    }
  | {
      type: 'cancelled';
      reason: string;
    }
  | {
      type: 'triggered';
      result: EngineServerExecuteResult;
    }
  | {
      type: 'internal_error';
      error: string;
    };
