import { toBigNumber, toIntegerString } from '@nadohq/shared';
import BigNumber from 'bignumber.js';

/**
 * Rounds a human-readable price to the nearest whole unit. Required because
 * price_increment_x18 = 10^18 — after x18 scaling, prices must land on integer
 * multiples of 10^18, i.e. whole-unit increments in human terms.
 */
export function alignPriceTick(price: BigNumber): BigNumber {
  return toBigNumber(toIntegerString(price));
}
