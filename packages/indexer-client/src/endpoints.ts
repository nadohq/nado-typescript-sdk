import { ChainEnv } from '@nadohq/shared';

/**
 * Base URLs for the Nado archive (indexer) service, keyed by chain environment.
 */
export const INDEXER_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer',
  inkTestnet: 'https://archive.test.nado.xyz/v1',
  inkMainnet: 'https://archive.prod.nado.xyz/v1',
};

/**
 * Base URLs for rewards queries on the archive service (leaderboard, points, cash
 * incentives, private alpha, and social accounts), keyed by chain environment.
 * These queries are served under a dedicated `/rewards` path prefix.
 */
export const INDEXER_REWARDS_CLIENT_ENDPOINTS: Record<ChainEnv, string> = {
  local: 'http://localhost:8000/indexer',
  inkTestnet: 'https://archive.test.nado.xyz/rewards/v1',
  inkMainnet: 'https://archive.prod.nado.xyz/rewards/v1',
};

/**
 * Derives the rewards base URL from an archive base URL by inserting the `/rewards`
 * path prefix ahead of the trailing `/v1` version segment. URLs without a trailing
 * `/v1` segment (ex. local deployments) are returned unchanged.
 *
 * @param url The archive base URL, ex. `https://archive.prod.nado.xyz/v1`
 */
export function getIndexerRewardsUrl(url: string): string {
  return url.replace(/\/v1(?=\/?$)/, '/rewards/v1');
}
