import { describe, expect, it } from '@jest/globals';
import {
  getIndexerRewardsUrl,
  INDEXER_CLIENT_ENDPOINTS,
  INDEXER_REWARDS_CLIENT_ENDPOINTS,
} from './endpoints';

describe('getIndexerRewardsUrl', () => {
  it('inserts the rewards prefix ahead of the trailing version segment', () => {
    expect(getIndexerRewardsUrl('https://archive.prod.nado.xyz/v1')).toEqual(
      'https://archive.prod.nado.xyz/rewards/v1',
    );
    expect(getIndexerRewardsUrl('https://archive.test.nado.xyz/v1/')).toEqual(
      'https://archive.test.nado.xyz/rewards/v1/',
    );
  });

  it('leaves URLs without a trailing version segment unchanged', () => {
    expect(getIndexerRewardsUrl('http://localhost:8000/indexer')).toEqual(
      'http://localhost:8000/indexer',
    );
  });

  it('does not rewrite a version segment in the middle of the path', () => {
    expect(getIndexerRewardsUrl('https://archive.prod.nado.xyz/v1/extra')).toBe(
      'https://archive.prod.nado.xyz/v1/extra',
    );
  });

  it('matches the published rewards endpoints for every chain env', () => {
    Object.entries(INDEXER_CLIENT_ENDPOINTS).forEach(([chainEnv, url]) => {
      expect(getIndexerRewardsUrl(url)).toEqual(
        INDEXER_REWARDS_CLIENT_ENDPOINTS[
          chainEnv as keyof typeof INDEXER_REWARDS_CLIENT_ENDPOINTS
        ],
      );
    });
  });
});
