import { beforeEach, describe, expect, it } from '@jest/globals';
import { AxiosInstance } from 'axios';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import { IndexerClient } from './IndexerClient';

const BASE_URL = 'https://archive.prod.nado.xyz/v1';
const REWARDS_URL = 'https://archive.prod.nado.xyz/rewards/v1';

// Deterministic throwaway key, only used to produce EIP-712 signatures locally
const TEST_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const VERIFYING_ADDR = '0x0000000000000000000000000000000000000001';

const walletClient = createWalletClient({
  account: privateKeyToAccount(TEST_PRIVATE_KEY),
  chain: ink,
  transport: http(),
});

const SIGNATURE_PARAMS = {
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  verifyingAddr: VERIFYING_ADDR,
  chainId: ink.id,
} as const;

const SUBACCOUNT = {
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
} as const;

let client: IndexerClient;
let postedUrls: string[];

/**
 * Stubs the transport so each query resolves with a canned server payload, and
 * records the URL it was posted to.
 */
function stubTransport(data: unknown) {
  const post = (url: string) => {
    postedUrls.push(url);
    return Promise.resolve({ status: 200, statusText: 'OK', data });
  };
  client.axiosInstance.post = post as unknown as AxiosInstance['post'];
}

beforeEach(() => {
  client = new IndexerClient({ url: BASE_URL, walletClient });
  postedUrls = [];
});

describe('rewards URL', () => {
  it('derives the rewards URL from the base URL', () => {
    expect(client.rewardsUrl).toEqual(REWARDS_URL);
  });

  it('leaves URLs without a v1 segment unchanged', () => {
    const localClient = new IndexerClient({
      url: 'http://localhost:8000/indexer',
    });

    expect(localClient.rewardsUrl).toEqual('http://localhost:8000/indexer');
  });

  it('prefers an explicitly provided rewards URL', () => {
    const customClient = new IndexerClient({
      url: BASE_URL,
      rewardsUrl: 'https://custom.nado.xyz/rewards/v1',
    });

    expect(customClient.rewardsUrl).toEqual(
      'https://custom.nado.xyz/rewards/v1',
    );
  });
});

describe('queries served by the rewards endpoint', () => {
  it('getLeaderboard', async () => {
    stubTransport({ positions: [] });
    await client.getLeaderboard({ contestId: 1 });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('getLeaderboardParticipant', async () => {
    stubTransport({ positions: {} });
    await client.getLeaderboardParticipant({
      subaccount: SUBACCOUNT,
      contestIds: [1],
    });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('getLeaderboardContests', async () => {
    stubTransport({ contests: [] });
    await client.getLeaderboardContests({});

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('getLeaderboardRegistrations', async () => {
    stubTransport({ registrations: [] });
    await client.getLeaderboardRegistrations({ subaccount: SUBACCOUNT });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('registerLeaderboard', async () => {
    stubTransport({ registrations: [] });
    await client.registerLeaderboard({
      ...SIGNATURE_PARAMS,
      contestIds: [1],
    });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('getPoints', async () => {
    stubTransport({
      points_per_epoch: [],
      all_time_points: { points: '0', rank: 1, tier: 1 },
    });
    await client.getPoints({ address: walletClient.account.address });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('getXPoints', async () => {
    stubTransport({
      points_per_epoch: [],
      all_time_points: { total_points: '0', rank: 1, quests: [] },
    });
    await client.getXPoints({ address: walletClient.account.address });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('getPrivateAlphaChoice', async () => {
    stubTransport({ points: '0', fee_refund: '0', nft_eligibility: false });
    await client.getPrivateAlphaChoice({
      address: walletClient.account.address,
    });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('getCashIncentives', async () => {
    stubTransport({
      events: [],
      wallet_summary: { total_reward: '0', claimable_reward: '0' },
    });
    await client.getCashIncentives({ address: walletClient.account.address });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('connectSocialAccount', async () => {
    stubTransport({ url: 'https://twitter.com/oauth' });
    await client.connectSocialAccount({
      ...SIGNATURE_PARAMS,
      provider: 'twitter',
    });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('listSocialAccounts', async () => {
    stubTransport({ accounts: [] });
    await client.listSocialAccounts({
      address: walletClient.account.address,
    });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });

  it('revokeSocialAccount', async () => {
    stubTransport({ accounts: [] });
    await client.revokeSocialAccount({
      ...SIGNATURE_PARAMS,
      provider: 'twitter',
    });

    expect(postedUrls).toEqual([REWARDS_URL]);
  });
});

describe('queries served by the base endpoint', () => {
  it('listSubaccounts', async () => {
    stubTransport({ subaccounts: [] });
    await client.listSubaccounts({});

    expect(postedUrls).toEqual([BASE_URL]);
  });

  it('getOrders', async () => {
    stubTransport({ orders: [] });
    await client.getOrders({});

    expect(postedUrls).toEqual([BASE_URL]);
  });

  it('getQuotePrice', async () => {
    stubTransport({ price_x18: '0' });
    await client.getQuotePrice();

    expect(postedUrls).toEqual([BASE_URL]);
  });

  it('getPortfolio', async () => {
    stubTransport([]);
    await client.getPortfolio({ subaccount: SUBACCOUNT });

    expect(postedUrls).toEqual([BASE_URL]);
  });
});
