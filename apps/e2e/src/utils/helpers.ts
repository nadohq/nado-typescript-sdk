import { removeDecimals } from '@nadohq/shared';
import BigNumber from 'bignumber.js';

/** Whole tick (price_increment_x18 = 10^18): limit prices must land on integer units after x18 scaling */
export function alignPriceTick(price: BigNumber): BigNumber {
  return price.decimalPlaces(0, BigNumber.ROUND_HALF_UP);
}

/**
 * Trigger criteria mapper applies addDecimals to triggerPrice; removeDecimals pre-adjusts so the
 * value placed on the wire matches human-readable intent (see trigger-client / backend scaling).
 */
export function triggerPriceHuman(price: BigNumber): BigNumber {
  return removeDecimals(alignPriceTick(price));
}
