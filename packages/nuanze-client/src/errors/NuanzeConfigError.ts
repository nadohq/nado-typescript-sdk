/**
 * A client or per-request option was invalid.
 *
 * Thrown before any network call, so receiving it guarantees no rate-limit
 * units were spent.
 */
export class NuanzeConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'NuanzeConfigError';
  }
}
