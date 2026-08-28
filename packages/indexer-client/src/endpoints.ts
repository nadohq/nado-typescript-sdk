import { ChainEnv } from '@nadohq/shared';

/**
 * Base URLs for the Nado archive (indexer) service, without a version segment.
 * The client appends the path for each API it talks to: `/v1` and `/v2`.
 */
export const INDEXER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer',
  inkTestnet: 'https://api.test.nado.xyz/archive',
  inkMainnet: 'https://api.prod.nado.xyz/archive',
};

/**
 * Base URLs for the Nado rewards service, including the version segment.
 * Used for leaderboard, points, cash incentives, private alpha, and social account queries.
 */
export const REWARDS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer/rewards/v1',
  inkTestnet: 'https://api.test.nado.xyz/rewards/v1',
  inkMainnet: 'https://api.prod.nado.xyz/rewards/v1',
};
