import { ChainEnv } from '@nadohq/shared';

export const TRIGGER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80/trigger',
  inkTestnet: 'https://trigger.test.nado.xyz/v1',
  inkMainnet: 'https://trigger.prod.nado.xyz/v1',
};
