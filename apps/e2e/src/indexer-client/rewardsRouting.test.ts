import { IndexerClient } from '@nadohq/indexer-client';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { Address } from 'viem';
import { assertArray, assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';

/**
 * Rewards queries are served under a `/rewards` path prefix on the archive service,
 * separate from the base URL every other query uses. These tests pin the derived URL
 * and confirm the rewards endpoint answers.
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

    void test('rewards URL carries the /rewards prefix', () => {
      debugPrint('Rewards URL', client.rewardsUrl);

      assert.equal(
        client.rewardsUrl,
        client.opts.url.replace('v1', 'rewards/v1'),
      );
      assert.ok(
        client.rewardsUrl.includes('/rewards/'),
        `expected rewards URL to carry the /rewards prefix, got ${client.rewardsUrl}`,
      );
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
