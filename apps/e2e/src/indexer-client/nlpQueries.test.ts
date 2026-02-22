import { IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, TimeInSeconds } from '@nadohq/shared';
import { before, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { assertNlpSnapshotShape } from '../utils/shapeAssertions';
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
      assertArrayElements(
        nlpSnapshots.snapshots,
        assertNlpSnapshotShape,
        'nlpSnapshots.snapshots',
      );

      debugPrint('NLP snapshots', nlpSnapshots);
    });
  },
);
