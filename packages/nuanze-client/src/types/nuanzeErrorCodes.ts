/**
 * Error codes returned by the Nuanze API, in the order the service declares them. The codes are part
 * of the published contract and additive only, so a client release can only ever lag behind on new
 * ones - it never has to unlearn a code.
 */
export const NUANZE_ERROR_CODES = [
  'BAD_REQUEST',
  'INVALID_CURSOR',
  'CURSOR_FILTER_MISMATCH',
  'INVALID_ADDRESS',
  'AMBIGUOUS_MARKET',
  'MARKET_SELECTOR_MISMATCH',
  'MARKET_NOT_FOUND',
  'WALLET_NOT_FOUND',
  'UNSUPPORTED_INTERVAL',
  'UNSUPPORTED_BUCKET',
  'RANGE_TOO_LARGE',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'DEPENDENCY_UNAVAILABLE',
  'GATEWAY_TIMEOUT',
] as const;

/**
 * Union of all known Nuanze API error codes.
 */
export type NuanzeErrorCode = (typeof NUANZE_ERROR_CODES)[number];
