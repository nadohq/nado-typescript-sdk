import { describe, expect, it } from '@jest/globals';
import {
  addressAt,
  arrayAt,
  calendarDateAt,
  decimalStringAt,
  enumAt,
  integerAt,
  isoTimestampAt,
  NuanzeSchemaViolationError,
  nullableAt,
  objectAt,
  stringAt,
} from './schema';

/**
 * Asserts a validator rejects a value, and that the violation names the field.
 *
 * The pointer is what makes a contract failure diagnosable, so it is checked
 * rather than only the fact that something threw.
 */
function expectViolation(run: () => unknown, pointer: string): void {
  expect(run).toThrow(NuanzeSchemaViolationError);
  try {
    run();
  } catch (error) {
    expect((error as NuanzeSchemaViolationError).pointer).toBe(pointer);
    expect((error as Error).message).toContain(pointer);
  }
}

describe('schema', () => {
  describe('objectAt', () => {
    it('accepts a plain object', () => {
      expect(objectAt({ a: 1 }, 'body')).toEqual({ a: 1 });
    });

    it('rejects arrays, null, and primitives', () => {
      expectViolation(() => objectAt([], 'body'), 'body');
      expectViolation(() => objectAt(null, 'body'), 'body');
      expectViolation(() => objectAt('{}', 'body'), 'body');
      expectViolation(() => objectAt(undefined, 'body'), 'body');
    });

    it('describes what it received, to make a proxy page obvious', () => {
      expect(() => objectAt('<html>', 'body')).toThrow(/received string/);
      expect(() => objectAt([], 'body')).toThrow(/received an array/);
      expect(() => objectAt(null, 'body')).toThrow(/received null/);
    });
  });

  describe('arrayAt', () => {
    it('accepts an empty array, since an empty result set is valid', () => {
      expect(arrayAt([], 'body.markets')).toEqual([]);
    });

    it('rejects a non-array', () => {
      expectViolation(() => arrayAt({}, 'body.markets'), 'body.markets');
    });
  });

  describe('stringAt', () => {
    it('accepts any string, including an empty one', () => {
      expect(stringAt('', 'body.symbol')).toBe('');
    });

    it('rejects a non-string', () => {
      expectViolation(() => stringAt(4, 'body.symbol'), 'body.symbol');
    });
  });

  describe('integerAt', () => {
    it('accepts a safe integer, including zero', () => {
      expect(integerAt(0, 'body.count')).toBe(0);
      expect(integerAt(Number.MAX_SAFE_INTEGER, 'body.count')).toBe(
        Number.MAX_SAFE_INTEGER,
      );
    });

    it('rejects a fraction, a numeric string, and a value beyond safe range', () => {
      expectViolation(() => integerAt(1.5, 'body.count'), 'body.count');
      expectViolation(() => integerAt('4', 'body.count'), 'body.count');
      expectViolation(
        () => integerAt(Number.MAX_SAFE_INTEGER + 2, 'body.count'),
        'body.count',
      );
      expectViolation(() => integerAt(Number.NaN, 'body.count'), 'body.count');
    });
  });

  describe('enumAt', () => {
    const venues = ['perp', 'spot'] as const;

    it('accepts a documented member', () => {
      expect(enumAt('perp', venues, 'body.venue')).toBe('perp');
    });

    it('rejects a member the contract does not declare', () => {
      expectViolation(
        () => enumAt('options', venues, 'body.venue'),
        'body.venue',
      );
      expect(() => enumAt('options', venues, 'body.venue')).toThrow(
        /expected one of perp, spot/,
      );
    });

    it('rejects a differently cased member', () => {
      expectViolation(() => enumAt('PERP', venues, 'body.venue'), 'body.venue');
    });
  });

  describe('decimalStringAt', () => {
    it('accepts finite base-10 decimals, signed and fractional', () => {
      for (const value of ['0', '-0', '1', '-1.5', '27613524.82493527']) {
        expect(decimalStringAt(value, 'body.minSize')).toBe(value);
      }
    });

    it('rejects notations that would silently lose precision or meaning', () => {
      for (const value of [
        '1,5',
        '1e18',
        'Infinity',
        'NaN',
        '',
        '0x10',
        '01',
        '1.',
      ]) {
        expectViolation(
          () => decimalStringAt(value, 'body.minSize'),
          'body.minSize',
        );
      }
    });

    it('rejects a number, since JSON floats cannot hold exact decimals', () => {
      expectViolation(
        () => decimalStringAt(0.1, 'body.minSize'),
        'body.minSize',
      );
    });
  });

  describe('isoTimestampAt', () => {
    it('accepts a UTC timestamp with or without fractional seconds', () => {
      expect(isoTimestampAt('2026-08-19T10:42:10Z', 'body.asOf')).toBe(
        '2026-08-19T10:42:10Z',
      );
      expect(isoTimestampAt('2026-08-19T10:42:10.145Z', 'body.asOf')).toBe(
        '2026-08-19T10:42:10.145Z',
      );
    });

    it('rejects a local time, an offset, or an impossible instant', () => {
      for (const value of [
        '2026-08-19 10:42:10',
        '2026-08-19T10:42:10',
        '2026-08-19T10:42:10+02:00',
        '2026-08-19T25:42:10Z',
        '2026-13-19T10:42:10Z',
      ]) {
        expectViolation(() => isoTimestampAt(value, 'body.asOf'), 'body.asOf');
      }
    });
  });

  describe('calendarDateAt', () => {
    it('accepts a calendar day', () => {
      expect(calendarDateAt('2026-08-19', 'body.day')).toBe('2026-08-19');
    });

    it('rejects a timestamp or a partial date', () => {
      expectViolation(
        () => calendarDateAt('2026-08-19T00:00:00Z', 'body.day'),
        'body.day',
      );
      expectViolation(
        () => calendarDateAt('2026-8-19', 'body.day'),
        'body.day',
      );
    });
  });

  describe('addressAt', () => {
    it('accepts a lowercase EVM address', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(addressAt(address, 'body.wallet')).toBe(address);
    });

    it('rejects a checksummed address, since the API normalizes to lowercase', () => {
      expectViolation(
        () =>
          addressAt(
            '0xB92EFCF519EDC2F1FE60B4491EF51D97ED4D7685',
            'body.wallet',
          ),
        'body.wallet',
      );
    });

    it('rejects a wrong-length or unprefixed value', () => {
      expectViolation(() => addressAt('0x1234', 'body.wallet'), 'body.wallet');
      expectViolation(
        () =>
          addressAt('1234567890abcdef1234567890abcdef12345678', 'body.wallet'),
        'body.wallet',
      );
    });
  });

  describe('nullableAt', () => {
    it('passes null through without running the validator', () => {
      expect(nullableAt(null, 'body.openInterest', decimalStringAt)).toBeNull();
    });

    it('applies the validator to a present value', () => {
      expect(nullableAt('1.5', 'body.openInterest', decimalStringAt)).toBe(
        '1.5',
      );
    });

    it('rejects a missing key, which is not the same as an explicit null', () => {
      expectViolation(
        () => nullableAt(undefined, 'body.openInterest', decimalStringAt),
        'body.openInterest',
      );
      expect(() =>
        nullableAt(undefined, 'body.openInterest', decimalStringAt),
      ).toThrow(/received undefined/);
    });

    it('propagates the inner violation for a malformed present value', () => {
      expectViolation(
        () => nullableAt('1,5', 'body.openInterest', decimalStringAt),
        'body.openInterest',
      );
    });
  });
});
