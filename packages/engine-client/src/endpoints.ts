import { ChainEnv } from '@nadohq/contracts';

export const ENGINE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80',
  arbitrumTestnet: 'https://gateway.sepolia-test.vertexprotocol.com/v1',
  arbitrum: 'https://gateway.prod.vertexprotocol.com/v1',
};

export const ENGINE_WS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'ws://localhost:80',
  arbitrumTestnet: 'wss://gateway.sepolia-test.vertexprotocol.com/v1/ws',
  arbitrum: 'wss://gateway.prod.vertexprotocol.com/v1/ws',
};

export const ENGINE_WS_SUBSCRIPTION_CLIENT_ENDPOINTS: Record<ChainEnv, string> =
  {
    local: 'ws://localhost:80',
    arbitrumTestnet:
      'wss://gateway.sepolia-test.vertexprotocol.com/v1/subscribe',
    arbitrum: 'wss://gateway.prod.vertexprotocol.com/v1/subscribe',
  };
