import {
  ENGINE_ERROR_CODES,
  EngineServerFailureError,
} from '@nadohq/engine-client';
import {
  INDEXER_ERROR_CODES,
  IndexerServerFailureError,
  isIndexerServerFailureResponse,
} from '@nadohq/indexer-client';
import { NADO_ERROR_CODES } from '@nadohq/shared';
import {
  TRIGGER_ERROR_CODES,
  TriggerServerFailureError,
} from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * Sanity E2E tests for the cross-service error-code mapping feature.
 *
 * Verifies that each service package publicly exports its `*_ERROR_CODES` map and
 * `*ServerFailureError` class, that the shared {@link NADO_ERROR_CODES} are inlined into every
 * per-service map, and that the failure-error classes expose the new `errorCode` field on a
 * constructed failure envelope. These are offline shape/export assertions — live failure flows
 * are covered by the per-service E2E suites (e.g. `engine-client/builder.test.ts`).
 */
void describe('[error-codes]: cross-service error code maps', () => {
  void test('every service map inlines the shared NADO_ERROR_CODES', () => {
    for (const [name, value] of Object.entries(NADO_ERROR_CODES)) {
      assert.equal(
        ENGINE_ERROR_CODES[name as keyof typeof ENGINE_ERROR_CODES],
        value,
        `ENGINE_ERROR_CODES.${name} should match NADO_ERROR_CODES.${name}`,
      );
      assert.equal(
        TRIGGER_ERROR_CODES[name as keyof typeof TRIGGER_ERROR_CODES],
        value,
        `TRIGGER_ERROR_CODES.${name} should match NADO_ERROR_CODES.${name}`,
      );
      assert.equal(
        INDEXER_ERROR_CODES[name as keyof typeof INDEXER_ERROR_CODES],
        value,
        `INDEXER_ERROR_CODES.${name} should match NADO_ERROR_CODES.${name}`,
      );
    }
  });

  void test('EngineServerFailureError exposes errorCode on a constructed /execute failure', () => {
    const error = new EngineServerFailureError({
      status: 'failure',
      signature: '0x',
      error: 'Invalid signer',
      error_code: ENGINE_ERROR_CODES.INVALID_SIGNER,
      request_type: 'execute_place_order',
    });

    assert.ok(error instanceof EngineServerFailureError);
    assert.equal(error.name, 'EngineServerFailureError');
    assert.equal(error.errorCode, NADO_ERROR_CODES.INVALID_SIGNER);
    assert.equal(error.requestType, 'execute_place_order');
  });

  void test('TriggerServerFailureError exposes errorCode on a constructed /execute failure', () => {
    const error = new TriggerServerFailureError({
      status: 'failure',
      signature: '0x',
      error: 'Invalid signer',
      error_code: TRIGGER_ERROR_CODES.INVALID_SIGNER,
      request_type: 'execute_place_order',
    });

    assert.ok(error instanceof TriggerServerFailureError);
    assert.equal(error.name, 'TriggerServerFailureError');
    assert.equal(error.errorCode, NADO_ERROR_CODES.INVALID_SIGNER);
    assert.equal(error.requestType, 'execute_place_order');
  });

  void test('IndexerServerFailureError exposes errorCode and httpStatus on a constructed failure', () => {
    const failure = {
      status: 'failure' as const,
      error: 'Service unavailable',
      error_code: INDEXER_ERROR_CODES.SERVICE_UNAVAILABLE,
      request_type: 'query_leaderboard_register',
    };

    assert.ok(isIndexerServerFailureResponse(failure));

    const error = new IndexerServerFailureError(failure, 503);

    assert.ok(error instanceof IndexerServerFailureError);
    assert.equal(error.name, 'IndexerServerFailureError');
    assert.equal(error.httpStatus, 503);
    assert.equal(error.errorCode, NADO_ERROR_CODES.SERVICE_UNAVAILABLE);
    assert.equal(error.requestType, 'query_leaderboard_register');
  });
});
