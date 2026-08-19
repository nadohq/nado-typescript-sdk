import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the indexer service API. Codes shared across all Nado backend
 * services (see {@link NADO_ERROR_CODES}) are inlined via spread; indexer-specific codes are in
 * the 3xxx range and come from the backend's `ResponseError` enum (see `nado-utils/src/error.rs`).
 *
 * The indexer failure envelope is returned on the v1 query routes (see
 * {@link IndexerServerFailureResponse}); the v2 routes return REST-style HTTP errors without an
 * `error_code` field.
 */
export const INDEXER_ERROR_CODES = {
  ...NADO_ERROR_CODES,

  // *** Indexer errors (3xxx) ***
  /** digests cannot be combined with subaccount/product_ids filters. */
  DIGESTS_NOT_ALLOWED: 3000,
  /** Too many digests provided for the given limit. */
  DIGESTS_EXCEED_LIMIT: 3001,
  /** subaccount parameter is required for this query. */
  MISSING_SUBACCOUNT: 3002,
  /** Invalid max_timestamp / granularity / count interval. */
  INVALID_INTERVAL: 3003,
  /** Withdrawal transaction not found at the given index. */
  INVALID_WITHDRAWAL_IDX: 3004,
  /** Not enough fast-withdrawal signatures for the transaction. */
  NOT_ENOUGH_FAST_WITHDRAWAL_SIGNATURES: 3005,
  /** subaccounts parameter is required for this query. */
  MISSING_SUBACCOUNTS: 3006,
  /** Too many subaccounts provided. */
  SUBACCOUNTS_LIMIT_EXCEEDED: 3007,
} as const;

/**
 * Union of all known indexer service API error codes.
 */
export type IndexerErrorCode =
  (typeof INDEXER_ERROR_CODES)[keyof typeof INDEXER_ERROR_CODES];
