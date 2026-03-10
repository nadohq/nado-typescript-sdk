import BigNumber from 'bignumber.js';

interface ClampOptions {
  // Inclusive minimum value
  min?: BigNumber;
  // Inclusive maximum value
  max?: BigNumber;
}

/**
 * Clamps a value between optional minimum and maximum values.
 *
 * @param val
 * @param opts Clamp options
 */
export function clampBigNumber(val: BigNumber, opts: ClampOptions): BigNumber {
  if (opts.min != null && val.lt(opts.min)) {
    return opts.min;
  } else if (opts.max != null && val.gt(opts.max)) {
    return opts.max;
  }
  return val;
}
