import { describe, expect, it } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { addDecimals, removeDecimals } from './decimalAdjustment';

describe('removeDecimals', () => {
  it('preserves null and its return type', () => {
    const result: null = removeDecimals(null);
    expect(result).toBeNull();
  });

  it('preserves undefined and its return type', () => {
    const result: undefined = removeDecimals(undefined);
    expect(result).toBeUndefined();
  });

  it.each([0, 12345, -12345])(
    'keeps numeric input %s as a number with custom decimals',
    (value) => {
      const result: number = removeDecimals(value, 2);
      expect(result).toBe(value / 100);
    },
  );

  it.each([
    '12345678901234567890123',
    12345678901234567890123n,
    new BigNumber('12345678901234567890123'),
  ])('preserves x18 precision for %s', (value) => {
    const result: BigNumber = removeDecimals(value);
    expect(result.toFixed()).toBe('12345.678901234567890123');
  });

  it('preserves the distinction between missing, null, and zero prices', () => {
    const prices: Array<string | null | undefined> = [undefined, null, '0'];
    const results: Array<BigNumber | null | undefined> = prices.map((price) =>
      removeDecimals(price),
    );
    expect(results[0]).toBeUndefined();
    expect(results[1]).toBeNull();
    expect(results[2]?.isZero()).toBe(true);
  });
});

describe('addDecimals', () => {
  it('preserves null and its return type', () => {
    const result: null = addDecimals(null);
    expect(result).toBeNull();
  });

  it('preserves undefined and its return type', () => {
    const result: undefined = addDecimals(undefined);
    expect(result).toBeUndefined();
  });

  it.each([0, 1.25, -1.25])(
    'keeps numeric input %s as a number with custom decimals',
    (value) => {
      const result: number = addDecimals(value, 2);
      expect(result).toBe(value * 100);
    },
  );

  it.each([
    '12345.678901234567890123',
    new BigNumber('12345.678901234567890123'),
  ])('preserves precision when converting %s to x18 units', (value) => {
    const result: BigNumber = addDecimals(value);
    expect(result.toFixed()).toBe('12345678901234567890123');
  });

  it('scales bigint values without losing precision', () => {
    const result: BigNumber = addDecimals(12345678901234567890123n, 2);
    expect(result.toFixed()).toBe('1234567890123456789012300');
  });

  it('preserves the distinction between missing, null, and zero values', () => {
    const values: Array<string | null | undefined> = [undefined, null, '0'];
    const results: Array<BigNumber | null | undefined> = values.map((value) =>
      addDecimals(value),
    );
    expect(results[0]).toBeUndefined();
    expect(results[1]).toBeNull();
    expect(results[2]?.isZero()).toBe(true);
  });
});
