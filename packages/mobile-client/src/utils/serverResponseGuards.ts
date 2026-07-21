import { MobileServerFailureResponse } from '../types/serverBaseTypes';

/**
 * Narrows an unknown response body to the mobile service API failure envelope.
 */
export function isMobileServerFailureResponse(
  data: unknown,
): data is MobileServerFailureResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).status === 'failure'
  );
}

/**
 * Narrows an unknown response body to a successful mobile service API envelope.
 */
export function isMobileServerSuccessResponse<T extends { status: 'success' }>(
  data: unknown,
): data is T {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).status === 'success'
  );
}
