import { describe, expect, it } from '@jest/globals';
import { AxiosInstance } from 'axios';
import { IndexerClientOpts } from './IndexerBaseClient';
import { IndexerClient } from './IndexerClient';
import {
  INDEXER_SERVER_REWARDS_QUERY_REQUEST_TYPES,
  IndexerServerQueryRequestByType,
  IndexerServerQueryRequestType,
} from './types';

const BASE_URL = 'https://archive.prod.nado.xyz/v1';
const REWARDS_URL = 'https://archive.prod.nado.xyz/rewards/v1';

const NON_REWARDS_REQUEST_TYPES = [
  'events',
  'maker_statistics',
  'market_snapshots',
  'orders',
  'portfolio',
  'subaccounts',
] as const satisfies readonly IndexerServerQueryRequestType[];

/**
 * Stubs out the transport and records the URL every query is posted to, so routing
 * can be asserted without going through each public wrapper's response mapping.
 */
class TestIndexerClient extends IndexerClient {
  readonly postedUrls: string[] = [];

  constructor(opts: IndexerClientOpts) {
    super(opts);

    const post = (url: string) => {
      this.postedUrls.push(url);
      return Promise.resolve({ status: 200, statusText: 'OK', data: {} });
    };
    this.axiosInstance.post = post as unknown as AxiosInstance['post'];
  }

  queryForTest(requestType: IndexerServerQueryRequestType) {
    // Params are irrelevant here, the stubbed transport ignores the request body
    const params =
      {} as IndexerServerQueryRequestByType[IndexerServerQueryRequestType];

    return this.query(requestType, params);
  }
}

describe('indexer query routing', () => {
  it('derives the rewards URL from the base URL', () => {
    const client = new TestIndexerClient({ url: BASE_URL });

    expect(client.rewardsUrl).toEqual(REWARDS_URL);
  });

  it('prefers an explicitly provided rewards URL', () => {
    const client = new TestIndexerClient({
      url: BASE_URL,
      rewardsUrl: 'https://custom.nado.xyz/rewards/v1',
    });

    expect(client.rewardsUrl).toEqual('https://custom.nado.xyz/rewards/v1');
  });

  it.each(INDEXER_SERVER_REWARDS_QUERY_REQUEST_TYPES)(
    'routes %s to the rewards URL',
    async (requestType) => {
      const client = new TestIndexerClient({ url: BASE_URL });

      await client.queryForTest(requestType);

      expect(client.postedUrls).toEqual([REWARDS_URL]);
    },
  );

  it.each(NON_REWARDS_REQUEST_TYPES)(
    'routes %s to the base URL',
    async (requestType) => {
      const client = new TestIndexerClient({ url: BASE_URL });

      await client.queryForTest(requestType);

      expect(client.postedUrls).toEqual([BASE_URL]);
    },
  );
});
