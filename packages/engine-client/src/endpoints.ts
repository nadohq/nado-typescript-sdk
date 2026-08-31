import { ChainEnv } from '@nadohq/shared';

export const ENGINE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80',
  inkTestnet: 'https://api.test.nado.xyz/gateway/v1',
  inkMainnet: 'https://api.prod.nado.xyz/gateway/v1',
};

export const ENGINE_WS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'ws://localhost:80',
  inkTestnet: 'wss://api.test.nado.xyz/gateway/v1/ws',
  inkMainnet: 'wss://api.prod.nado.xyz/gateway/v1/ws',
};

export const ENGINE_WS_SUBSCRIPTION_CLIENT_ENDPOINTS: Record<ChainEnv, string> =
  {
    local: 'ws://localhost:80',
    inkTestnet: 'wss://api.test.nado.xyz/gateway/v1/subscribe',
    inkMainnet: 'wss://api.prod.nado.xyz/gateway/v1/subscribe',
  };
