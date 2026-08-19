import { ChainEnv } from '@nadohq/shared';

/**
 * Base URLs for the Nado mobile service API, keyed by chain environment.
 */
export const MOBILE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://mobile.local.nado.xyz:8004/v1',
  inkTestnet: 'https://mobile.test.nado.xyz/v1',
  inkMainnet: 'https://mobile.prod.nado.xyz/v1',
};
