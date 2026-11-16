import {
  NUANZE_MARGIN_KINDS,
  NUANZE_MIN_POSITION_USDS,
  NUANZE_OPEN_POSITION_SORT_DIRECTIONS,
  NUANZE_POSITION_SIDES,
  NuanzeMarketPosition,
  NuanzeMarketVenue,
  NuanzeOpenPosition,
  NuanzeOpenPositionSortDirection,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertBoolean,
  assertEnumMember,
  assertNonEmptyString,
  assertString,
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
    let productId: number;
    let venue: 'perp';

    before(async () => {
      tc = createTestContext();
      const [first] = (await tc.nuanze.getMarkets({ venue: 'perp' })).markets;
      assert.ok(first, 'expected at least one perp market');
      ticker = first.ticker;
      productId = first.productId;
      venue = 'perp';
    });

    void test('resolves the same market positioning by ticker or productId', async () => {
      const byTicker = await tc.nuanze.getMarketPositioning({
        ticker,
        venue,
      });
      const byProductId = await tc.nuanze.getMarketPositioning({
        productId,
        venue,
      });
      debugPrint('Market positioning by ticker selector', byTicker);
      debugPrint('Market positioning by productId selector', byProductId);

      assertSameMarketIdentity(
        byTicker,
        { productId, ticker, venue },
        'byTicker',
      );
      assertSameMarketIdentity(
        byProductId,
        { productId, ticker, venue },
        'byProductId',
      );
      assertSameMarketIdentity(byTicker, byProductId, 'selectors');
      assert.equal(byTicker.groupBy, 'side');
      assert.equal(byProductId.groupBy, 'side');
    });

    void test('resolves the same market positions by ticker or productId', async () => {
      const byTicker = await tc.nuanze.getMarketPositions({
        ticker,
        venue,
        limit: 20,
      });
      const byProductId = await tc.nuanze.getMarketPositions({
        productId,
        venue,
        limit: 20,
      });
      debugPrint('Market positions by ticker selector', byTicker);
      debugPrint('Market positions by productId selector', byProductId);

      assertSameMarketIdentity(
        byTicker,
        { productId, ticker, venue },
        'byTicker',
      );
      assertSameMarketIdentity(
        byProductId,
        { productId, ticker, venue },
        'byProductId',
      );
      assertSameMarketIdentity(byTicker, byProductId, 'selectors');
      assertArrayElements(
        byTicker.positions,
        assertMarketPositionShape,
        'byTicker.positions',
      );
      assertArrayElements(
        byProductId.positions,
        assertMarketPositionShape,
        'byProductId.positions',
      );
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

    void test('lists private-inclusive market positions with the same shape', async () => {
      const response = await tc.nuanze.getMarketPositions({
        ticker,
        venue,
        limit: 20,
        includePrivate: true,
      });
      debugPrint('Private-inclusive market positions', response);

      assertSameMarketIdentity(
        response,
        { productId, ticker, venue },
        'response',
      );
      assertArrayElements(
        response.positions,
        assertMarketPositionShape,
        'positions',
      );
      assert.ok(
        response.dataUpdatedAt === null || ISO_UTC.test(response.dataUpdatedAt),
        'dataUpdatedAt should be null or a UTC ISO timestamp',
      );
      // The default sort (absolute notional descending) still applies.
      assertAbsoluteNotionalOrder(response.positions, 'desc', 'positions');
    });

    void test('excludes Private Mode legs from market positions by default', async (context) => {
      const limit = 200;
      // Global open positions already honor includePrivate, so they locate a market holding a
      // known Private Mode leg.
      const [globalPublic, globalWithPrivate] = await Promise.all([
        tc.nuanze.getOpenPositions({ limit }),
        tc.nuanze.getOpenPositions({ limit, includePrivate: true }),
      ]);
      const [privateLeg] = privateOnlyLegs(
        globalPublic.positions,
        globalWithPrivate.positions,
        limit,
        (position) => position.upnl,
        (position) => `${position.productId}:${positionLegKey(position)}`,
        'global open positions',
      );
      if (!privateLeg) {
        context.skip(
          `no Private Mode legs among the top ${limit} global open positions`,
        );
        return;
      }

      const [publicOnly, withPrivate] = await Promise.all([
        tc.nuanze.getMarketPositions({
          productId: privateLeg.productId,
          venue,
          limit,
        }),
        tc.nuanze.getMarketPositions({
          productId: privateLeg.productId,
          venue,
          limit,
          includePrivate: true,
        }),
      ]);
      debugPrint('Known Private Mode leg', privateLeg);
      debugPrint('Default market positions', publicOnly);
      debugPrint('Private-inclusive market positions', withPrivate);

      assertDataUpdatedAtNotOlder(publicOnly, withPrivate);
      privateOnlyLegs(
        publicOnly.positions,
        withPrivate.positions,
        limit,
        (position) => position.notional.abs(),
        (position) => positionLegKey(position),
        `${privateLeg.ticker} positions`,
      );

      const legKey = positionLegKey(privateLeg);
      assert.ok(
        !publicOnly.positions.some(
          (position) => positionLegKey(position) === legKey,
        ),
        `Private Mode leg ${legKey} should be excluded from ${privateLeg.ticker} positions by default`,
      );
      // A full page covers only the largest legs, and the known leg may rank below it.
      const floor =
        withPrivate.positions.length === limit
          ? withPrivate.positions[limit - 1].notional.abs()
          : null;
      if (floor !== null && !privateLeg.notional.abs().gt(floor)) {
        context.skip(
          `Private Mode leg ${legKey} ranks below the top ${limit} ${privateLeg.ticker} positions`,
        );
        return;
      }
      assert.ok(
        withPrivate.positions.some(
          (position) => positionLegKey(position) === legKey,
        ),
        `Private Mode leg ${legKey} should be returned with includePrivate`,
      );
    });

    void test('binds market-position cursors to private visibility', async () => {
      const first = await tc.nuanze.getMarketPositions({
        ticker,
        venue,
        limit: 2,
        includePrivate: true,
      });
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      try {
        // Omitting includePrivate falls back to the default `false`.
        await tc.nuanze.getMarketPositions({
          ticker,
          venue,
          limit: 2,
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

    void test('lists global open positions by absolute notional, descending by default', async () => {
      const response = await tc.nuanze.getOpenPositions({
        limit: 20,
        sortBy: 'notional',
      });
      debugPrint('Global open positions by notional', response);

      assertArrayElements(
        response.positions,
        assertOpenPositionShape,
        'positions',
      );
      assert.ok(
        response.positions.length > 1,
        'expected at least two open positions to order',
      );
      assertAbsoluteNotionalOrder(response.positions, 'desc', 'positions');
    });

    void test('lists global open positions by absolute notional ascending', async () => {
      const response = await tc.nuanze.getOpenPositions({
        limit: 20,
        sortBy: 'notional',
        sortDirection: 'asc',
      });
      debugPrint('Global open positions by notional ascending', response);

      assertArrayElements(
        response.positions,
        assertOpenPositionShape,
        'positions',
      );
      assert.ok(
        response.positions.length > 1,
        'expected at least two open positions to order',
      );
      assertAbsoluteNotionalOrder(response.positions, 'asc', 'positions');
    });

    void test('continues notional-ordered global open positions with a cursor', async () => {
      const first = await tc.nuanze.getOpenPositions({
        limit: 5,
        sortBy: 'notional',
      });
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      const second = await tc.nuanze.getOpenPositions({
        limit: 5,
        sortBy: 'notional',
        cursor: nextCursor,
      });
      debugPrint('Second page of global open positions by notional', second);

      assertArrayElements(
        second.positions,
        assertOpenPositionShape,
        'second.positions',
      );
      assertAbsoluteNotionalOrder(
        [...first.positions, ...second.positions],
        'desc',
        'paged positions',
      );
    });

    void test('binds global open-position cursors to a non-default sortBy', async () => {
      const first = await tc.nuanze.getOpenPositions({
        limit: 2,
        sortBy: 'notional',
      });
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      try {
        // Omitting sortBy falls back to the default `pnl`, which the cursor was not minted for.
        await tc.nuanze.getOpenPositions({ limit: 2, cursor: nextCursor });
        assert.fail('expected CURSOR_FILTER_MISMATCH for a changed sortBy');
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

    void test('lists private-inclusive global open positions with the same shape', async () => {
      const response = await tc.nuanze.getOpenPositions({
        limit: 20,
        includePrivate: true,
      });
      debugPrint('Private-inclusive global open positions', response);

      assertArrayElements(
        response.positions,
        assertOpenPositionShape,
        'positions',
      );
      assert.ok(
        response.dataUpdatedAt === null || ISO_UTC.test(response.dataUpdatedAt),
        'dataUpdatedAt should be null or a UTC ISO timestamp',
      );
      for (let i = 1; i < response.positions.length; i++) {
        assert.ok(
          response.positions[i - 1].upnl.gte(response.positions[i].upnl),
          'positions should keep the default signed PnL descending order',
        );
      }
    });

    void test('excludes Private Mode legs from global open positions by default', async (context) => {
      const limit = 200;
      const [publicOnly, withPrivate] = await Promise.all([
        tc.nuanze.getOpenPositions({ limit }),
        tc.nuanze.getOpenPositions({ limit, includePrivate: true }),
      ]);
      debugPrint('Default global open positions', publicOnly);
      debugPrint('Private-inclusive global open positions', withPrivate);

      assertDataUpdatedAtNotOlder(publicOnly, withPrivate);
      const privateLegs = privateOnlyLegs(
        publicOnly.positions,
        withPrivate.positions,
        limit,
        (position) => position.upnl,
        (position) => `${position.productId}:${positionLegKey(position)}`,
        'global open positions',
      );
      if (privateLegs.length === 0) {
        context.skip(
          `no Private Mode legs among the top ${limit} global open positions`,
        );
        return;
      }
      debugPrint('Private Mode global legs', privateLegs);
    });

    void test('rejects a private-inclusive open-position cursor reused without includePrivate', async () => {
      const first = await tc.nuanze.getOpenPositions({
        limit: 2,
        includePrivate: true,
      });
      const { nextCursor } = first;
      assertNonEmptyString(nextCursor, 'first.nextCursor');
      assert.ok(nextCursor !== null);

      try {
        await tc.nuanze.getOpenPositions({ limit: 2, cursor: nextCursor });
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

function assertSameMarketIdentity(
  actual: { productId: number; ticker: string; venue: NuanzeMarketVenue },
  expected: { productId: number; ticker: string; venue: NuanzeMarketVenue },
  label: string,
): void {
  assert.equal(actual.productId, expected.productId, `${label}.productId`);
  assert.equal(actual.ticker, expected.ticker, `${label}.ticker`);
  assert.equal(actual.venue, expected.venue, `${label}.venue`);
}

function assertMarketPositionShape(
  position: NuanzeMarketPosition,
  label: string,
): void {
  assertPositionShape(position, label);
  assertPositionIdentity(position, label);
  assertPositionLeverage(position, label);
}

function assertPositionLeverage(
  position: NuanzeMarketPosition | NuanzeOpenPosition,
  label: string,
): void {
  if (position.marginKind === 'cross' || position.margin === null) {
    assert.equal(position.leverage, null, `${label}.leverage`);
  } else {
    assert.ok(position.leverage !== null, `${label}.leverage`);
    assertBigNumberFinite(position.leverage, `${label}.leverage`);
    assert.ok(position.leverage.gt(0), `${label}.leverage must be positive`);
  }
}

function assertPositionIdentity(
  position: NuanzeMarketPosition | NuanzeOpenPosition,
  label: string,
): void {
  if (position.username !== null) {
    assertString(position.username, `${label}.username`);
  }
  if (position.displayName !== null) {
    assertString(position.displayName, `${label}.displayName`);
  }
  if (position.avatarUrl !== null) {
    assertString(position.avatarUrl, `${label}.avatarUrl`);
  }
}

function assertPositionShape(
  position: NuanzeMarketPosition | NuanzeOpenPosition,
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
  assertPositionShape(position, label);
  assertPositionIdentity(position, label);
  assertPositionLeverage(position, label);
  assert.ok(
    Number.isSafeInteger(position.productId) && position.productId >= 0,
    `${label}.productId`,
  );
  assertNonEmptyString(position.ticker, `${label}.ticker`);
  assert.equal(position.venue, 'perp');
  assert.match(position.snapshotAt, ISO_UTC, `${label}.snapshotAt`);
}

/**
 * Asserts position legs are ordered by absolute USD notional in `direction`, the
 * `sortBy: 'notional'` contract.
 */
function assertAbsoluteNotionalOrder(
  positions: NuanzeMarketPosition[],
  direction: NuanzeOpenPositionSortDirection,
  label: string,
): void {
  for (let i = 1; i < positions.length; i++) {
    const previous = positions[i - 1].notional.abs();
    const current = positions[i].notional.abs();
    assert.ok(
      direction === 'desc' ? previous.gte(current) : previous.lte(current),
      `${label}[${i - 1}] -> ${label}[${i}]: absolute notional should be ${direction === 'desc' ? 'non-increasing' : 'non-decreasing'} (${previous.toFixed()} then ${current.toFixed()})`,
    );
  }
}

/** Identifies one position leg within a market: owner, subaccount, and margin mode. */
function positionLegKey(position: NuanzeMarketPosition): string {
  return `${position.subaccountOwner}:${position.subaccountName}:${position.marginKind}`;
}

/**
 * Compares a default first page with an `includePrivate: true` first page of the same query, both
 * descending by `sortValue`. A full page covers values only down to its last row, so legs are
 * compared strictly above the other page's floor. Within that range every default leg must also
 * come back with `includePrivate`, because only Private Mode legs are filtered. Returns the legs
 * only the private-inclusive page holds: the Private Mode legs the default excluded.
 */
function privateOnlyLegs<T>(
  defaultRows: T[],
  inclusiveRows: T[],
  limit: number,
  sortValue: (row: T) => BigNumber,
  legKey: (row: T) => string,
  label: string,
): T[] {
  const floor = (rows: T[]) =>
    rows.length === limit ? sortValue(rows[rows.length - 1]) : null;
  const isAbove = (row: T, bound: BigNumber | null) =>
    bound === null || sortValue(row).gt(bound);

  const inclusiveFloor = floor(inclusiveRows);
  const inclusiveKeys = new Set(inclusiveRows.map(legKey));
  for (const row of defaultRows) {
    if (isAbove(row, inclusiveFloor)) {
      assert.ok(
        inclusiveKeys.has(legKey(row)),
        `${label}: public leg ${legKey(row)} should also be returned with includePrivate`,
      );
    }
  }

  const defaultFloor = floor(defaultRows);
  const defaultKeys = new Set(defaultRows.map(legKey));
  return inclusiveRows.filter(
    (row) => isAbove(row, defaultFloor) && !defaultKeys.has(legKey(row)),
  );
}

/**
 * Asserts the private-inclusive `dataUpdatedAt` is not older than the default one: it is the
 * newest snapshot over a superset of legs.
 */
function assertDataUpdatedAtNotOlder(
  publicOnly: { dataUpdatedAt: string | null },
  withPrivate: { dataUpdatedAt: string | null },
): void {
  if (publicOnly.dataUpdatedAt === null) {
    return;
  }
  assert.ok(
    withPrivate.dataUpdatedAt !== null &&
      Date.parse(withPrivate.dataUpdatedAt) >=
        Date.parse(publicOnly.dataUpdatedAt),
    `private-inclusive dataUpdatedAt (${withPrivate.dataUpdatedAt}) should not be older than the default (${publicOnly.dataUpdatedAt})`,
  );
}
