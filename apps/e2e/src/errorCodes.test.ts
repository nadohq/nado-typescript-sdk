import {
  EngineServerFailureError,
  type EngineServerQueryFailureResponse,
} from '@nadohq/engine-client';
import {
  isIndexerServerFailureResponse,
  type IndexerServerFailureResponse,
} from '@nadohq/indexer-client';
import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import {
  TRIGGER_ERROR_CODES,
  TriggerServerFailureError,
  type TriggerServerQueryFailureResponse,
} from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * E2E sanity tests for the cross-service error-code mapping feature. Covers only the non-trivial
 * runtime behavior of the `*ServerFailureError` classes and the indexer failure-envelope guard —
 * the rest is exercised against the live backend in the per-service E2E suites (e.g.
 * `engine-client/builder.test.ts`, `mobile-client/identity.test.ts`).
 */
void describe('[error-codes]: cross-service error code maps', () => {
  void test('EngineServerFailureError leaves requestType undefined for /query failures (no request_type on envelope)', () => {
    const queryFailure: EngineServerQueryFailureResponse = {
      status: 'failure',
      error: 'Service unavailable',
      error_code: 1006,
    };

    const error = new EngineServerFailureError(queryFailure);

    assert.equal(error.errorCode, 1006);
    assert.equal(error.requestType, undefined);
  });

  void test('TriggerServerFailureError leaves requestType undefined for /query failures (no request_type on envelope)', () => {
    const queryFailure: TriggerServerQueryFailureResponse = {
      status: 'failure',
      error: 'Service unavailable',
      error_code: TRIGGER_ERROR_CODES.SERVICE_UNAVAILABLE,
    };

    const error = new TriggerServerFailureError(queryFailure);

    assert.equal(error.errorCode, TRIGGER_ERROR_CODES.SERVICE_UNAVAILABLE);
    assert.equal(error.requestType, undefined);
  });

  void test('isIndexerServerFailureResponse narrows failure envelopes and rejects non-envelope payloads', () => {
    const failure: IndexerServerFailureResponse = {
      status: 'failure',
      error: 'Invalid signer',
      error_code: 2028,
      request_type: 'query_leaderboard_register',
    };

    assert.equal(isIndexerServerFailureResponse(failure), true);
    assert.equal(isIndexerServerFailureResponse(null), false);
    assert.equal(isIndexerServerFailureResponse({ foo: 'bar' }), false);
    assert.equal(
      isIndexerServerFailureResponse({ status: 'success', data: {} }),
      false,
    );
  });

  void test('MobileServerFailureError exposes errorCode, httpStatus, and requestType from the failure envelope', () => {
    const error = new MobileServerFailureError(
      {
        status: 'failure',
        error: 'Profile not found',
        error_code: MOBILE_ERROR_CODES.PROFILE_NOT_FOUND,
        request_type: 'public_query_profile',
      },
      404,
    );

    assert.ok(error instanceof MobileServerFailureError);
    assert.equal(error.httpStatus, 404);
    assert.equal(error.errorCode, MOBILE_ERROR_CODES.PROFILE_NOT_FOUND);
    assert.equal(error.requestType, 'public_query_profile');
  });
});
