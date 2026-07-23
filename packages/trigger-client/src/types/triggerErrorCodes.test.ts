import { describe, expect, it } from '@jest/globals';
import type { EngineServerExecuteFailureResult } from '@nadohq/engine-client';
import { NADO_ERROR_CODES } from '@nadohq/shared';
import type { TriggerServerQueryFailureResponse } from './serverQueryTypes';
import { TRIGGER_ERROR_CODES, TriggerErrorCode } from './triggerErrorCodes';
import { TriggerServerFailureError } from './TriggerServerFailureError';

describe('TRIGGER_ERROR_CODES', () => {
  it('inlines every shared NADO_ERROR_CODES entry', () => {
    for (const [name, value] of Object.entries(NADO_ERROR_CODES)) {
      expect(
        TRIGGER_ERROR_CODES[name as keyof typeof TRIGGER_ERROR_CODES],
      ).toBe(value);
    }
  });

  it('is exhaustively typed as a const object', () => {
    const code: TriggerErrorCode = TRIGGER_ERROR_CODES.INVALID_SIGNER;
    expect(typeof code).toBe('number');
  });
});

describe('TriggerServerFailureError', () => {
  it('exposes errorCode and requestType for an /execute failure envelope', () => {
    const failure: EngineServerExecuteFailureResult = {
      status: 'failure',
      signature: '0xdeadbeef',
      error: 'Invalid signer',
      error_code: TRIGGER_ERROR_CODES.INVALID_SIGNER,
      request_type: 'execute_place_order',
    };

    const error = new TriggerServerFailureError(failure);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TriggerServerFailureError');
    expect(error.errorCode).toBe(TRIGGER_ERROR_CODES.INVALID_SIGNER);
    expect(error.requestType).toBe('execute_place_order');
    expect(error.responseData).toBe(failure);
    expect(error.message).toBe(
      `${TRIGGER_ERROR_CODES.INVALID_SIGNER}: Invalid signer`,
    );
  });

  it('exposes errorCode and leaves requestType undefined for a /query failure envelope', () => {
    const failure: TriggerServerQueryFailureResponse = {
      status: 'failure',
      error: 'Service unavailable',
      error_code: TRIGGER_ERROR_CODES.SERVICE_UNAVAILABLE,
    };

    const error = new TriggerServerFailureError(failure);

    expect(error.errorCode).toBe(TRIGGER_ERROR_CODES.SERVICE_UNAVAILABLE);
    expect(error.requestType).toBeUndefined();
    expect(error.responseData).toBe(failure);
  });
});
