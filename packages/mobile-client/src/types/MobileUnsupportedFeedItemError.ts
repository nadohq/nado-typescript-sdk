/**
 * Error thrown when the mobile service returns a social feed item kind this SDK does not support.
 */
export class MobileUnsupportedFeedItemError extends Error {
  /** Unrecognized item kind returned by the service. */
  readonly kind: string;

  /**
   * @param kind - The unrecognized service item kind.
   */
  constructor(kind: string) {
    super(
      `Unsupported mobile social feed item kind "${kind}". Update the SDK to support this item type.`,
    );
    this.name = 'MobileUnsupportedFeedItemError';
    this.kind = kind;
  }
}
