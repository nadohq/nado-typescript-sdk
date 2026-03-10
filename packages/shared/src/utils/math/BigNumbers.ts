import { toBigNumber } from './bigNumber';

export const BigNumbers = Object.freeze({
  ZERO: toBigNumber(0),
  ONE: toBigNumber(1),
  INF: toBigNumber(Infinity),
  MAX_I128: toBigNumber('170141183460469231731687303715884105727'),
});
