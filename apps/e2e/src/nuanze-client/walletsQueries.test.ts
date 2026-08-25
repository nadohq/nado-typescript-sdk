import {
  NUANZE_COVERAGES,
  NUANZE_MARKET_VENUES,
  NUANZE_PNL_WINDOWS,
  NUANZE_POSITION_SIDES,
  NuanzeServerFailureError,
  NuanzeWalletPosition,
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
  '[nuanze-client]: wallets',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;
    let address: string;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
      const board = await tc.nuanze.getLeaderboard({ limit: 1 });
      assert.ok(
        board.items[0],
        'expected at least one leaderboard row to use as a wallet fixture',
      );
      address = board.items[0].address;
    });

    void test('returns a replica-backed wallet summary', async () => {
      const response = await tc.nuanze.getWalletSummary({ address });
      debugPrint('Wallet summary', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.equal(response.address, address);
      assertEnumMember(response.pnlWindow, NUANZE_PNL_WINDOWS, 'pnlWindow');
      assertEnumMember(response.coverage, NUANZE_COVERAGES, 'coverage');
      assertBigNumberFinite(response.accountPnl, 'accountPnl');
      assertBigNumberFinite(response.windowPnl, 'windowPnl');
      assertNonNegativeInteger(response.subaccountCount, 'subaccountCount');
      assert.ok(
        response.subaccountCount >= 1,
        'subaccountCount should be >= 1',
      );
      assert.match(response.snapshotAt, ISO_UTC, 'snapshotAt');
    });

    void test('lists wallet position snapshots', async () => {
      const response = await tc.nuanze.getWalletPositions({ address });
      debugPrint('Wallet positions', response);

      assert.equal(response.address, address);
      assert.equal(response.count, response.positions.length);
      assert.ok(response.count <= 500, 'positions should be capped at 500');
      assertArrayElements(
        response.positions,
        assertWalletPositionShape,
        'positions',
      );
    });

    void test('lists wallet trades newest first', async () => {
      const response = await tc.nuanze.getWalletTrades({
        address,
        limit: 20,
      });
      debugPrint('Wallet trades', response);

      assert.equal(response.address, address);
      assert.match(response.asOf, ISO_UTC, 'asOf');
      for (let i = 1; i < response.trades.length; i++) {
        const prev = response.trades[i - 1];
        const cur = response.trades[i];
        assert.ok(
          prev.matchedAt > cur.matchedAt ||
            (prev.matchedAt === cur.matchedAt && prev.id > cur.id),
          'trades should be ordered by matchedAt then id descending',
        );
      }
    });

    void test('returns wallet account PnL', async () => {
      const response = await tc.nuanze.getWalletPnl({
        address,
        window: '30d',
      });
      debugPrint('Wallet PnL', response);

      assert.equal(response.address, address);
      assert.equal(response.window, '30d');
      assertEnumMember(response.coverage, NUANZE_COVERAGES, 'coverage');
      assertBigNumberFinite(response.windowPnl, 'windowPnl');
      assert.match(response.windowStart, ISO_UTC, 'windowStart');
      assert.match(response.windowEnd, ISO_UTC, 'windowEnd');
    });

    void test('returns a sampled wallet series', async () => {
      const response = await tc.nuanze.getWalletPnlSeries({
        address,
        metric: 'pnl',
        window: '30d',
      });
      debugPrint('Wallet PnL series', response);

      assert.equal(response.address, address);
      assert.equal(response.metric, 'pnl');
      assert.ok(
        response.points.length <= 1000,
        'points should be capped at 1000',
      );
      const timestamps = response.points.map((point) => point.timestamp);
      assert.deepEqual(
        timestamps,
        [...timestamps].sort(),
        'points should be ordered by timestamp ascending',
      );
    });

    void test('rejects an invalid address with INVALID_ADDRESS', async () => {
      try {
        await tc.nuanze.getWalletSummary({ address: 'not-an-address' });
        assert.fail('expected INVALID_ADDRESS for a malformed address');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'INVALID_ADDRESS');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });
  },
);

function assertWalletPositionShape(
  position: NuanzeWalletPosition,
  label: string,
): void {
  assertNonEmptyString(position.subaccountName, `${label}.subaccountName`);
  assertNumber(position.productId, `${label}.productId`);
  assertNonEmptyString(position.symbol, `${label}.symbol`);
  assertNonEmptyString(position.ticker, `${label}.ticker`);
  assertEnumMember(position.venue, NUANZE_MARKET_VENUES, `${label}.venue`);
  assertEnumMember(position.side, NUANZE_POSITION_SIDES, `${label}.side`);
  assertBoolean(position.isSpot, `${label}.isSpot`);
  assertBigNumberFinite(position.amount, `${label}.amount`);
  assertBigNumberFinite(position.oraclePrice, `${label}.oraclePrice`);
  assertBigNumberFinite(position.notional, `${label}.notional`);
  assertBigNumberFinite(position.unrealizedPnl, `${label}.unrealizedPnl`);
  assert.match(position.snapshotAt, ISO_UTC, `${label}.snapshotAt`);
}
