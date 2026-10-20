import { describe, expect, it } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { SpotProduct } from '../types/productTypes';
import {
  calcBorrowRateForTimeRange,
  calcBorrowRatePerSecond,
  calcRealizedDepositRateForTimeRange,
} from './interest';
import { TimeInSeconds } from './time';

const MIN_DEPOSIT_RATE = 0.05;

function spotProduct(overrides: Partial<SpotProduct> = {}) {
  return {
    interestFloor: new BigNumber(0.01),
    interestInflectionUtil: new BigNumber(0.8),
    interestSmallCap: new BigNumber(0.04),
    interestLargeCap: new BigNumber(0.4),
    minDepositRate: new BigNumber(MIN_DEPOSIT_RATE),
    totalDeposited: new BigNumber(1_000_000),
    totalBorrowed: new BigNumber(-500_000),
    ...overrides,
  } as SpotProduct;
}

/**
 * `SpotEngine._updateState` compounds the min deposit rate over the period and
 * multiplies it into the borrow multiplier, rather than adding the annual rate.
 */
function onChainBorrowRate(product: SpotProduct, seconds: number) {
  const borrowRatePerSecond = calcBorrowRatePerSecond(product).toNumber();
  const minDepositRatePerSecond = MIN_DEPOSIT_RATE / TimeInSeconds.YEAR;
  return (
    (1 + borrowRatePerSecond) ** seconds *
      (1 + minDepositRatePerSecond) ** seconds -
    1
  );
}

describe('interest', () => {
  const periods: [string, number][] = [
    ['an hour', TimeInSeconds.HOUR],
    ['a day', TimeInSeconds.DAY],
    ['thirty days', TimeInSeconds.DAY * 30],
    ['a year', TimeInSeconds.YEAR],
  ];

  describe('calcBorrowRateForTimeRange', () => {
    it.each(periods)(
      'compounds the min deposit rate over %s rather than adding it',
      (_label, seconds) => {
        const product = spotProduct();
        expect(
          calcBorrowRateForTimeRange(
            product,
            seconds,
            product.minDepositRate,
          ).toNumber(),
        ).toBeCloseTo(onChainBorrowRate(product, seconds), 10);
      },
    );

    it('stays below the annual min deposit rate for a short period', () => {
      const product = spotProduct();
      // Adding the annual rate unscaled put an hour of borrowing above 5%.
      expect(
        calcBorrowRateForTimeRange(
          product,
          TimeInSeconds.HOUR,
          product.minDepositRate,
        ).toNumber(),
      ).toBeLessThan(MIN_DEPOSIT_RATE / 100);
    });

    it('returns only the borrow rate when there is no min deposit rate', () => {
      const product = spotProduct();
      const borrowRatePerSecond = calcBorrowRatePerSecond(product).toNumber();
      expect(
        calcBorrowRateForTimeRange(product, TimeInSeconds.DAY, 0).toNumber(),
      ).toBeCloseTo((1 + borrowRatePerSecond) ** TimeInSeconds.DAY - 1, 12);
    });
  });

  describe('calcRealizedDepositRateForTimeRange', () => {
    it('still pays the min deposit rate when nothing is borrowed', () => {
      const product = spotProduct({ totalBorrowed: new BigNumber(0) });
      const expected =
        (1 + MIN_DEPOSIT_RATE / TimeInSeconds.YEAR) ** TimeInSeconds.DAY - 1;
      expect(
        calcRealizedDepositRateForTimeRange(
          product,
          TimeInSeconds.DAY,
          0.2,
          product.minDepositRate,
        ).toNumber(),
      ).toBeCloseTo(expected, 12);
    });

    it('compounds the min deposit rate on top of the realized rate', () => {
      const product = spotProduct();
      const seconds = TimeInSeconds.DAY;
      const utilization = 0.5;
      const borrowRate = calcBorrowRateForTimeRange(
        product,
        seconds,
        0,
      ).toNumber();
      const realized = utilization * borrowRate * (1 - 0.2);
      const expected =
        (1 + realized) *
          (1 + MIN_DEPOSIT_RATE / TimeInSeconds.YEAR) ** seconds -
        1;
      expect(
        calcRealizedDepositRateForTimeRange(
          product,
          seconds,
          0.2,
          product.minDepositRate,
        ).toNumber(),
      ).toBeCloseTo(expected, 12);
    });
  });
});
