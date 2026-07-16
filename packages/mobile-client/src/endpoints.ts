import { ChainEnv } from '@nadohq/shared';

/**
 * Base URLs for the Nado Mobile Identity API, keyed by chain environment.
 */
export const MOBILE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80/mobile',
  inkTestnet: 'https://mobile.test.nado.xyz/v1',
  inkMainnet: 'https://mobile.prod.nado.xyz/v1',
};
