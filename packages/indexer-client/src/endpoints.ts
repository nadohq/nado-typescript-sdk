import { ChainEnv } from '@nadohq/shared';

export const INDEXER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer',
  arbitrum: 'https://archive.prod.vertexprotocol.com/v1',
  inkTestnet: 'https://archive.test.nado-backend.xyz/v1',
};
