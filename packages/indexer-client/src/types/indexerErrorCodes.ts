import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the indexer service API. Codes shared across all Nado backend
 * services (see {@link NADO_ERROR_CODES}) are inlined via spread; indexer-specific codes belong
 * in the indexer's own range and should be added here as the backend enumerates them.
 *
 * The indexer failure envelope is returned on the v1 query routes (see
 * {@link IndexerServerFailureResponse}); the v2 routes return REST-style HTTP errors without an
 * `error_code` field.
 */
export const INDEXER_ERROR_CODES = {
  ...NADO_ERROR_CODES,
  // Indexer-specific codes (7xxx range). Populate as the backend's error enum is finalized.
} as const;

/**
 * Union of all known indexer service API error codes.
 */
export type IndexerErrorCode =
  (typeof INDEXER_ERROR_CODES)[keyof typeof INDEXER_ERROR_CODES];
