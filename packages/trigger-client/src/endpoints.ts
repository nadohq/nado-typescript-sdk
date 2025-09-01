import { ChainEnv } from '@nadohq/shared';

export const TRIGGER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80/trigger',
  arbitrum: 'https://trigger.prod.vertexprotocol.com/v1',
  inkTestnet: 'https://trigger.test.nado-backend.xyz/v1',
};
