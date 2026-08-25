import {
  NUANZE_PLATFORM_WINDOWS,
  NuanzePlatformWindow,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertBigNumberFinite,
  assertEnumMember,
  assertNonEmptyString,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: platform',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('returns a windowed activity summary', async () => {
      const response = await tc.nuanze.getPlatformSummary({ window: '30d' });
      debugPrint('Platform summary', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assertEnumMember(response.window, NUANZE_PLATFORM_WINDOWS, 'window');
      assert.equal(response.window, '30d');
      assertBigNumberFinite(response.volume24h, 'volume24h');
      assertNonNegativeInteger(response.trades24h, 'trades24h');
      assertNonNegativeInteger(response.traders24h, 'traders24h');
      assertBigNumberFinite(response.windowVolume, 'windowVolume');
      assertNonNegativeInteger(response.windowTrades, 'windowTrades');
      assertNonNegativeInteger(response.windowTraders, 'windowTraders');

      if (response.deltas.volumePct !== null) {
        assertBigNumberFinite(response.deltas.volumePct, 'deltas.volumePct');
      }
    });

    void test('rejects an unknown window with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getPlatformSummary({
          window: '24h' as NuanzePlatformWindow,
        });
        assert.fail('expected BAD_REQUEST for an unknown window');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'BAD_REQUEST');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });
  },
);
