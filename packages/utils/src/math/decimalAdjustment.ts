import { BigDecimal, BigDecimalish, toBigDecimal } from './bigDecimal';

/**
 * All Nado balances have 18 decimals. Ex. 1e18 = 1.0
 */
export const NADO_PRODUCT_DECIMALS = 18;

/**
 * Determines the result type after adjusting decimals based on the input type `T`.
 *
 * - If `T` is `undefined`, the result is `undefined`.
 * - If `T` is a `number`, the result is a `number`.
 * - Otherwise, the result is a `BigDecimal`.
 */
type AdjustDecimalsResult<T extends BigDecimalish | undefined> =
  T extends undefined ? undefined : T extends number ? number : BigDecimal;

/**
 * Adds the specified # of decimals to the number. For example, value = 1, decimals = 2, returns 100.
 *
 * @param value can be undefined for better developer experience. If undefined, returns undefined.
 * @param decimals number of decimal places to add, defaults to 18, which is the standard within Nado
 */

export function addDecimals<T extends BigDecimalish | undefined>(
  value: T,
  decimals: number = NADO_PRODUCT_DECIMALS,
): AdjustDecimalsResult<T> {
  const getResult = () => {
    if (value == null) {
      return undefined;
    }

    const adjustedValue = toBigDecimal(value).multipliedBy(
      toBigDecimal(10).pow(decimals),
    );
    return typeof value === 'number' ? adjustedValue.toNumber() : adjustedValue;
  };

  return getResult() as AdjustDecimalsResult<T>;
}

/**
 * Removes the specified # of decimals from the number. For example, value = 100, decimals = 2, returns 1.
 *
 * @param value can be undefined for better developer experience. If undefined, returns undefined.
 * @param decimals number of decimal places to remove, defaults to 18, which is the standard within Nado
 */
export function removeDecimals<T extends BigDecimalish | undefined>(
  value: T,
  decimals: number = NADO_PRODUCT_DECIMALS,
): AdjustDecimalsResult<T> {
  const getResult = () => {
    if (value == null) {
      return undefined;
    }

    const adjustedValue = toBigDecimal(value).dividedBy(
      toBigDecimal(10).pow(decimals),
    );
    return typeof value === 'number' ? adjustedValue.toNumber() : adjustedValue;
  };

  return getResult() as AdjustDecimalsResult<T>;
}
