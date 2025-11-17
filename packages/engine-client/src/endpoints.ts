import { ChainEnv } from '@nadohq/shared';

export const ENGINE_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:80',
  inkTestnet: 'https://gateway.test.nado.xyz/v1',
  inkMainnet: 'https://gateway.prod.nado.xyz/v1',
};

export const ENGINE_WS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'ws://localhost:80',
  inkTestnet: 'wss://gateway.test.nado.xyz/v1/ws',
  inkMainnet: 'wss://gateway.prod.nado.xyz/v1/ws',
};

export const ENGINE_WS_SUBSCRIPTION_CLIENT_ENDPOINTS: Record<ChainEnv, string> =
  {
    local: 'ws://localhost:80',
    inkTestnet: 'wss://gateway.test.nado.xyz/v1/subscribe',
    inkMainnet: 'wss://gateway.prod.nado.xyz/v1/subscribe',
  };
