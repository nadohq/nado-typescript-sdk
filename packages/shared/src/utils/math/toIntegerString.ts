import { BigNumberish, toBigNumber } from './bigNumber';

/**
 * Converts a BigNumberish value to string
 *
 * @param val
 */
export function toIntegerString(val: BigNumberish): string {
  // toFixed is required as toString gives values with `e`
  return toBigNumber(val).toFixed(0);
}
