import type { NuanzeRateLimitSnapshot } from '../types/rateLimit';

/** Maximum characters of response body retained on {@link NuanzeResponseError}. */
export const NUANZE_BODY_PREVIEW_LIMIT = 512;

/** Constructor input for {@link NuanzeResponseError}. */
export interface NuanzeResponseErrorOptions {
  /** HTTP status of the unusable response. */
  status: number;
  /** Correlation ID from the `X-Request-Id` header, when present. */
  requestId: string | null;
  /** Bounded, whitespace-collapsed excerpt of the body. */
  bodyPreview: string;
  /** Rate-limit headers observed alongside the response. */
  rateLimit: NuanzeRateLimitSnapshot;
  /** Underlying parse or validation error. */
  cause?: unknown;
}

/**
 * The response could not be interpreted as the documented contract.
 *
 * Covers a non-JSON payload, a success body missing required fields, and an
 * error status whose envelope is malformed. Kept separate from
 * {@link NuanzeApiError} because the API did not actually state a failure
 * reason, which usually points at a proxy, an outage page, or a contract
 * mismatch rather than at the request.
 */
export class NuanzeResponseError extends Error {
  /** HTTP status of the unusable response. */
  readonly status: number;

  /** Correlation ID to quote when reporting the failure. */
  readonly requestId: string | null;

  /**
   * Bounded excerpt of the body, capped at
   * {@link NUANZE_BODY_PREVIEW_LIMIT} characters with whitespace collapsed.
   * Bounded so an HTML error page or a large payload cannot flood logs.
   */
  readonly bodyPreview: string;

  /** Rate-limit headers observed alongside the response. */
  readonly rateLimit: NuanzeRateLimitSnapshot;

  constructor(message: string, options: NuanzeResponseErrorOptions) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'NuanzeResponseError';
    this.status = options.status;
    this.requestId = options.requestId;
    this.bodyPreview = options.bodyPreview;
    this.rateLimit = options.rateLimit;
  }
}

/**
 * Reduce an arbitrary response body to a bounded single-line excerpt.
 *
 * @param body - Raw body, already stringified by the transport.
 * @returns A preview no longer than {@link NUANZE_BODY_PREVIEW_LIMIT}, suffixed
 * with an ellipsis when truncated.
 */
export function nuanzeBodyPreview(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= NUANZE_BODY_PREVIEW_LIMIT) return collapsed;
  return `${collapsed.slice(0, NUANZE_BODY_PREVIEW_LIMIT)}…`;
}
