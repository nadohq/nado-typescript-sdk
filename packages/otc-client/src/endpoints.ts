import { ChainEnv } from '@nadohq/shared';

/**
 * OTC service origin per chain env. `local` uses the testnet service; there is no localhost
 * deployment.
 */
export const OTC_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'https://otc.test.nado-backend.xyz',
  inkTestnet: 'https://otc.test.nado-backend.xyz',
  inkMainnet: 'https://otc.prod.nado-backend.xyz',
};

/**
 * Taker quote socket per chain env. The caller opens it.
 */
export const OTC_RFQ_WS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'wss://otc.test.nado-backend.xyz/v1/rfqs/ws',
  inkTestnet: 'wss://otc.test.nado-backend.xyz/v1/rfqs/ws',
  inkMainnet: 'wss://otc.prod.nado-backend.xyz/v1/rfqs/ws',
};
