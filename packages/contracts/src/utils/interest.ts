import {
  BigDecimal,
  BigDecimalish,
  BigDecimals,
  removeDecimals,
  TimeInSeconds,
  toBigDecimal,
} from '@nadohq/utils';
import { SpotProduct } from '../common';

/**
 * Calculate amount total borrowed for a product
 */
export function calcTotalBorrowed(
  totalBorrowsNormalized: BigDecimalish,
  cumulativeBorrowsMultiplierX18: BigDecimalish,
): BigDecimal {
  return toBigDecimal(totalBorrowsNormalized).multipliedBy(
    removeDecimals(cumulativeBorrowsMultiplierX18),
  );
}

/**
 * Calculate amount total deposited for a product.
 */
export function calcTotalDeposited(
  totalDepositsNormalized: BigDecimalish,
  cumulativeDepositsMultiplierX18: BigDecimalish,
): BigDecimal {
  return toBigDecimal(totalDepositsNormalized).multipliedBy(
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
    return toBigDecimal(0);
  }
  return product.totalBorrowed.abs().div(product.totalDeposited);
}

/**
 * Calculates per-second borrow interest rate for a product. For example, a returned rate of 0.1 indicates 10% borrower
 * interest. The calculation for interest rate is as follows:
 *
 * If utilization ratio > inflection:
 *  annual rate = (1 - utilization ratio) / (1 - inflection) * interestLargeCap + interestFloor + interestSmallCap
 *
 * If utilization ratio < inflection:
 *  annual rate = utilization * interestSmallCap / inflection + utilization
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
    return toBigDecimal(0);
  }
  const pastInflection = utilization.gt(interestInflectionUtil);

  let annualRate: BigDecimal;
  if (pastInflection) {
    const utilizationTerm = interestLargeCap.times(
      toBigDecimal(utilization)
        .minus(interestInflectionUtil)
        .div(BigDecimals.ONE.minus(interestInflectionUtil)),
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
  seconds: BigDecimalish,
  minDepositRate: BigDecimalish,
) {
  const borrowRatePerSecond = calcBorrowRatePerSecond(product);

  // Convert to number for this, with some loss of precision, but using `.pow()` causes us to hit browser resource limits
  const borrowRateForTime =
    borrowRatePerSecond.plus(1).toNumber() ** toBigDecimal(seconds).toNumber() -
    1;
  return toBigDecimal(borrowRateForTime).plus(toBigDecimal(minDepositRate));
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
  seconds: BigDecimalish,
  interestFeeFrac: BigDecimalish,
  minDepositRate: BigDecimalish,
) {
  const utilization = calcUtilizationRatio(product);
  if (utilization.eq(0)) {
    return toBigDecimal(0);
  }
  return utilization
    .times(calcBorrowRateForTimeRange(product, seconds, toBigDecimal(0)))
    .times(BigDecimals.ONE.minus(toBigDecimal(interestFeeFrac)))
    .plus(toBigDecimal(minDepositRate));
}
