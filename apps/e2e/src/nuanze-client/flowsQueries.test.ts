import {
  NUANZE_FLOW_EVENT_TYPES,
  NUANZE_FLOW_TIMEFRAMES,
  NuanzeCollateralFlow,
  NuanzeFlowEventTypeFilter,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertBoolean,
  assertEnumMember,
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: flows',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('lists collateral events newest first', async () => {
      const response = await tc.nuanze.getCollateralFlows({
        timeframe: '24h',
        limit: 20,
      });
      debugPrint('Collateral flows', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assertArrayElements(response.events, assertCollateralFlowShape, 'events');

      for (let i = 1; i < response.events.length; i++) {
        const prev = response.events[i - 1];
        const cur = response.events[i];
        assert.ok(
          prev.timestamp > cur.timestamp ||
            (prev.timestamp === cur.timestamp && prev.id > cur.id),
          'events should be ordered by timestamp then id descending',
        );
      }
    });

    void test('returns flow aggregates', async () => {
      const response = await tc.nuanze.getCollateralFlowSummary({
        timeframe: '24h',
      });
      debugPrint('Collateral flow summary', response);

      assertEnumMember(response.timeframe, NUANZE_FLOW_TIMEFRAMES, 'timeframe');
      assertBigNumberFinite(response.deposited, 'deposited');
      assertBigNumberFinite(response.withdrawn, 'withdrawn');
      assertBigNumberFinite(response.net, 'net');
      assertBigNumberFinite(response.gross, 'gross');
      assertNonNegativeInteger(response.depositCount, 'depositCount');
      assertNonNegativeInteger(response.withdrawalCount, 'withdrawalCount');
    });

    void test('rejects an unknown event type with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getCollateralFlows({
          eventType: 'transfer' as NuanzeFlowEventTypeFilter,
        });
        assert.fail('expected BAD_REQUEST for an unknown event type');
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

function assertCollateralFlowShape(
  event: NuanzeCollateralFlow,
  label: string,
): void {
  assertNumber(event.id, `${label}.id`);
  assertEnumMember(
    event.eventType,
    NUANZE_FLOW_EVENT_TYPES,
    `${label}.eventType`,
  );
  assertNumber(event.productId, `${label}.productId`);
  assertNonEmptyString(event.symbol, `${label}.symbol`);
  assertBigNumberFinite(event.assetAmount, `${label}.assetAmount`);
  assertNonEmptyString(event.owner, `${label}.owner`);
  assert.match(event.owner, /^0x[0-9a-f]{40}$/, `${label}.owner`);
  assertNonEmptyString(event.subaccountName, `${label}.subaccountName`);
  assert.match(event.timestamp, ISO_UTC, `${label}.timestamp`);
  assertBoolean(event.tags.whale, `${label}.tags.whale`);
  assertBoolean(event.tags.smartMoney, `${label}.tags.smartMoney`);
  assertBoolean(event.tags.freshWallet, `${label}.tags.freshWallet`);

  if (event.usdValue !== null) {
    assertBigNumberFinite(event.usdValue, `${label}.usdValue`);
  }
}
