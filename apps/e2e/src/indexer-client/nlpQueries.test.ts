import { IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, TimeInSeconds } from '@nadohq/shared';
import { before, describe, test } from 'node:test';
import { assertArray, assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[indexer-client]: NLP queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      client = new IndexerClient({
        url: context.endpoints.indexer,
        walletClient,
      });
    });

    void test('getNlpSnapshots returns snapshot data', async () => {
      const nlpSnapshots = await client.getNlpSnapshots({
        maxTimeInclusive: nowInSeconds(),
        limit: 2,
        granularity: TimeInSeconds.DAY,
      });
      assertDefined(nlpSnapshots, 'nlpSnapshots');
      assertArray(nlpSnapshots.snapshots, 'nlpSnapshots.snapshots');

      for (const snapshot of nlpSnapshots.snapshots) {
        assertDefined(snapshot.submissionIndex, 'snapshot.submissionIndex');
        assertDefined(snapshot.timestamp, 'snapshot.timestamp');
        assertDefined(
          snapshot.cumulativeBurnAmountQuote,
          'snapshot.cumulativeBurnAmountQuote',
        );
        assertDefined(
          snapshot.cumulativeMintAmountQuote,
          'snapshot.cumulativeMintAmountQuote',
        );
        assertDefined(snapshot.cumulativePnl, 'snapshot.cumulativePnl');
        assertDefined(snapshot.cumulativeTrades, 'snapshot.cumulativeTrades');
        assertDefined(snapshot.cumulativeVolume, 'snapshot.cumulativeVolume');
        assertDefined(snapshot.depositors, 'snapshot.depositors');
        assertDefined(snapshot.oraclePrice, 'snapshot.oraclePrice');
        assertDefined(snapshot.tvl, 'snapshot.tvl');
      }

      debugPrint('NLP snapshots', nlpSnapshots);
    });
  },
);
