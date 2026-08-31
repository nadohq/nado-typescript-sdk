import { ChainEnv } from '@nadohq/shared';

export const TRIGGER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80/trigger',
  inkTestnet: 'https://api.test.nado.xyz/trigger/v1',
  inkMainnet: 'https://api.prod.nado.xyz/trigger/v1',
};
