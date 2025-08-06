import { ChainEnv } from '@nadohq/contracts';

export const INDEXER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer',
  arbitrumTestnet: 'https://archive.sepolia-test.vertexprotocol.com/v1',
  arbitrum: 'https://archive.prod.vertexprotocol.com/v1',
};
