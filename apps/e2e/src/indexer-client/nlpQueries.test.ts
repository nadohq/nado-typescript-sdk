import { IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, TimeInSeconds } from '@nadohq/shared';
import { before, beforeEach, describe, test } from 'node:test';
import {
  assertArray,
  assertArrayElements,
  assertDefined,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { assertNlpSnapshotShape } from '../utils/shapeAssertions';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[indexer-client]: NLP queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;

    before(async () => {
      await delay(TEST_DELAYS.BETWEEN_SUITES);

      const tc = createTestContext();
      client = tc.indexer;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.BETWEEN_TESTS);
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
