import { ChainEnv } from '@nadohq/shared';

/**
 * Base URLs for the Nado archive (indexer) service, without a version segment.
 * The client appends the path for each API it talks to: `/v1`, `/v2`, and `/rewards/v1`.
 */
export const INDEXER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer',
  inkTestnet: 'https://archive.test.nado.xyz',
  inkMainnet: 'https://archive.prod.nado.xyz',
};
