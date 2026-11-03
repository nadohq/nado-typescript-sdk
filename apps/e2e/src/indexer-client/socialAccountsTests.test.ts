import {
  type IndexerClient,
  type IndexerSocialAccountInfo,
} from '@nadohq/indexer-client';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  assertArray,
  assertArrayElements,
  assertNonEmptyString,
  assertRecord,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_CONTEST_ID,
  TEST_DELAYS,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

function assertSocialAccountShape(
  account: IndexerSocialAccountInfo,
  label: string,
) {
  assert.equal(account.provider, 'twitter', `${label}.provider`);
  assertNonEmptyString(account.username, `${label}.username`);
  assertString(account.displayName, `${label}.displayName`);
  assertString(account.profileImageUrl, `${label}.profileImageUrl`);
}

void describe(
  '[indexer-client]: social accounts',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;
    let walletAddress: Address;
    // A fresh wallet is guaranteed to have no linked account. viem returns it checksummed (mixed case).
    const unlinkedAddress = privateKeyToAccount(generatePrivateKey()).address;

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      const tc = createTestContext();
      client = tc.indexer;
      walletAddress = tc.walletClientAddress as Address;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('listSocialAccountsBatch keys every requested address in lowercase', async () => {
      const addresses = [walletAddress, unlinkedAddress];

      const result = await client.listSocialAccountsBatch({ addresses });

      debugPrint('Social accounts batch', result);
      assertRecord(result.accounts, 'accounts');
      assert.deepEqual(
        Object.keys(result.accounts).sort(),
        addresses.map((address) => address.toLowerCase()).sort(),
        'accounts should be keyed by every requested address, lowercased',
      );
      for (const [address, accounts] of Object.entries(result.accounts)) {
        assertArray(accounts, `accounts.${address}`);
        assertArrayElements(
          accounts,
          assertSocialAccountShape,
          `accounts.${address}`,
        );
      }
      assert.deepEqual(result.accounts[unlinkedAddress.toLowerCase()], []);
    });

    void test('listSocialAccountsBatch matches listSocialAccounts for a linked address', async (context) => {
      const { participants } = await client.getLeaderboard({
        limit: 50,
        contestId: TEST_CONTEST_ID,
        rankType: 'pnl',
      });
      const linkedParticipant = participants.find(
        (participant) => participant.socialAccounts.length > 0,
      );
      if (!linkedParticipant) {
        context.skip(
          'No leaderboard participant with a linked social account was found.',
        );
        return;
      }
      const linkedAddress = linkedParticipant.subaccount
        .subaccountOwner as Address;

      const batchResult = await client.listSocialAccountsBatch({
        addresses: [linkedAddress, unlinkedAddress],
      });
      const singleResult = await client.listSocialAccounts({
        address: linkedAddress,
      });

      debugPrint('Social accounts batch (linked)', batchResult);
      const linkedAccounts = batchResult.accounts[linkedAddress.toLowerCase()];
      assertArray(linkedAccounts, 'linkedAccounts');
      assert.ok(
        linkedAccounts.length > 0,
        'linked address should have at least one account',
      );
      assertArrayElements(
        linkedAccounts,
        assertSocialAccountShape,
        'linkedAccounts',
      );
      assert.deepEqual(linkedAccounts, singleResult.accounts);
      assert.deepEqual(batchResult.accounts[unlinkedAddress.toLowerCase()], []);
    });
  },
);
