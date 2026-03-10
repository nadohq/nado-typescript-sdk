import BigNumber from 'bignumber.js';
import { BigNumbers } from './BigNumbers';

/**
 * Util function to sum BigNumber values, inspired by Lodash
 * @param collection
 * @param iteratee
 */
export function sumBigNumberBy<T>(
  collection: T[] | null | undefined,
  iteratee: (value: T) => BigNumber.Value,
): BigNumber {
  return (
    collection?.reduce((total, item) => {
      return total.plus(iteratee(item));
    }, BigNumbers.ZERO) ?? BigNumbers.ZERO
  );
}
