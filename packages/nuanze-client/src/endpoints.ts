import { ChainEnv } from '@nadohq/shared';

/**
 * Base URLs for the Nuanze public analytics API, including the major version segment.
 *
 * Nuanze runs a single public deployment that serves mainnet data, so every chain environment maps
 * to the same host. The map exists so callers can key off `chainEnv` exactly like the other service
 * clients.
 */
export const NUANZE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'https://api.nuanze.co/v1',
  inkTestnet: 'https://api.nuanze.co/v1',
  inkMainnet: 'https://api.nuanze.co/v1',
};
