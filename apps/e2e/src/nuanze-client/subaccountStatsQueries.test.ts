import {
  GetNuanzeSubaccountStatsResponse,
  NUANZE_LEADERBOARD_TIMEFRAMES,
  NuanzeServerFailureError,
  NuanzeSubaccountCloseTrade,
} from '@nadohq/nuanze-client';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertBigNumberFinite,
  assertBigNumberNonNegative,
  assertEnumMember,
  assertHexString,
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
/** Well-formed bytes32 hex that belongs to no subaccount. */
const ABSENT_SUBACCOUNT_HEX =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
/** Long and short shares are each rounded to 2dp, so their sum may drift by one cent. */
const PCT_SUM_TOLERANCE = 0.01;

void describe(
  '[nuanze-client]: subaccount stats',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(() => {
      tc = createTestContext();
    });

    void test('returns stat cards consistent with the subaccount leaderboard', async () => {
      const timeframe = '7d' as const;
      const collection = await tc.nuanze.getSubaccountLeaderboard({
        timeframe,
        limit: 1,
      });
      const ranked = collection.items[0];
      assert.ok(ranked, 'subaccount leaderboard should contain an item');

      const response = await tc.nuanze.getSubaccountStats({
        subaccountHex: ranked.subaccountHex,
        timeframe,
      });
      debugPrint('Subaccount stats', response);

      assertSubaccountStatsResponseShape(response);
      assert.equal(response.timeframe, timeframe);
      assert.equal(response.subaccountHex, ranked.subaccountHex);
      assert.equal(
        response.owner,
        ranked.subaccountHex.slice(0, 42),
        'owner should be the first 20 bytes of the subaccount hex',
      );
      assert.equal(response.globalRank, ranked.globalRank);
      assert.ok(response.pnl, 'a ranked subaccount should have PnL');
      assert.ok(ranked.pnl, 'a ranked item should have PnL');
      assert.ok(
        response.pnl.eq(ranked.pnl),
        'pnl should match the leaderboard row',
      );
      assert.ok(ranked.volume, 'a ranked item should have volume');
      assert.ok(
        response.windowVolume.eq(ranked.volume),
        'windowVolume should match the leaderboard row volume',
      );
    });

    void test('rejects malformed and unknown subaccount identifiers', async () => {
      try {
        await tc.nuanze.getSubaccountStats({
          subaccountHex: 'not-a-subaccount',
        });
        assert.fail(
          'expected INVALID_SUBACCOUNT for a malformed subaccount hex',
        );
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'INVALID_SUBACCOUNT');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }

      try {
        await tc.nuanze.getSubaccountStats({
          subaccountHex: ABSENT_SUBACCOUNT_HEX,
        });
        assert.fail('expected WALLET_NOT_FOUND for an unknown subaccount hex');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'WALLET_NOT_FOUND');
        assert.equal(error.httpStatus, 404);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });
  },
);

function assertSubaccountStatsResponseShape(
  response: GetNuanzeSubaccountStatsResponse,
): void {
  assert.match(response.asOf, ISO_UTC, 'asOf should be a UTC ISO timestamp');
  assertEnumMember(
    response.timeframe,
    NUANZE_LEADERBOARD_TIMEFRAMES,
    'timeframe',
  );
  assertHexString(response.subaccountHex, 'subaccountHex');
  assert.match(
    response.subaccountHex,
    /^0x[0-9a-f]{64}$/,
    'subaccountHex should be lowercase bytes32',
  );
  assert.match(
    response.owner,
    /^0x[0-9a-f]{40}$/,
    'owner should be a lowercase address',
  );
  assertNonEmptyString(response.subaccountName, 'subaccountName');

  assertNonNegativeInteger(response.wins, 'wins');
  assertNonNegativeInteger(response.losses, 'losses');
  assertNonNegativeInteger(response.trades, 'trades');
  assertNonNegativeInteger(response.productCount, 'productCount');
  assert.equal(
    response.productCount,
    response.productIds.length,
    'productCount should equal productIds.length',
  );
  if (response.winRate !== null) {
    assertBigNumberFinite(response.winRate, 'winRate');
  }
  for (const [field, rank] of [
    ['globalRank', response.globalRank],
    ['filteredRank', response.filteredRank],
  ] as const) {
    if (rank !== null) {
      assertNumber(rank, field);
      assert.ok(rank >= 1, `${field} should be >= 1`);
    }
  }

  assertBigNumberNonNegative(response.cumulativeVolume, 'cumulativeVolume');
  assertBigNumberNonNegative(response.windowVolume, 'windowVolume');
  assert.ok(
    response.windowVolume.lte(response.cumulativeVolume),
    'windowVolume should not exceed cumulativeVolume',
  );
  assertBigNumberFinite(response.windowPnl, 'windowPnl');
  if (response.averageLeverage !== null) {
    assertBigNumberNonNegative(response.averageLeverage, 'averageLeverage');
  }

  if (response.bestTrade !== null) {
    assertCloseTradeShape(response.bestTrade, 'bestTrade');
  }
  if (response.worstTrade !== null) {
    assertCloseTradeShape(response.worstTrade, 'worstTrade');
  }
  if (response.bestTrade !== null && response.worstTrade !== null) {
    assert.ok(
      response.bestTrade.realizedPnl.gte(response.worstTrade.realizedPnl),
      'bestTrade should not realize less than worstTrade',
    );
  }

  const bias = response.longShortBias;
  assertBigNumberNonNegative(bias.longNotional, 'longShortBias.longNotional');
  assertBigNumberNonNegative(bias.shortNotional, 'longShortBias.shortNotional');
  assert.equal(
    bias.longPct === null,
    bias.shortPct === null,
    'longShortBias.longPct and shortPct should be null together',
  );
  if (bias.longPct !== null && bias.shortPct !== null) {
    assertPct(bias.longPct, 'longShortBias.longPct');
    assertPct(bias.shortPct, 'longShortBias.shortPct');
    assert.ok(
      bias.longPct.plus(bias.shortPct).minus(100).abs().lte(PCT_SUM_TOLERANCE),
      'longShortBias percentages should add up to 100',
    );
  }

  if (response.mostTradedMarket !== null) {
    assertNonNegativeInteger(
      response.mostTradedMarket.productId,
      'mostTradedMarket.productId',
    );
    assertNonEmptyString(
      response.mostTradedMarket.ticker,
      'mostTradedMarket.ticker',
    );
    assertNonNegativeInteger(
      response.mostTradedMarket.trades,
      'mostTradedMarket.trades',
    );
    assertBigNumberNonNegative(
      response.mostTradedMarket.volume,
      'mostTradedMarket.volume',
    );
  }
}

function assertCloseTradeShape(
  trade: NuanzeSubaccountCloseTrade,
  label: string,
): void {
  assertNonNegativeInteger(trade.tradeId, `${label}.tradeId`);
  assertNonNegativeInteger(trade.productId, `${label}.productId`);
  assertNonEmptyString(trade.ticker, `${label}.ticker`);
  assertBigNumberFinite(trade.realizedPnl, `${label}.realizedPnl`);
  assert.match(trade.matchedAt, ISO_UTC, `${label}.matchedAt`);
}

function assertPct(value: BigNumber, label: string): void {
  assertBigNumberFinite(value, label);
  assert.ok(value.gte(0) && value.lte(100), `${label} should be within 0-100`);
}
