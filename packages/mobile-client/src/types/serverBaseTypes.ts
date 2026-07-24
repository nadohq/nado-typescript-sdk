/**
 * Params for each unsigned `public_query`, keyed by request `type`.
 */
export interface MobileServerPublicQueryRequestByType {
  username_availability: { display_name: string };
  profile: { username: string };
  feed: {
    /**
     * Minimum notional as a whole-dollar JSON integer (NOT an x18 string), at least $1,000. Omitted or
     * `null` means unfiltered.
     */
    minimum_notional?: number;
    /** Page size, 1–50; the backend defaults to `MOBILE_FEED_MAX_PAGE_SIZE` (50) when omitted. */
    limit?: number;
    /**
     * Opaque keyset cursor from a prior page's `next_cursor`. Bound to the exact `minimum_notional` it was
     * issued for (including the unfiltered state) — reusing it with a different filter fails.
     */
    cursor?: string;
  };
}

/**
 * Discriminant `type` values for unsigned `public_query` requests.
 */
export type MobileServerPublicQueryRequestType =
  keyof MobileServerPublicQueryRequestByType;

/**
 * Wire `request_type` the backend echoes on failure envelopes, prefixed by route (`public_query_*`,
 * `query_*`, `execute_*`, e.g. `execute_claim_username`). Public-query types are enumerated; signed
 * query/execute names are kept as a `${prefix}_${string}` template to avoid duplicating the signed-type
 * tags declared in `signing.ts`.
 */
export type MobileServerRequestType =
  | `public_query_${MobileServerPublicQueryRequestType}`
  | `query_${string}`
  | `execute_${string}`;

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
