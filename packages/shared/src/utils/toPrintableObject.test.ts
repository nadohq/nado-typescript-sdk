import { describe, expect, it } from '@jest/globals';
import BigNumber from 'bignumber.js';
import { toPrintableObject } from './toPrintableObject';

describe('toPrintableObject', () => {
  it('replaces a self-referential array with a circular marker', () => {
    const input: unknown[] = [1];
    input.push(input);

    expect(toPrintableObject(input)).toEqual([1, '[Circular]']);
    expect(input[1]).toBe(input);
  });

  it('handles mutually recursive arrays', () => {
    const first: unknown[] = [];
    const second = [first];
    first.push(second);

    expect(toPrintableObject(first)).toEqual([['[Circular]']]);
  });

  it('handles an array cycle passing through an object', () => {
    const input: unknown[] = [];
    input.push({ parent: input });

    expect(toPrintableObject(input)).toEqual([{ parent: '[Circular]' }]);
  });

  it('formats nested values without changing the input', () => {
    const decimal = new BigNumber('12345678901234567890.125');
    const input = {
      values: [decimal, 12345678901234567890n, null, undefined],
      nested: { name: 'example', enabled: false, count: 0 },
    };

    expect(toPrintableObject(input)).toEqual({
      values: ['12345678901234567890.125', '12345678901234567890', null, null],
      nested: { name: 'example', enabled: false, count: 0 },
    });
    expect(input.values[0]).toBe(decimal);
    expect(input.values[3]).toBeUndefined();
  });

  it('keeps circular object and already-visited object handling', () => {
    const shared = { value: 1 };
    const input: Record<string, unknown> = { first: shared, second: shared };
    input.self = input;

    expect(toPrintableObject(input)).toEqual({
      first: { value: 1 },
      second: '[Circular]',
      self: '[Circular]',
    });
  });

  it('keeps the fallback for objects whose properties cannot be read', () => {
    const input = {
      get value(): unknown {
        throw new Error('Unavailable');
      },
    };

    expect(toPrintableObject(input)).toEqual({
      error: '[Unserializable Object]',
    });
  });

  it('preserves errors thrown while reading array elements', () => {
    const error = new Error('Unavailable');
    const input = Object.defineProperty([], '0', {
      get() {
        throw error;
      },
    });

    expect(() => toPrintableObject(input)).toThrow(error);
  });
});
