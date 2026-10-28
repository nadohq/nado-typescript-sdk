import { BigNumberish, toBigNumber } from './bigNumber';

/**
 * Converts a BigNumberish value to an integer string, rounding any fractional
 * part to the nearest integer (bignumber.js `.toFixed(0)` default rounding mode).
 *
 * @param val
 */
export function toIntegerString(val: BigNumberish): string {
  // toFixed is required as toString gives values with `e`
  return toBigNumber(val).toFixed(0);
}
