import { ChainEnv } from '@nadohq/shared';

/**
 * Base URLs for the Nado mobile service API, keyed by chain environment.
 */
export const MOBILE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://mobile.local.nado.xyz:8004/v1/mobile',
  inkTestnet: 'https://api.test.nado.xyz/mobile/v1',
  inkMainnet: 'https://api.prod.nado.xyz/mobile/v1',
};
