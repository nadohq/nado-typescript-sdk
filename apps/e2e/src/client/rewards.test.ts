import { createNadoClient, NadoClient } from '@nadohq/client';
import { CHAIN_ENV_TO_CHAIN, toBigNumber } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { Address, createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  assertArray,
  assertArrayElements,
  assertBigNumberNonNegative,
  assertDefined,
  assertHexString,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';

void describe('[client]: rewards', { timeout: TEST_TIMEOUTS.DEFAULT }, () => {
  let nadoClient: NadoClient;
  let walletClientAddress: Address;
  /** Nado client on a throwaway wallet, which never has claimable rewards */
  let noRewardsNadoClient: NadoClient;

  before(async () => {
    await delay(TEST_DELAYS.LONG);

    const context = createTestContext();
    walletClientAddress = context.walletClient.account.address;
    nadoClient = createNadoClient(context.env.chainEnv, {
      walletClient: context.walletClient,
      publicClient: context.publicClient,
    });

    noRewardsNadoClient = createNadoClient(context.env.chainEnv, {
      walletClient: createWalletClient({
        account: privateKeyToAccount(generatePrivateKey()),
        chain: CHAIN_ENV_TO_CHAIN[context.env.chainEnv],
        transport: http(),
      }),
      publicClient: context.publicClient,
    });
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.STANDARD);
  });

  void test('getCashIncentives returns a tagged claim per event', async () => {
    const cashIncentives = await nadoClient.rewards.getCashIncentives({
      address: walletClientAddress,
    });

    debugPrint('Cash incentives', cashIncentives);
    assertDefined(cashIncentives, 'cashIncentives');
    assertArray(cashIncentives.events, 'cashIncentives.events');
    assertArrayElements(
      cashIncentives.events,
      (event, label) => {
        assertBigNumberNonNegative(
          event.wallet.reward,
          `${label}.wallet.reward`,
        );

        const claim = event.wallet.claim;
        assertDefined(claim, `${label}.wallet.claim`);
        assertDefined(claim.status, `${label}.wallet.claim.status`);

        // Proof data is only present on the `claimable` variant of the tagged union
        if (claim.status === 'claimable') {
          assertHexString(
            claim.airdropAddress,
            `${label}.wallet.claim.airdropAddress`,
          );
          assertNumber(claim.week, `${label}.wallet.claim.week`);
          assertBigNumberNonNegative(
            claim.totalAmount,
            `${label}.wallet.claim.totalAmount`,
          );
          assert.ok(
            claim.proof.length > 0,
            `${label}.wallet.claim.proof should not be empty`,
          );
          assertArrayElements(
            claim.proof,
            assertHexString,
            `${label}.wallet.claim.proof`,
          );
        }
      },
      'cashIncentives.events',
    );
  });

  void test('getClaimedAirdropAmounts reads the airdrop contract per week', async () => {
    const { events } = await nadoClient.rewards.getCashIncentives({
      address: walletClientAddress,
    });
    const claimable = events
      .map((event) => event.wallet.claim)
      .filter((claim) => claim.status === 'claimable');

    if (claimable.length === 0) {
      // Nothing claimable on this environment, so no airdrop contract address is known
      return;
    }

    const claimedAmounts = await nadoClient.rewards.getClaimedAirdropAmounts({
      airdropAddress: claimable[0].airdropAddress,
      address: walletClientAddress,
    });

    debugPrint('Claimed airdrop amounts', claimedAmounts);
    assertArray(claimedAmounts, 'claimedAmounts');

    // Weeks are 1-indexed into getClaimed, whose slot 0 is an unused sentinel.
    // Do not assert claimed < totalAmount: rewards stay `claimable` on the indexer even after an
    // onchain claim, so the testing wallet may already have claimed them.
    for (const { week } of claimable) {
      assert.ok(
        week >= 1 && week < claimedAmounts.length,
        `week ${week} should fall in [1, ${claimedAmounts.length}) of getClaimed`,
      );
      assert.ok(
        toBigNumber(claimedAmounts[week]).gte(0),
        `week ${week} claimed amount should be non-negative`,
      );
    }
  });

  void test('claimCashIncentives rejects when nothing is claimable', async () => {
    // Runs against a throwaway wallet so the guard is always exercised, and so a wallet with real
    // claimable rewards is never claimed from by the test suite.
    await assert.rejects(
      () => noRewardsNadoClient.rewards.claimCashIncentives(),
      /No claimable cash incentives rewards/,
    );
  });
});
