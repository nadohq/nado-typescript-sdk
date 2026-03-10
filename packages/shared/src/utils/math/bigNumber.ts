import BigNumber from 'bignumber.js';

/**
 * BigNumber is the type from `bignumber.js`.
 * Includes valid values & instances for BigNumber.
 *
 * @see https://mikemcl.github.io/bignumber.js/
 */
export type BigNumberish = BigNumber | BigNumber.Value | bigint;

/**
 * Converts a value to an instance of BigNumber
 *
 * @param val
 */
export function toBigNumber(val: BigNumberish): BigNumber {
  if (BigNumber.isBigNumber(val)) {
    return val;
  }

  const bnConstructorVal = (() => {
    if (typeof val === 'string' || typeof val === 'number') {
      return val;
    } else if (typeof val === 'bigint') {
      return val.toString();
    }
    // This is unlikely to occur, but it's here for completeness. Uses the suggestion here: https://typescript-eslint.io/rules/no-base-to-string/#alternatives
    return JSON.stringify(val);
  })();
  try {
    return new BigNumber(bnConstructorVal);
  } catch {
    // bignumber.js v10 throws an error if the value is invalid, but we want to return NaN in that case
    // https://github.com/MikeMcl/bignumber.js/issues/402
    return new BigNumber(Number.NaN);
  }
}
