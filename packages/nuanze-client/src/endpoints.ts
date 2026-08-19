import { NuanzeConfigError } from './errors';

/**
 * Canonical base URL of the Nuanze public analytics API, including the major
 * version segment.
 *
 * Unlike the engine, indexer, and trigger clients there is no per-chain
 * endpoint map: Nuanze is a single public service and accepts no chain
 * environment, wallet client, signer, or contract address.
 */
export const NUANZE_API_BASE_URL = 'https://api.nuanze.co/v1';

/**
 * Normalize and validate a Nuanze base URL.
 *
 * Trailing slashes are stripped so path joining stays unambiguous. Only HTTP
 * and HTTPS are accepted, which rules out `file:`, `data:`, and other schemes
 * that would otherwise reach the transport.
 *
 * @param baseUrl - Override to validate. Defaults to {@link NUANZE_API_BASE_URL}.
 * @returns The normalized absolute base URL, without a trailing slash.
 * @throws {NuanzeConfigError} If the value is not a parseable HTTP(S) URL.
 */
export function resolveNuanzeBaseUrl(
  baseUrl: string = NUANZE_API_BASE_URL,
): string {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new NuanzeConfigError('`baseUrl` must be a non-empty string.');
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch (cause) {
    throw new NuanzeConfigError(`\`baseUrl\` is not a valid URL: ${baseUrl}`, {
      cause,
    });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new NuanzeConfigError(
      `\`baseUrl\` must use http or https, received ${parsed.protocol.replace(':', '')}.`,
    );
  }

  return parsed.toString().replace(/\/+$/, '');
}
