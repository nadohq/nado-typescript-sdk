import { IndexerClient } from '@nadohq/indexer-client';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';
import { nowInSeconds, TimeInSeconds } from '@nadohq/utils';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';

async function vlpQueriesTests(context: RunContext) {
  const walletClient = context.getWalletClient();

  const client = new IndexerClient({
    url: context.endpoints.indexer,
    walletClient,
  });

  const vlpSnapshots = await client.getVlpSnapshots({
    maxTimeInclusive: nowInSeconds(),
    limit: 2,
    granularity: TimeInSeconds.DAY,
  });

  debugPrint('VLP snapshots', vlpSnapshots);
}

void test('[indexer-client]: Running VLP queries tests', () =>
  runWithContext(vlpQueriesTests));
