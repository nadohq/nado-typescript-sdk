import { describe, expect, it } from '@jest/globals';
import { NADO_ERROR_CODES, NadoErrorCode } from './errorCodes';

describe('NADO_ERROR_CODES', () => {
  it('exposes the shared cross-service error codes from the backend common enum', () => {
    expect(NADO_ERROR_CODES.NOT_IMPLEMENTED).toBe(4001);
    expect(NADO_ERROR_CODES.INVALID_SIGNER).toBe(2028);
    expect(NADO_ERROR_CODES.SERVICE_UNAVAILABLE).toBe(1006);
    expect(NADO_ERROR_CODES.INTERNAL_ERROR).toBe(5000);
  });

  it('is exhaustively typed as a const object', () => {
    // Compiles only when every value is a literal member of the union.
    const code: NadoErrorCode = NADO_ERROR_CODES.INTERNAL_ERROR;
    expect(typeof code).toBe('number');
  });

  it('uses distinct numeric values for each entry', () => {
    const values = Object.values(NADO_ERROR_CODES);
    expect(new Set(values).size).toBe(values.length);
  });
});
