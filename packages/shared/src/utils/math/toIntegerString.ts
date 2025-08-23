import { BigDecimalish, toBigDecimal } from './bigDecimal';

/**
 * Converts a BigDecimalish value to string
 *
 * @param val
 */
export function toIntegerString(val: BigDecimalish): string {
  // toFixed is required as toString gives values with `e`
  return toBigDecimal(val).toFixed(0);
}
