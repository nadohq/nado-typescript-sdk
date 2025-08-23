import { BigDecimal } from './bigDecimal';
import { BigDecimals } from './BigDecimals';

/**
 * Util function to sum BigDecimal values, inspired by Lodash
 * @param collection
 * @param iteratee
 */
export function sumBigDecimalBy<T>(
  collection: T[] | null | undefined,
  iteratee: (value: T) => BigDecimal.Value,
): BigDecimal {
  return (
    collection?.reduce((total, item) => {
      return total.plus(iteratee(item));
    }, BigDecimals.ZERO) ?? BigDecimals.ZERO
  );
}
