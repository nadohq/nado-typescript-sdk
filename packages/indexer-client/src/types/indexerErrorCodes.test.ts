import { describe, expect, it } from '@jest/globals';
import { NADO_ERROR_CODES } from '@nadohq/shared';
import { INDEXER_ERROR_CODES, IndexerErrorCode } from './indexerErrorCodes';
import { IndexerServerFailureError } from './IndexerServerFailureError';
import {
  isIndexerServerFailureResponse,
  type IndexerServerFailureResponse,
} from './serverTypes';

describe('INDEXER_ERROR_CODES', () => {
  it('inlines every shared NADO_ERROR_CODES entry', () => {
    for (const [name, value] of Object.entries(NADO_ERROR_CODES)) {
      expect(
        INDEXER_ERROR_CODES[name as keyof typeof INDEXER_ERROR_CODES],
      ).toBe(value);
    }
  });

  it('is exhaustively typed as a const object', () => {
    const code: IndexerErrorCode = INDEXER_ERROR_CODES.INVALID_SIGNER;
    expect(typeof code).toBe('number');
  });
});

describe('isIndexerServerFailureResponse', () => {
  it('narrows a valid failure envelope', () => {
    const failure: IndexerServerFailureResponse = {
      status: 'failure',
      error: 'Invalid signer',
      error_code: INDEXER_ERROR_CODES.INVALID_SIGNER,
      request_type: 'query_leaderboard_register',
    };

    expect(isIndexerServerFailureResponse(failure)).toBe(true);
  });

  it('rejects a success envelope', () => {
    expect(
      isIndexerServerFailureResponse({ status: 'success', data: {} }),
    ).toBe(false);
  });

  it('rejects non-envelope payloads', () => {
    expect(isIndexerServerFailureResponse(null)).toBe(false);
    expect(isIndexerServerFailureResponse(undefined)).toBe(false);
    expect(isIndexerServerFailureResponse({ foo: 'bar' })).toBe(false);
    expect(isIndexerServerFailureResponse('string')).toBe(false);
  });
});

describe('IndexerServerFailureError', () => {
  it('exposes httpStatus, errorCode, and requestType from the failure envelope', () => {
    const failure: IndexerServerFailureResponse = {
      status: 'failure',
      error: 'Service unavailable',
      error_code: INDEXER_ERROR_CODES.SERVICE_UNAVAILABLE,
      request_type: 'query_leaderboard_register',
    };

    const error = new IndexerServerFailureError(failure, 503);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('IndexerServerFailureError');
    expect(error.httpStatus).toBe(503);
    expect(error.errorCode).toBe(INDEXER_ERROR_CODES.SERVICE_UNAVAILABLE);
    expect(error.requestType).toBe('query_leaderboard_register');
    expect(error.responseData).toBe(failure);
    expect(error.message).toBe(
      `${INDEXER_ERROR_CODES.SERVICE_UNAVAILABLE}: Service unavailable`,
    );
  });
});
