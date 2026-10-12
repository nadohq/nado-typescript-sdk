import { describe, expect, it } from '@jest/globals';
import { isValidMobileBio, MOBILE_BIO_MAX_LENGTH } from './profile';

describe('isValidMobileBio', () => {
  it('accepts empty and whitespace-only biographies', () => {
    expect(isValidMobileBio('')).toBe(true);
    expect(isValidMobileBio(' \n\t ')).toBe(true);
  });

  it('counts Unicode code points rather than UTF-16 code units', () => {
    expect(isValidMobileBio('😀'.repeat(MOBILE_BIO_MAX_LENGTH))).toBe(true);
    expect(isValidMobileBio('😀'.repeat(MOBILE_BIO_MAX_LENGTH + 1))).toBe(
      false,
    );
    expect(isValidMobileBio('a'.repeat(MOBILE_BIO_MAX_LENGTH + 1))).toBe(false);
  });

  it('rejects null characters without rejecting line breaks', () => {
    expect(isValidMobileBio('hello\0world')).toBe(false);
    expect(isValidMobileBio('hello\nworld')).toBe(true);
  });
});
