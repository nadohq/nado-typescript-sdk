/**
 * Params for each unsigned `public_query`, keyed by request `type`.
 */
export interface MobileServerPublicQueryParamsByType {
  username_availability: { display_name: string };
  profile: { username: string };
}

/**
 * Discriminant `type` values for unsigned `public_query` requests.
 */
export type MobileServerPublicQueryType =
  keyof MobileServerPublicQueryParamsByType;

/**
 * Wire `request_type` the backend echoes on failure envelopes, prefixed by route (`public_query_*`,
 * `query_*`, `execute_*`, e.g. `execute_claim_username`). Public-query types are enumerated; signed
 * query/execute names are kept as a `${prefix}_${string}` template to avoid duplicating the signed-type
 * tags declared in `signing.ts`.
 */
export type MobileServerRequestType =
  | `public_query_${MobileServerPublicQueryType}`
  | `query_${string}`
  | `execute_${string}`;

/**
 * Successful mobile service API envelope, discriminated on `status`. Payload fields are inlined alongside
 * `status` rather than nested under a `data` key, matching the mobile backend's wire format.
 */
export type MobileServerSuccessResponse<TData extends object = object> = {
  status: 'success';
} & TData;

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
