import { BigNumberish } from './bigNumber';
import { toIntegerString } from './toIntegerString';

/**
 * Converts a BigNumberish value to bigint
 *
 * @param val
 */
export function toBigInt(val: BigNumberish): bigint {
  return BigInt(toIntegerString(val));
}
