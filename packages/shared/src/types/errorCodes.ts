/**
 * Common error codes shared across all Nado backend services (engine, indexer, trigger, mobile).
 *
 * These codes come from the backend's `ResponseError` enum (see `nado-utils/src/error.rs`) and
 * are reused by every service's `*_ERROR_CODES` map (e.g. {@link ENGINE_ERROR_CODES},
 * {@link TRIGGER_ERROR_CODES}, {@link INDEXER_ERROR_CODES}, `MOBILE_ERROR_CODES`). Service-specific
 * codes live in their own ranges and are enumerated in each service's package — see those maps
 * for the full per-service list.
 *
 * The general errors (1xxx range) apply to all services. The `INVALID_SIGNER` (2028) code is
 * technically in the query/execute range but is returned by every signed service, so it is
 * promoted here. The "other" errors (4xxx range) and `INTERNAL_ERROR` (5000) are also
 * cross-service.
 */
export const NADO_ERROR_CODES = {
  // *** General errors (1xxx) — returned by any service ***
  /** Rate limit exceeded; returns HTTP 429. */
  RATE_LIMIT: 1000,
  /** Address is blacklisted for ToS violation. */
  BLACKLISTED_ADDRESS: 1001,
  /** Access blocked from this geographic location. */
  BLOCKED_LOCATION: 1002,
  /** Access blocked from this geographic subdivision. */
  BLOCKED_SUBDIVISION: 1003,
  /** Service is temporarily unavailable due to scheduled maintenance. */
  MAINTENANCE: 1004,
  /** Gateway sent an invalid request (edge query rejection). */
  GATEWAY_INVALID_REQUEST: 1005,
  /** Service is temporarily unavailable; returns HTTP 503. */
  SERVICE_UNAVAILABLE: 1006,

  // *** Shared query/execute error (2xxx) — returned by every signed service ***
  /** Signature does not match the sender or linked signer. */
  INVALID_SIGNER: 2028,

  // *** Other errors (4xxx) — cross-service ***
  /** Perp tick formatting: avg_price_diffs/product_ids length mismatch. */
  PERP_TICK_FORMATTING: 4000,
  /** Feature/route is not yet implemented; mobile returns HTTP 501. */
  NOT_IMPLEMENTED: 4001,
  /** MintNLP on perps is temporarily disabled. */
  TEMPORARILY_DISABLED_MINT_LP: 4002,
  /** EVM contract call reverted. */
  EVM_REVERT: 4003,
  /** Protocol risk withdrawal limit exceeded. */
  WITHDRAW_RISK: 4004,

  // *** Internal error (5xxx) — cross-service catch-all ***
  /** Unhandled internal server error. */
  INTERNAL_ERROR: 5000,
} as const;

/**
 * Union of all shared cross-service Nado error codes.
 *
 * Service-specific error code maps extend this set with their own ranges — see
 * {@link ENGINE_ERROR_CODES}, {@link TRIGGER_ERROR_CODES}, and {@link INDEXER_ERROR_CODES}.
 */
export type NadoErrorCode =
  (typeof NADO_ERROR_CODES)[keyof typeof NADO_ERROR_CODES];
