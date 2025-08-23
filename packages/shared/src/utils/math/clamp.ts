import { BigDecimal } from './bigDecimal';

interface ClampOptions {
  // Inclusive minimum value
  min?: BigDecimal;
  // Inclusive maximum value
  max?: BigDecimal;
}

/**
 * Clamps a value between optional minimum and maximum values.
 *
 * @param val
 * @param opts Clamp options
 */
export function clampBigDecimal(
  val: BigDecimal,
  opts: ClampOptions,
): BigDecimal {
  if (opts.min != null && val.lt(opts.min)) {
    return opts.min;
  } else if (opts.max != null && val.gt(opts.max)) {
    return opts.max;
  }
  return val;
}
