import { IndexerClient } from '@nadohq/indexer-client';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';
import { nowInSeconds, TimeInSeconds } from '@nadohq/utils';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';

async function nlpQueriesTests(context: RunContext) {
  const walletClient = context.getWalletClient();

  const client = new IndexerClient({
    url: context.endpoints.indexer,
    walletClient,
  });

  const nlpSnapshots = await client.getNlpSnapshots({
    maxTimeInclusive: nowInSeconds(),
    limit: 2,
    granularity: TimeInSeconds.DAY,
  });

  debugPrint('NLP snapshots', nlpSnapshots);
}

void test('[indexer-client]: Running NLP queries tests', () =>
  runWithContext(nlpQueriesTests));
