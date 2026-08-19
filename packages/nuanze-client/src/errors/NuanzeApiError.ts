import type { NuanzeRateLimitSnapshot } from '../types/rateLimit';

/** Constructor input for {@link NuanzeApiError}. */
export interface NuanzeApiErrorOptions {
  /** HTTP status that carried the error envelope. */
  status: number;
  /** Stable API error code. Documented values are {@link NuanzeErrorCode}. */
  code: string;
  /** Human-readable message from the envelope. */
  message: string;
  /** Correlation ID from the envelope, or the `X-Request-Id` header. */
  requestId: string | null;
  /** Rate-limit headers observed alongside the failure. */
  rateLimit: NuanzeRateLimitSnapshot;
  /** Underlying error, when the failure wrapped one. */
  cause?: unknown;
}

/**
 * The Nuanze API returned a documented error envelope.
 *
 * Distinct from {@link NuanzeTimeoutError}, {@link NuanzeResponseError}, and
 * caller cancellation, so a consumer can branch on cause without inspecting
 * message text.
 */
export class NuanzeApiError extends Error {
  /** HTTP status that carried the error envelope. */
  readonly status: number;

  /**
   * Stable API error code.
   *
   * Typed as `string` rather than a closed union so a code introduced by a
   * newer API release still reaches the caller. Use `isNuanzeErrorCode` to
   * narrow it to a value this client release documents.
   */
  readonly code: string;

  /** Correlation ID to quote when reporting the failure. */
  readonly requestId: string | null;

  /** Rate-limit headers observed alongside the failure. */
  readonly rateLimit: NuanzeRateLimitSnapshot;

  constructor(options: NuanzeApiErrorOptions) {
    super(
      options.message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'NuanzeApiError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.rateLimit = options.rateLimit;
  }
}
