import BigNumber from 'bignumber.js';
import { SpotProduct } from '../types/productTypes';
import { BigNumberish, BigNumbers, removeDecimals, toBigNumber } from './math';
import { TimeInSeconds } from './time';

/**
 * Calculate amount total borrowed for a product
 */
export function calcTotalBorrowed(
  totalBorrowsNormalized: BigNumberish,
  cumulativeBorrowsMultiplierX18: BigNumberish,
): BigNumber {
  return toBigNumber(totalBorrowsNormalized).multipliedBy(
    removeDecimals(cumulativeBorrowsMultiplierX18),
  );
}

/**
 * Calculate amount total deposited for a product.
 */
export function calcTotalDeposited(
  totalDepositsNormalized: BigNumberish,
  cumulativeDepositsMultiplierX18: BigNumberish,
): BigNumber {
  return toBigNumber(totalDepositsNormalized).multipliedBy(
    removeDecimals(cumulativeDepositsMultiplierX18),
  );
}

/**
 * Calculates utilization ratio = abs(total borrowed / total deposited)
 *
 * @param product Spot product
 */
export function calcUtilizationRatio(product: SpotProduct) {
  if (product.totalDeposited.eq(0) || product.totalBorrowed.eq(0)) {
    return toBigNumber(0);
  }
  return product.totalBorrowed.abs().div(product.totalDeposited);
}

/**
 * Calculates per-second borrow interest rate for a product. For example, a returned rate of 0.1 indicates 10% borrower
 * interest. The calculation for interest rate is as follows:
 *
 * If utilization ratio > inflection:
 * annual rate = (utilization ratio - inflection) / (1 - inflection) * interestLargeCap + interestFloor + interestSmallCap
 *
 * If utilization ratio <= inflection:
 * annual rate = utilization ratio * interestSmallCap / inflection + interestFloor
 *
 * The returned rate is annual rate / 31536000 seconds per year.
 *
 * @param product Spot product
 */
export function calcBorrowRatePerSecond(product: SpotProduct) {
  const {
    interestFloor,
    interestInflectionUtil,
    interestSmallCap,
    interestLargeCap,
  } = product;
  const utilization = calcUtilizationRatio(product);
  if (utilization.eq(0)) {
    return toBigNumber(0);
  }
  const pastInflection = utilization.gt(interestInflectionUtil);

  let annualRate: BigNumber;
  if (pastInflection) {
    const utilizationTerm = interestLargeCap.times(
      toBigNumber(utilization)
        .minus(interestInflectionUtil)
        .div(BigNumbers.ONE.minus(interestInflectionUtil)),
    );
    annualRate = interestFloor.plus(interestSmallCap).plus(utilizationTerm);
  } else {
    const utilizationTerm = utilization
      .div(interestInflectionUtil)
      .times(interestSmallCap);
    annualRate = interestFloor.plus(utilizationTerm);
  }

  return annualRate.div(TimeInSeconds.YEAR);
}

/**
 * Calculates borrower interest rate compounded for a period of time.
 *
 * @param product Spot product
 * @param seconds Number of seconds for the time period
 */
export function calcBorrowRateForTimeRange(
  product: SpotProduct,
  seconds: BigNumberish,
  minDepositRate: BigNumberish,
) {
  const borrowRatePerSecond = calcBorrowRatePerSecond(product);

  // Convert to number for this, with some loss of precision, but using `.pow()` causes us to hit browser resource limits
  const borrowRateForTime =
    borrowRatePerSecond.plus(1).toNumber() ** toBigNumber(seconds).toNumber() -
    1;
  return toBigNumber(borrowRateForTime).plus(toBigNumber(minDepositRate));
}

/**
 * Calculate depositor interest rate compounded for a period of time.
 *
 * @param product Spot product
 * @param seconds Number of seconds for the time period
 * @param interestFeeFrac Fraction of paid borrower interest that is paid as a fee (0.2 = 20% fee)
 */
export function calcRealizedDepositRateForTimeRange(
  product: SpotProduct,
  seconds: BigNumberish,
  interestFeeFrac: BigNumberish,
  minDepositRate: BigNumberish,
) {
  const utilization = calcUtilizationRatio(product);
  if (utilization.eq(0)) {
    return toBigNumber(0);
  }
  return utilization
    .times(calcBorrowRateForTimeRange(product, seconds, toBigNumber(0)))
    .times(BigNumbers.ONE.minus(toBigNumber(interestFeeFrac)))
    .plus(toBigNumber(minDepositRate));
}
