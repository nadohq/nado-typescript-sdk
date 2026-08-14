import {
  DEFAULT_NADO_CLIENT_TYPE,
  NADO_CLIENT_TYPE_HEADER,
  NadoClientType,
} from '../types/NadoClientType';

/**
 * Builds the default request headers identifying the calling client. Used by every service client
 * so that all outgoing requests are attributed to a client type.
 *
 * @param clientType - Client type to send, defaults to {@link DEFAULT_NADO_CLIENT_TYPE}.
 * @returns Headers to apply to all requests made by a service client.
 */
export function getNadoClientTypeHeaders(
  clientType?: NadoClientType,
): Record<string, string> {
  return {
    [NADO_CLIENT_TYPE_HEADER]: clientType ?? DEFAULT_NADO_CLIENT_TYPE,
  };
}
