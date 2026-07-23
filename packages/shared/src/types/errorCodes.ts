/**
 * Common error codes shared across all Nado backend services (engine, indexer, trigger, mobile).
 *
 * These codes come from the backend's common error enum and are reused by every service's
 * `*_ERROR_CODES` map (e.g. {@link ENGINE_ERROR_CODES}, {@link TRIGGER_ERROR_CODES},
 * {@link INDEXER_ERROR_CODES}, `MOBILE_ERROR_CODES`). Service-specific codes live in their own
 * ranges and are enumerated in each service's package — see those maps for the full per-service
 * list.
 */
export const NADO_ERROR_CODES = {
  /** Generic "not implemented" response from a service route. */
  NOT_IMPLEMENTED: 4001,
  /** Signature verification failed or the signer is not authorized for the subaccount. */
  INVALID_SIGNER: 2028,
  /** Service is temporarily unavailable (maintenance, restart, overload). */
  SERVICE_UNAVAILABLE: 1006,
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
