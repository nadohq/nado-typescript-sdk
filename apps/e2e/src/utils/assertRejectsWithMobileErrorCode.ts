import { MobileServerFailureError } from '@nadohq/mobile-client';
import assert from 'node:assert/strict';

/**
 * Asserts that the given operation rejects with a {@link MobileServerFailureError} carrying the expected
 * mobile service API error code.
 *
 * @param operation - Callback performing the request expected to fail.
 * @param expectedErrorCode - Error code from `MOBILE_ERROR_CODES`.
 */
export async function assertRejectsWithMobileErrorCode(
  operation: () => Promise<unknown>,
  expectedErrorCode: number,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(
      error instanceof MobileServerFailureError,
      'should throw MobileServerFailureError',
    );
    assert.equal(error.errorCode, expectedErrorCode);
    return true;
  });
}
