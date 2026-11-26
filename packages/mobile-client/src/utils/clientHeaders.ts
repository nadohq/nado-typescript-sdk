import { getNadoClientTypeHeaders } from '@nadohq/shared';

/**
 * Request header carrying the platform of the calling mobile app (e.g. `ios` or `android`).
 */
export const NADO_CLIENT_PLATFORM_HEADER = 'x-nado-platform';

/**
 * Request header carrying the version of the calling mobile app (e.g. `v1.2.0 b67`).
 */
export const NADO_CLIENT_APP_VERSION_HEADER = 'x-nado-app-version';

/**
 * Client identity sent with every mobile service request.
 */
export interface MobileClientHeaderParams {
  clientType?: string;
  clientPlatform?: string;
  clientAppVersion?: string;
}

/**
 * Builds the default request headers identifying the calling mobile client. Extends
 * {@link getNadoClientTypeHeaders} with the app platform and version, which only the mobile service
 * accepts.
 *
 * @returns Headers to apply to all requests made by the mobile client. A platform or app version that
 * is missing or blank is omitted.
 */
export function getMobileClientHeaders({
  clientType,
  clientPlatform,
  clientAppVersion,
}: MobileClientHeaderParams): Record<string, string> {
  const headers = getNadoClientTypeHeaders(clientType);

  const platform = clientPlatform?.trim();
  if (platform) {
    headers[NADO_CLIENT_PLATFORM_HEADER] = platform;
  }

  const appVersion = clientAppVersion?.trim();
  if (appVersion) {
    headers[NADO_CLIENT_APP_VERSION_HEADER] = appVersion;
  }

  return headers;
}
