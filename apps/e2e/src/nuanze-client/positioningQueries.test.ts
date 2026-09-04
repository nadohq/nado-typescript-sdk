import {
  NUANZE_MARGIN_KINDS,
  NUANZE_MIN_POSITION_USDS,
  NUANZE_OPEN_POSITION_SORT_DIRECTIONS,
  NUANZE_POSITION_SIDES,
  NuanzeMarketPosition,
  NuanzeOpenPosition,
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
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
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

    void test('lists top PnL market positions', async () => {
      const response = await tc.nuanze.getMarketPositions({
        ticker,
        venue: 'perp',
        limit: 20,
        sortBy: 'pnl',
        sortDirection: 'desc',
      });
      debugPrint('Top PnL market positions', response);

      assertArrayElements(
        response.positions,
        assertMarketPositionShape,
        'positions',
      );
      for (let i = 1; i < response.positions.length; i++) {
        assert.ok(
          response.positions[i - 1].upnl.gte(response.positions[i].upnl),
          'positions should be ordered by signed PnL descending',
        );
      }
    });

    void test('lists globally ranked current open positions in both directions', async () => {
      for (const sortDirection of NUANZE_OPEN_POSITION_SORT_DIRECTIONS) {
        const response = await tc.nuanze.getOpenPositions({
          limit: 20,
          sortDirection,
        });
        debugPrint(`Global open positions ${sortDirection}`, response);

        assertArrayElements(
          response.positions,
          assertOpenPositionShape,
          'positions',
        );
        assert.ok(
          response.dataUpdatedAt === null ||
            ISO_UTC.test(response.dataUpdatedAt),
          'dataUpdatedAt should be null or a UTC ISO timestamp',
        );
        for (let i = 1; i < response.positions.length; i++) {
          const previous = response.positions[i - 1];
          const current = response.positions[i];
          assert.ok(
            sortDirection === 'desc'
              ? previous.upnl.gte(current.upnl)
              : previous.upnl.lte(current.upnl),
            `global positions should be ordered by signed PnL ${sortDirection}`,
          );
        }
      }
    });

    void test('binds global open-position cursors to private visibility', async () => {
      const first = await tc.nuanze.getOpenPositions({
        limit: 2,
        includePrivate: false,
      });
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      try {
        await tc.nuanze.getOpenPositions({
          limit: 2,
          includePrivate: true,
          cursor: nextCursor,
        });
        assert.fail('expected CURSOR_FILTER_MISMATCH for changed filters');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'CURSOR_FILTER_MISMATCH');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
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
  assertBigNumberFinite(position.amount, `${label}.amount`);
  assertBigNumberFinite(position.notional, `${label}.notional`);
  assertBigNumberFinite(position.upnl, `${label}.upnl`);
  if (position.margin !== null) {
    assertBigNumberFinite(position.margin, `${label}.margin`);
  }
  if (position.entryPrice !== null) {
    assertBigNumberFinite(position.entryPrice, `${label}.entryPrice`);
  }
}

function assertOpenPositionShape(
  position: NuanzeOpenPosition,
  label: string,
): void {
  assertMarketPositionShape(position, label);
  assert.ok(
    Number.isSafeInteger(position.productId) && position.productId >= 0,
    `${label}.productId`,
  );
  assertNonEmptyString(position.ticker, `${label}.ticker`);
  assert.equal(position.venue, 'perp');
  assert.match(position.snapshotAt, ISO_UTC, `${label}.snapshotAt`);
}
