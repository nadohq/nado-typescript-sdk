import type BigDecimal from 'bignumber.js';

import { toBigDecimal } from './bigDecimal';

export const BigDecimals: Readonly<{
  ZERO: BigDecimal;
  ONE: BigDecimal;
  INF: BigDecimal;
  MAX_I128: BigDecimal;
}> = Object.freeze({
  ZERO: toBigDecimal(0),
  ONE: toBigDecimal(1),
  INF: toBigDecimal(Infinity),
  MAX_I128: toBigDecimal('170141183460469231731687303715884105727'),
});
