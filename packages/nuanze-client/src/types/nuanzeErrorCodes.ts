/**
 * Error codes in the current published Nuanze API contract, in service declaration order.
 */
export const NUANZE_ERROR_CODES = [
  'BAD_REQUEST',
  'INVALID_CURSOR',
  'CURSOR_FILTER_MISMATCH',
  'INVALID_ADDRESS',
  'INVALID_SUBACCOUNT',
  'AMBIGUOUS_MARKET',
  'MARKET_SELECTOR_MISMATCH',
  'MARKET_NOT_FOUND',
  'WALLET_NOT_FOUND',
  'UNSUPPORTED_INTERVAL',
  'UNSUPPORTED_BUCKET',
  'RANGE_TOO_LARGE',
  'PAYLOAD_TOO_LARGE',
  'METHOD_NOT_ALLOWED',
  'RATE_LIMITED',
  'GATEWAY_TIMEOUT',
  'DEPENDENCY_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

/**
 * Union of all known Nuanze API error codes.
 */
export type NuanzeErrorCode = (typeof NUANZE_ERROR_CODES)[number];
