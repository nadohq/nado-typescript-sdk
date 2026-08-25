import {
  NUANZE_MARGIN_KINDS,
  NUANZE_MIN_POSITION_USDS,
  NUANZE_POSITION_SIDES,
  NuanzeMarketPosition,
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
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: positioning',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;
    let ticker: string;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
      const [first] = (await tc.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(first, 'expected at least one perp market');
      ticker = first.ticker;
    });

    void test('returns side-grouped aggregate positioning without identities', async () => {
      const response = await tc.nuanze.getMarketPositioning({
        ticker,
        venue: 'perp',
      });
      debugPrint('Market positioning', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(response.ticker, ticker);
      assert.equal(response.groupBy, 'side');
      assertEnumMember(
        response.effectiveMinPositionUsd,
        NUANZE_MIN_POSITION_USDS,
        'effectiveMinPositionUsd',
      );
      assert.equal(response.suppressionThreshold, 20);
      assert.equal(response.cells.length, 2, 'side grouping has two cells');
      assert.ok(
        !('subaccountOwner' in response),
        'positioning must not expose wallet identity',
      );

      for (const cell of response.cells) {
        assertBoolean(cell.suppressed, 'cell.suppressed');
        if (!cell.suppressed && cell.notional !== null) {
          assertBigNumberFinite(cell.notional, 'cell.notional');
        }
      }
    });

    void test('lists per-trader market positions with addresses', async () => {
      await delay(TEST_DELAYS.STANDARD);
      const response = await tc.nuanze.getMarketPositions({
        ticker,
        venue: 'perp',
        limit: 20,
      });
      debugPrint('Market positions', response);

      assert.equal(response.ticker, ticker);
      assert.equal(response.venue, 'perp');
      assertArrayElements(
        response.positions,
        assertMarketPositionShape,
        'positions',
      );

      for (let i = 1; i < response.positions.length; i++) {
        assert.ok(
          response.positions[i - 1].notional
            .abs()
            .gte(response.positions[i].notional.abs()),
          'positions should be ordered by absolute notional descending',
        );
      }
    });

    void test('rejects an unknown ticker with MARKET_NOT_FOUND', async () => {
      try {
        await tc.nuanze.getMarketPositioning({ ticker: 'NOTAREALTICKERXYZ' });
        assert.fail('expected MARKET_NOT_FOUND for an unknown ticker');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'MARKET_NOT_FOUND');
        assert.equal(error.httpStatus, 404);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });
  },
);

function assertMarketPositionShape(
  position: NuanzeMarketPosition,
  label: string,
): void {
  assert.match(
    position.subaccountOwner,
    /^0x[0-9a-f]{40}$/,
    `${label}.subaccountOwner`,
  );
  assertNonEmptyString(position.subaccountName, `${label}.subaccountName`);
  assertNonEmptyString(position.symbol, `${label}.symbol`);
  assertEnumMember(
    position.marginKind,
    NUANZE_MARGIN_KINDS,
    `${label}.marginKind`,
  );
  assertEnumMember(position.side, NUANZE_POSITION_SIDES, `${label}.side`);
  assertBigNumberFinite(position.notional, `${label}.notional`);
  assertBigNumberFinite(position.upnl, `${label}.upnl`);
  if (position.margin !== null) {
    assertBigNumberFinite(position.margin, `${label}.margin`);
  }
  if (position.entryPrice !== null) {
    assertBigNumberFinite(position.entryPrice, `${label}.entryPrice`);
  }
}
