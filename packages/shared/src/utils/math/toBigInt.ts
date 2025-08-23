import { BigDecimalish } from './bigDecimal';
import { toIntegerString } from './toIntegerString';

/**
 * Converts a BigDecimalish value to bigint
 *
 * @param val
 */
export function toBigInt(val: BigDecimalish): bigint {
  return BigInt(toIntegerString(val));
}
