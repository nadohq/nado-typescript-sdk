import { ChainEnv } from '@nadohq/shared';

export const ENGINE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80',
  arbitrum: 'https://gateway.prod.vertexprotocol.com/v1',
  inkTestnet: 'https://gateway.test.nado-backend.xyz/v1',
};

export const ENGINE_WS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'ws://localhost:80',
  arbitrum: 'wss://gateway.prod.vertexprotocol.com/v1/ws',
  inkTestnet: 'wss://gateway.test.nado-backend.xyz/v1/ws',
};

export const ENGINE_WS_SUBSCRIPTION_CLIENT_ENDPOINTS: Record<ChainEnv, string> =
  {
    local: 'ws://localhost:80',
    arbitrum: 'wss://gateway.prod.vertexprotocol.com/v1/subscribe',
    inkTestnet: 'wss://gateway.test.nado-backend.xyz/v1/subscribe',
  };
