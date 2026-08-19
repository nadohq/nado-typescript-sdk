/**
 * The request exceeded its finite timeout.
 *
 * Reports the budget that elapsed, so a caller can tell a client-default
 * timeout from a per-request override. This is not the same as the API's own
 * `504 GATEWAY_TIMEOUT`, which arrives as a {@link NuanzeApiError}: this error
 * means no complete response was received at all.
 */
export class NuanzeTimeoutError extends Error {
  /** Timeout budget that elapsed, in milliseconds. */
  readonly timeoutMs: number;

  /** Request path that timed out, relative to the base URL. */
  readonly path: string;

  constructor(path: string, timeoutMs: number, options?: ErrorOptions) {
    super(
      `Nuanze request to ${path} timed out after ${String(timeoutMs)}ms.`,
      options,
    );
    this.name = 'NuanzeTimeoutError';
    this.timeoutMs = timeoutMs;
    this.path = path;
  }
}
