import { ChainEnv } from '@nadohq/shared';

export const INDEXER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer',
  inkTestnet: 'https://archive.test.nado.xyz/v1',
  inkMainnet: 'https://archive.prod.nado.xyz/v1',
};
