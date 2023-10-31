import { ChainEnv } from '@vertex-protocol/contracts';

export const ENGINE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80',
  testnet: 'https://gateway.test.vertexprotocol.com/v1',
  mainnet: 'https://gateway.prod.vertexprotocol.com/v1',
};

export const ENGINE_WS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'ws://localhost:80',
  testnet: 'wss://gateway.test.vertexprotocol.com/v1/ws',
  mainnet: 'wss://gateway.prod.vertexprotocol.com/v1/ws',
};

export const ENGINE_WS_SUBSCRIPTION_CLIENT_ENDPOINTS: Record<ChainEnv, string> =
  {
    local: 'ws://localhost:80',
    testnet: 'wss://gateway.test.vertexprotocol.com/v1/subscribe',
    mainnet: 'wss://gateway.prod.vertexprotocol.com/v1/subscribe',
  };
