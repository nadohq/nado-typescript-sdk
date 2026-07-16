import { Hex } from 'viem';

/**
 * Request body for the `username_availability` public query.
 */
export interface MobileServerUsernameAvailabilityRequest {
  type: 'username_availability';
  display_name: string;
}

/**
 * Request body for the `profile` public query.
 */
export interface MobileServerProfileRequest {
  type: 'profile';
  username: string;
}

/**
 * Union of all unsigned `public_query` request bodies.
 */
export type MobileServerPublicQueryRequest =
  | MobileServerUsernameAvailabilityRequest
  | MobileServerProfileRequest;

/**
 * Successful response for the `username_availability` public query.
 */
export interface MobileServerUsernameAvailabilityResponse {
  status: 'success';
  username: string;
  available: boolean;
}

/**
 * Server-side public profile shape (snake_case).
 */
export interface MobileServerProfile {
  subaccount: Hex;
  username: string;
  display_name: string;
}

/**
 * Successful response for the `profile` public query.
 */
export interface MobileServerProfileResponse {
  status: 'success';
  profile: MobileServerProfile;
}

/**
 * Server-side identity shape (snake_case) returned by the signed `self_identity` query.
 */
export interface MobileServerIdentity {
  subaccount: Hex;
  username: string;
  display_name: string;
  private_mode: boolean;
}

/**
 * Successful response for the signed `self_identity` query. A `null` identity means the subaccount has not
 * claimed a username yet — this is normal data, not an error.
 */
export interface MobileServerSelfIdentityResponse {
  status: 'success';
  identity: MobileServerIdentity | null;
}

/**
 * Successful response shape shared by all signed `execute` operations (`claim_username`, `update_username`,
 * `set_private_mode`) — they carry no additional data beyond the success envelope.
 */
export interface MobileServerExecuteResponse {
  status: 'success';
}

/**
 * Failure envelope returned by any Mobile Identity API route. A response missing this envelope shape
 * (e.g. a malformed body, or a non-JSON response) is a transport-level error, not a domain error.
 */
export interface MobileServerFailureResponse {
  status: 'failure';
  error: string;
  error_code: number;
  request_type: string;
}

/**
 * Narrows an unknown response body to the Mobile Identity API failure envelope.
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
 * Narrows an unknown response body to a successful Mobile Identity API envelope.
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
