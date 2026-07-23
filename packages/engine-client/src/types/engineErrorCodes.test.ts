import { describe, expect, it } from '@jest/globals';
import { NADO_ERROR_CODES } from '@nadohq/shared';
import { ENGINE_ERROR_CODES, EngineErrorCode } from './engineErrorCodes';
import { EngineServerFailureError } from './EngineServerFailureError';
import type { EngineServerExecuteFailureResult } from './serverExecuteTypes';
import type { EngineServerQueryFailureResponse } from './serverQueryTypes';

describe('ENGINE_ERROR_CODES', () => {
  it('inlines every shared NADO_ERROR_CODES entry', () => {
    for (const [name, value] of Object.entries(NADO_ERROR_CODES)) {
      expect(ENGINE_ERROR_CODES[name as keyof typeof ENGINE_ERROR_CODES]).toBe(
        value,
      );
    }
  });

  it('is exhaustively typed as a const object', () => {
    const code: EngineErrorCode = ENGINE_ERROR_CODES.INVALID_SIGNER;
    expect(typeof code).toBe('number');
  });
});

describe('EngineServerFailureError', () => {
  it('exposes errorCode and requestType for an /execute failure envelope', () => {
    const failure: EngineServerExecuteFailureResult = {
      status: 'failure',
      signature: '0xdeadbeef',
      error: 'Invalid signer',
      error_code: ENGINE_ERROR_CODES.INVALID_SIGNER,
      request_type: 'execute_place_order',
    };

    const error = new EngineServerFailureError(failure);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('EngineServerFailureError');
    expect(error.errorCode).toBe(ENGINE_ERROR_CODES.INVALID_SIGNER);
    expect(error.requestType).toBe('execute_place_order');
    expect(error.responseData).toBe(failure);
    expect(error.message).toBe(
      `${ENGINE_ERROR_CODES.INVALID_SIGNER}: Invalid signer`,
    );
  });

  it('exposes errorCode and leaves requestType undefined for a /query failure envelope', () => {
    const failure: EngineServerQueryFailureResponse = {
      status: 'failure',
      error: 'Service unavailable',
      error_code: ENGINE_ERROR_CODES.SERVICE_UNAVAILABLE,
    };

    const error = new EngineServerFailureError(failure);

    expect(error.errorCode).toBe(ENGINE_ERROR_CODES.SERVICE_UNAVAILABLE);
    expect(error.requestType).toBeUndefined();
    expect(error.responseData).toBe(failure);
  });
});
