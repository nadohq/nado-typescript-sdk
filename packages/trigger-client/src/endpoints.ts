import { ChainEnv } from '@nadohq/contracts';

export const TRIGGER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80/trigger',
  arbitrumTestnet: 'https://trigger.sepolia-test.vertexprotocol.com/v1',
  arbitrum: 'https://trigger.prod.vertexprotocol.com/v1',
};
