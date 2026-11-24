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

  it('marks circular objects but prints shared objects each time', () => {
    const shared = { value: 1 };
    const input: Record<string, unknown> = { first: shared, second: shared };
    input.self = input;

    expect(toPrintableObject(input)).toEqual({
      first: { value: 1 },
      second: { value: 1 },
      self: '[Circular]',
    });
  });

  it('prints an object shared by array elements each time', () => {
    const shared = { value: 1 };

    expect(toPrintableObject([shared, shared])).toEqual([
      { value: 1 },
      { value: 1 },
    ]);
  });

  it('prints a shared array each time', () => {
    const shared = [1, 2];

    expect(toPrintableObject({ first: shared, second: shared })).toEqual({
      first: [1, 2],
      second: [1, 2],
    });
  });

  it('marks the cycle inside every copy of a shared circular object', () => {
    const shared: Record<string, unknown> = { value: 1 };
    shared.self = shared;

    expect(toPrintableObject({ first: shared, second: shared })).toEqual({
      first: { value: 1, self: '[Circular]' },
      second: { value: 1, self: '[Circular]' },
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
