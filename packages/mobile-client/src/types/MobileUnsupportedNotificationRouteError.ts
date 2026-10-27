/**
 * Error thrown when the mobile service returns a notification route this SDK does not support.
 */
export class MobileUnsupportedNotificationRouteError extends Error {
  /** Unrecognized route name returned by the service. */
  readonly routeName: string;

  /**
   * @param routeName - The unrecognized service route name.
   */
  constructor(routeName: string) {
    super(`Unsupported mobile notification route "${routeName}".`);
    this.name = 'MobileUnsupportedNotificationRouteError';
    this.routeName = routeName;
  }
}
