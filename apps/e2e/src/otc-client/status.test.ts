import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import {
  assertBoolean,
  assertNonEmptyString,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[otc-client]: readiness and execution status',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(() => {
      tc = createTestContext();
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('getReady reports route coverage', async () => {
      const result = await tc.otc.getReady();
      debugPrint('OTC ready', result);

      assertNonNegativeInteger(result.httpStatus, 'httpStatus');
      assertBoolean(result.ready, 'ready');
      assert.equal(result.ready, result.httpStatus === 200);
    });

    void test('getReady accepts an explicit pricer', async () => {
      const result = await tc.otc.getReady({ pricerId: 'awr' });
      debugPrint('OTC ready (awr)', result);

      assertBoolean(result.ready, 'ready');
    });

    void test('getExecutionStatus returns a failure body for an unknown deal', async () => {
      const result = await tc.otc.getExecutionStatus({
        dealId: `e2e-unknown-${Date.now()}`,
        takerDigest: `0x${'0'.repeat(64)}`,
      });
      debugPrint('OTC unknown deal status', result);

      assert.equal(result.status, 'failure');
      assertNonEmptyString(result.error, 'error');
      assertNonNegativeInteger(result.error_code, 'error_code');
      assertNonEmptyString(result.recovery_action, 'recovery_action');
    });
  },
);
