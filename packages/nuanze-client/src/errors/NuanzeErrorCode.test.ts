import { describe, expect, it } from '@jest/globals';
import {
  isNuanzeErrorCode,
  NUANZE_ERROR_CODES,
  type NuanzeErrorCode,
} from './NuanzeErrorCode';

describe('isNuanzeErrorCode', () => {
  it('narrows every code this release documents', () => {
    for (const code of NUANZE_ERROR_CODES) {
      expect(isNuanzeErrorCode(code)).toBe(true);
    }
  });

  it('treats a code from a newer API release as unknown, not invalid', () => {
    // The union is open at the boundary: an unrecognized code still reaches the
    // caller on `NuanzeApiError`, and this guard is how they tell the difference.
    expect(isNuanzeErrorCode('JURISDICTION_BLOCKED')).toBe(false);
  });

  it('rejects non-string candidates', () => {
    for (const candidate of [undefined, null, 500, {}, ['BAD_REQUEST']]) {
      expect(isNuanzeErrorCode(candidate)).toBe(false);
    }
  });

  it('is case- and whitespace-sensitive', () => {
    expect(isNuanzeErrorCode('bad_request')).toBe(false);
    expect(isNuanzeErrorCode(' BAD_REQUEST')).toBe(false);
  });

  it('publishes a frozen list with no duplicates', () => {
    expect(Object.isFrozen(NUANZE_ERROR_CODES)).toBe(true);
    expect(new Set(NUANZE_ERROR_CODES).size).toBe(NUANZE_ERROR_CODES.length);
  });

  it('covers the codes the transport and rate limiter depend on', () => {
    const required: NuanzeErrorCode[] = [
      'BAD_REQUEST',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
      'GATEWAY_TIMEOUT',
      'DEPENDENCY_UNAVAILABLE',
    ];

    for (const code of required) {
      expect(NUANZE_ERROR_CODES).toContain(code);
    }
  });
});
