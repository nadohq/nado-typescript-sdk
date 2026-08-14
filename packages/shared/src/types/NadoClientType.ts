/**
 * All known client types. Sent with every request so the backend can attribute traffic to the
 * surface that produced it (metrics, rate limiting, debugging).
 */
export const ALL_NADO_CLIENT_TYPES = [
  'web',
  'mobile',
  'sdk',
] as const satisfies string[];

/**
 * Identifies the surface issuing a request, sent via the {@link NADO_CLIENT_TYPE_HEADER} header.
 */
export type NadoClientType = (typeof ALL_NADO_CLIENT_TYPES)[number];

/**
 * Client type used when none is given, indicating direct SDK usage.
 */
export const DEFAULT_NADO_CLIENT_TYPE: NadoClientType = 'sdk';

/**
 * Request header carrying the {@link NadoClientType} of the calling client.
 */
export const NADO_CLIENT_TYPE_HEADER = 'x-nado-client-type';
