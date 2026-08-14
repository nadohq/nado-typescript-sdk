import {
  getIndexerRewardsUrl,
  INDEXER_CLIENT_ENDPOINTS,
  INDEXER_REWARDS_CLIENT_ENDPOINTS,
  IndexerClient,
} from '@nadohq/indexer-client';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { Address } from 'viem';
import { assertArray, assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';

/**
 * Rewards queries on the archive service are served under a `/rewards` path prefix,
 * separate from the base archive URL. These tests pin the routing and confirm the
 * rewards endpoint actually answers.
 */
void describe(
  '[indexer-client]: rewards endpoint routing',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;
    let walletAddress: Address;

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      const tc = createTestContext();
      client = tc.indexer;
      walletAddress = tc.walletClientAddress as Address;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('client resolves the rewards URL for the chain env', () => {
      const tc = createTestContext();

      debugPrint('Rewards URL', client.rewardsUrl);
      assert.equal(client.rewardsUrl, tc.endpoints.indexerRewards);
      assert.equal(
        client.rewardsUrl,
        getIndexerRewardsUrl(tc.endpoints.indexer),
      );
      assert.ok(
        client.rewardsUrl.includes('/rewards/'),
        `expected rewards URL to carry the /rewards prefix, got ${client.rewardsUrl}`,
      );
    });

    void test('published rewards endpoints prefix every non-local archive endpoint', () => {
      for (const [chainEnv, url] of Object.entries(INDEXER_CLIENT_ENDPOINTS)) {
        const rewardsUrl =
          INDEXER_REWARDS_CLIENT_ENDPOINTS[
            chainEnv as keyof typeof INDEXER_REWARDS_CLIENT_ENDPOINTS
          ];

        assert.equal(rewardsUrl, getIndexerRewardsUrl(url));
      }
    });

    void test('leaderboard_contests resolves over the rewards endpoint', async () => {
      const result = await client.getLeaderboardContests({});

      debugPrint('Leaderboard contests', result.contests.length);
      assertArray(result.contests, 'contests');
    });

    void test('nado_points resolves over the rewards endpoint', async () => {
      const points = await client.getPoints({ address: walletAddress });

      debugPrint('All time points', points.allTimePoints.points.toString());
      assertDefined(points.allTimePoints, 'allTimePoints');
      assertArray(points.pointsPerEpoch, 'pointsPerEpoch');
    });

    void test('cash_incentives resolves over the rewards endpoint', async () => {
      const cashIncentives = await client.getCashIncentives({
        address: walletAddress,
      });

      debugPrint('Cash incentive events', cashIncentives.events.length);
      assertArray(cashIncentives.events, 'events');
      assertDefined(cashIncentives.walletSummary, 'walletSummary');
    });

    void test('list_social_accounts resolves over the rewards endpoint', async () => {
      const result = await client.listSocialAccounts({
        address: walletAddress,
      });

      debugPrint('Linked social accounts', result.accounts.length);
      assertArray(result.accounts, 'accounts');
    });

    void test('non-rewards queries still resolve over the base endpoint', async () => {
      const quotePrice = await client.getQuotePrice();

      debugPrint('Quote price', quotePrice.price.toString());
      assertDefined(quotePrice.price, 'price');
    });
  },
);
