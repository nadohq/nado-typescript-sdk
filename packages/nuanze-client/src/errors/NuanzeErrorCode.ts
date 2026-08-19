/**
 * Stable error codes the Nuanze API documents in its error envelope.
 *
 * Treated as an open union at the boundary: an unrecognized code from a newer
 * API release is still surfaced verbatim on {@link NuanzeApiError} rather than
 * being rejected, so a client build does not have to track every addition.
 */
export type NuanzeErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_CURSOR'
  | 'CURSOR_FILTER_MISMATCH'
  | 'INVALID_ADDRESS'
  | 'AMBIGUOUS_MARKET'
  | 'MARKET_SELECTOR_MISMATCH'
  | 'MARKET_NOT_FOUND'
  | 'WALLET_NOT_FOUND'
  | 'UNSUPPORTED_INTERVAL'
  | 'UNSUPPORTED_BUCKET'
  | 'RANGE_TOO_LARGE'
  | 'PAYLOAD_TOO_LARGE'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'GATEWAY_TIMEOUT'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INTERNAL_ERROR';

/** Every {@link NuanzeErrorCode} this client release knows about. */
export const NUANZE_ERROR_CODES: readonly NuanzeErrorCode[] = Object.freeze([
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
  'PAYLOAD_TOO_LARGE',
  'METHOD_NOT_ALLOWED',
  'RATE_LIMITED',
  'GATEWAY_TIMEOUT',
  'DEPENDENCY_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

/**
 * Narrow an arbitrary value to a {@link NuanzeErrorCode} known to this release.
 *
 * @param value - Candidate code, typically read from an error envelope.
 * @returns True when the value is a documented code.
 */
export function isNuanzeErrorCode(value: unknown): value is NuanzeErrorCode {
  return (
    typeof value === 'string' &&
    NUANZE_ERROR_CODES.includes(value as NuanzeErrorCode)
  );
}
