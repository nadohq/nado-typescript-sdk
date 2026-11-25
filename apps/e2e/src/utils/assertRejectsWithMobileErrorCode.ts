import { MobileServerFailureError } from '@nadohq/mobile-client';
import assert from 'node:assert/strict';

/**
 * Asserts that the given operation rejects with a {@link MobileServerFailureError} carrying the expected
 * mobile service API error code.
 *
 * @param operation - Callback performing the request expected to fail.
 * @param expectedErrorCode - Error code from `MOBILE_ERROR_CODES`.
 * @param expectedRequestType - Optional wire request_type expected on the failure envelope.
 */
export async function assertRejectsWithMobileErrorCode(
  operation: () => Promise<unknown>,
  expectedErrorCode: number,
  expectedRequestType?: MobileServerFailureError['requestType'],
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(
      error instanceof MobileServerFailureError,
      'should throw MobileServerFailureError',
    );
    assert.equal(error.errorCode, expectedErrorCode);
    if (expectedRequestType !== undefined) {
      assert.equal(error.requestType, expectedRequestType);
    }
    return true;
  });
}
