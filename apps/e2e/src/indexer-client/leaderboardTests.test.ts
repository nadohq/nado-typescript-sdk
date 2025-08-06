import { Subaccount } from '@nadohq/contracts';
import { IndexerClient } from '@nadohq/indexer-client';
import { getServerError } from '../utils/getServerError';
import { RunContext } from '../utils/types';
import { runWithContext } from '../utils/runWithContext';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';

async function leaderboardTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const chainId = walletClient.chain.id;
  const endpointAddr = context.contracts.endpoint;

  const client = new IndexerClient({
    url: context.endpoints.indexer,
    walletClient,
  });

  const subaccount: Subaccount = {
    subaccountName: 'default',
    subaccountOwner: walletClient.account.address,
  };

  const leaderboard = await client.getLeaderboard({
    limit: 5,
    startCursor: undefined,
    contestId: 8,
    rankType: 'pnl',
  });

  debugPrint('Leaderboard', leaderboard);

  const leaderboardParticipant = await client.getLeaderboardParticipant({
    subaccount: {
      subaccountName: subaccount.subaccountName,
      subaccountOwner: subaccount.subaccountOwner,
    },
    contestIds: [5, 6, 7],
  });

  debugPrint('Leaderboard Participant', leaderboardParticipant);

  const leaderboardContests = await client.getLeaderboardContests({
    contestIds: [1],
  });

  debugPrint('Leaderboard Contests', leaderboardContests);

  const leaderboardFirstPage = await client.getPaginatedLeaderboard({
    rankType: 'roi',
    startCursor: undefined,
    contestId: 1,
    limit: 5,
  });

  debugPrint('Leaderboard First Page', leaderboardFirstPage);

  if (leaderboardFirstPage.meta.hasMore) {
    const leaderboardSecondPage = await client.getPaginatedLeaderboard({
      rankType: 'roi',
      startCursor: leaderboardFirstPage.meta.nextCursor,
      contestId: 1,
      limit: 5,
    });

    debugPrint('Leaderboard Second Page', leaderboardSecondPage);
  }

  try {
    const updateLeaderboardRegistrationResult =
      await client.updateLeaderboardRegistration({
        contestId: 17,
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
        updateRegistration: {
          verifyingAddr: endpointAddr,
          chainId,
        },
      });

    debugPrint(
      'Update leaderboard registration result',
      updateLeaderboardRegistrationResult,
    );
  } catch (e: unknown) {
    console.log(
      'Failed to update leaderboard registration:',
      getServerError(e),
    );
  }

  try {
    const leaderboardRegistrationResult =
      await client.getLeaderboardRegistration({
        contestId: 16,
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
      });

    debugPrint(
      'Leaderboard registration result',
      leaderboardRegistrationResult,
    );
  } catch (e: unknown) {
    console.log('Failed to query leaderboard registration:', getServerError(e));
  }
}

void test('[indexer-client]: Running leaderboard tests', () =>
  runWithContext(leaderboardTests));
