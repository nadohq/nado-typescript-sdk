import { MobileServerRequestType } from './serverRequestTypes';

/**
 * Base success envelope shared by every mobile service API route: just the `status` discriminant. Query
 * routes intersect this with their payload (see {@link MobileServerPublicQuerySuccessResponse}), inlining the
 * payload fields alongside `status` rather than nesting them under a `data` key like the engine does; execute
 * routes return it as-is because they carry no payload.
 */
export interface MobileServerSuccessResponse {
  status: 'success';
}

/**
 * Failure envelope returned by any mobile service API route. A response missing this envelope shape
 * (e.g. a malformed body, or a non-JSON response) is a transport-level error, not a domain error.
 */
export interface MobileServerFailureResponse {
  status: 'failure';
  error: string;
  error_code: number;
  request_type: MobileServerRequestType;
}
