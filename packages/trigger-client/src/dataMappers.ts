import {
  addDecimals,
  removeDecimals,
  toBigDecimal,
  toIntegerString,
} from '@nadohq/utils';
import {
  PriceTriggerCriteria,
  PriceTriggerRequirementType,
  TimeTriggerCriteria,
  TriggerCriteria,
  TriggerOrder,
  TriggerOrderInfo,
  TriggerOrderStatus,
  TriggerServerOrderInfo,
  TriggerServerOrderStatus,
  TriggerServerPriceTriggerCriteria,
  TriggerServerTimeTriggerCriteria,
  TriggerServerTriggerCriteria,
} from './types';

/**
 * Maps client-side trigger criteria to server-side trigger criteria format.
 * Converts price and time triggers to their respective server representations
 * with proper decimal scaling and field name transformations.
 *
 * @param criteria - The client-side trigger criteria (price or time based)
 * @returns The server-formatted trigger criteria ready for API transmission
 */
export function mapTriggerCriteria(
  criteria: TriggerCriteria,
): TriggerServerTriggerCriteria {
  switch (criteria.type) {
    case 'price':
      return {
        price_trigger: mapPriceTriggerCriteria(criteria.criteria),
      };
    case 'time':
      return {
        time_trigger: mapTimeTriggerCriteria(criteria.criteria),
      };
  }
}

function mapPriceTriggerCriteria(
  criteria: PriceTriggerCriteria,
): TriggerServerPriceTriggerCriteria {
  const priceValue = toIntegerString(addDecimals(criteria.triggerPrice));

  const price_requirement = (() => {
    switch (criteria.type) {
      case 'oracle_price_above':
        return { price_above: priceValue };
      case 'oracle_price_below':
        return { price_below: priceValue };
      case 'last_price_above':
        return { last_price_above: priceValue };
      case 'last_price_below':
        return { last_price_below: priceValue };
      case 'mid_price_above':
        return { mid_price_above: priceValue };
      case 'mid_price_below':
        return { mid_price_below: priceValue };
    }
  })();

  return {
    price_requirement,
    dependency: criteria.dependency
      ? {
          digest: criteria.dependency.digest,
          on_partial_fill: criteria.dependency.onPartialFill,
        }
      : undefined,
  };
}

function mapTimeTriggerCriteria(
  criteria: TimeTriggerCriteria,
): TriggerServerTimeTriggerCriteria {
  return {
    interval: toIntegerString(criteria.interval),
    amounts: criteria.amounts?.map((amount) => toIntegerString(amount)),
  };
}

/**
 * Maps complete server-side trigger order information to client-side format.
 *
 * @param info - The complete server-side trigger order information including order, status, and timestamps
 * @returns The client-side trigger order information with converted values and normalized structure
 */
export function mapServerOrderInfo(
  info: TriggerServerOrderInfo,
): TriggerOrderInfo {
  const { order: serverOrder, status, updated_at } = info;
  const order: TriggerOrder = {
    amount: toBigDecimal(serverOrder.order.amount),
    expiration: toBigDecimal(serverOrder.order.expiration),
    nonce: serverOrder.order.nonce,
    price: removeDecimals(toBigDecimal(serverOrder.order.priceX18)),
    digest: serverOrder.digest,
    productId: serverOrder.product_id,
    triggerCriteria: mapServerTriggerCriteria(serverOrder.trigger),
  };
  return {
    serverOrder,
    order,
    status: mapTriggerServerOrderStatus(status),
    updatedAt: updated_at,
  };
}

function mapTriggerServerOrderStatus(
  status: TriggerServerOrderStatus,
): TriggerOrderStatus {
  if (status === 'pending') {
    return {
      type: 'pending',
    };
  } else if ('cancelled' in status) {
    return {
      type: 'cancelled',
      reason: status.cancelled,
    };
  } else if ('internal_error' in status) {
    return {
      type: 'internal_error',
      error: status.internal_error,
    };
  } else if ('triggered' in status) {
    return {
      type: 'triggered',
      result: status.triggered,
    };
  }
  throw Error(`Unknown trigger order status: ${JSON.stringify(status)}`);
}

function mapServerTriggerCriteria(
  criteria: TriggerServerTriggerCriteria,
): TriggerCriteria {
  if ('price_trigger' in criteria) {
    return {
      type: 'price',
      criteria: mapServerPriceTriggerCriteria(criteria.price_trigger),
    };
  }
  if ('time_trigger' in criteria) {
    return {
      type: 'time',
      criteria: mapServerTimeTriggerCriteria(criteria.time_trigger),
    };
  }
  throw new Error(`Unknown trigger criteria: ${JSON.stringify(criteria)}`);
}

function mapServerPriceTriggerCriteria(
  serverCriteria: TriggerServerPriceTriggerCriteria,
): PriceTriggerCriteria {
  const { price_requirement, dependency } = serverCriteria;

  const { type, triggerPrice } = ((): {
    type: PriceTriggerRequirementType;
    triggerPrice: string;
  } => {
    if ('price_above' in price_requirement) {
      return {
        type: 'oracle_price_above',
        triggerPrice: price_requirement.price_above,
      };
    } else if ('price_below' in price_requirement) {
      return {
        type: 'oracle_price_below',
        triggerPrice: price_requirement.price_below,
      };
    } else if ('last_price_above' in price_requirement) {
      return {
        type: 'last_price_above',
        triggerPrice: price_requirement.last_price_above,
      };
    } else if ('last_price_below' in price_requirement) {
      return {
        type: 'last_price_below',
        triggerPrice: price_requirement.last_price_below,
      };
    } else if ('mid_price_above' in price_requirement) {
      return {
        type: 'mid_price_above',
        triggerPrice: price_requirement.mid_price_above,
      };
    } else if ('mid_price_below' in price_requirement) {
      return {
        type: 'mid_price_below',
        triggerPrice: price_requirement.mid_price_below,
      };
    } else {
      throw new Error(
        `Unknown price requirement: ${JSON.stringify(price_requirement)}`,
      );
    }
  })();

  return {
    type,
    triggerPrice: removeDecimals(triggerPrice),
    dependency: dependency
      ? {
          digest: dependency.digest,
          onPartialFill: dependency.on_partial_fill,
        }
      : undefined,
  };
}

function mapServerTimeTriggerCriteria(
  serverCriteria: TriggerServerTimeTriggerCriteria,
): TimeTriggerCriteria {
  return {
    interval: toBigDecimal(serverCriteria.interval),
    amounts: serverCriteria.amounts?.map((amount: string) =>
      toBigDecimal(amount),
    ),
  };
}
