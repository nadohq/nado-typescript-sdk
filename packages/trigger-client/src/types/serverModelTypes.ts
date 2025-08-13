export interface TriggerServerDependency {
  digest: string;
  /**
   * Whether to trigger on partial fills.
   */
  on_partial_fill: boolean;
}

export type TriggerServerPriceRequirement =
  // These trigger on fast oracle price
  | {
      price_above: string;
    }
  | {
      price_below: string;
    }
  // These trigger on last trade price
  | {
      last_price_above: string;
    }
  | {
      last_price_below: string;
    }
  // These trigger on mid-book price
  | {
      mid_price_above: string;
    }
  | {
      mid_price_below: string;
    };

export interface TriggerServerPriceTriggerCriteria {
  price_requirement: TriggerServerPriceRequirement;
  dependency?: TriggerServerDependency;
}

export interface TriggerServerTimeTriggerCriteria {
  /**
   * Trigger interval in seconds
   */
  interval: string;
  /**
   * By default, trigger service will split up orders as per total amount / interval
   * If you want to specify the amounts for each interval, you can provide them here.
   */
  amounts?: string[];
}

export type TriggerServerTriggerCriteria =
  | {
      price_trigger: TriggerServerPriceTriggerCriteria;
    }
  | {
      time_trigger: TriggerServerTimeTriggerCriteria;
    };
