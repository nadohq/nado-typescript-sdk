import {
  NUANZE_COHORT_KEYS,
  NuanzeCohort,
  NuanzeCohortSeriesPoint,
} from '@nadohq/nuanze-client';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertBigNumberNonNegative,
  assertNonEmptyString,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
/** Four-hour samples over 30 days stay within the contract's cap. */
const MAX_SERIES_POINTS = 200;
/** Long and short shares are each rounded to 2dp, so their sum may drift by one cent. */
const PCT_SUM_TOLERANCE = 0.01;

void describe(
  '[nuanze-client]: cohorts',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(() => {
      tc = createTestContext();
    });

    void test('returns all six lifetime-PnL cohorts in order', async () => {
      const response = await tc.nuanze.getCohorts();
      debugPrint('Cohorts', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.deepEqual(
        response.items.map((cohort) => cohort.key),
        [...NUANZE_COHORT_KEYS],
        'items should be every cohort from most to least profitable',
      );
      assertArrayElements(response.items, assertCohortShape, 'items');
    });

    void test('tiles lifetime PnL with contiguous cohort bounds', async () => {
      const { items } = await tc.nuanze.getCohorts();

      assert.equal(items[0]?.pnlMax, null, 'top cohort should be unbounded');
      assert.equal(
        items[items.length - 1]?.pnlMin,
        null,
        'bottom cohort should be unbounded',
      );
      for (let index = 1; index < items.length; index++) {
        const higher = items[index - 1];
        const lower = items[index];
        assert.ok(higher?.pnlMin, `items[${index - 1}].pnlMin should be set`);
        assert.ok(lower?.pnlMax, `items[${index}].pnlMax should be set`);
        assert.ok(
          higher.pnlMin.eq(lower.pnlMax),
          `items[${index - 1}].pnlMin should equal items[${index}].pnlMax`,
        );
      }
    });
  },
);

function assertCohortShape(cohort: NuanzeCohort, label: string): void {
  assertNonEmptyString(cohort.label, `${label}.label`);
  if (cohort.pnlMin !== null) {
    assertBigNumberFinite(cohort.pnlMin, `${label}.pnlMin`);
  }
  if (cohort.pnlMax !== null) {
    assertBigNumberFinite(cohort.pnlMax, `${label}.pnlMax`);
  }
  assertNonNegativeInteger(cohort.walletCount, `${label}.walletCount`);
  assertBigNumberFinite(cohort.pnl, `${label}.pnl`);
  assertNonNegativeInteger(cohort.walletsInProfit, `${label}.walletsInProfit`);
  assertNonNegativeInteger(cohort.walletsInLoss, `${label}.walletsInLoss`);
  assert.equal(
    cohort.walletsInProfit + cohort.walletsInLoss,
    cohort.walletCount,
    `${label} profit and loss wallets should add up to walletCount`,
  );
  assertNonNegativeInteger(cohort.trades, `${label}.trades`);

  assert.equal(
    cohort.averagePnl === null,
    cohort.walletCount === 0,
    `${label}.averagePnl should be null exactly when the cohort is empty`,
  );
  if (cohort.averagePnl !== null) {
    assertBigNumberFinite(cohort.averagePnl, `${label}.averagePnl`);
    // Bounds are checked inclusively because averagePnl is rounded to 2dp.
    if (cohort.pnlMin !== null) {
      assert.ok(
        cohort.averagePnl.gte(cohort.pnlMin),
        `${label}.averagePnl should not be below pnlMin`,
      );
    }
    if (cohort.pnlMax !== null) {
      assert.ok(
        cohort.averagePnl.lte(cohort.pnlMax),
        `${label}.averagePnl should not be above pnlMax`,
      );
    }
  }

  assertBigNumberNonNegative(cohort.longNotional, `${label}.longNotional`);
  assertBigNumberNonNegative(cohort.shortNotional, `${label}.shortNotional`);
  assert.equal(
    cohort.longPct === null,
    cohort.shortPct === null,
    `${label}.longPct and shortPct should be null together`,
  );
  if (cohort.longPct === null) {
    assert.ok(
      cohort.longNotional.plus(cohort.shortNotional).isZero(),
      `${label}.longPct should only be null when the cohort is flat`,
    );
  }
  if (cohort.longPct !== null && cohort.shortPct !== null) {
    assertPct(cohort.longPct, `${label}.longPct`);
    assertPct(cohort.shortPct, `${label}.shortPct`);
    assert.ok(
      cohort.longPct
        .plus(cohort.shortPct)
        .minus(100)
        .abs()
        .lte(PCT_SUM_TOLERANCE),
      `${label}.longPct and shortPct should add up to 100`,
    );
  }

  assert.ok(
    cohort.series.length <= MAX_SERIES_POINTS,
    `${label}.series should not exceed ${MAX_SERIES_POINTS} points`,
  );
  assertArrayElements(cohort.series, assertSeriesPointShape, `${label}.series`);
  const timestamps = cohort.series.map((point) => Date.parse(point.timestamp));
  assert.deepEqual(
    timestamps,
    [...new Set(timestamps)].sort((a, b) => a - b),
    `${label}.series should be one point per sample, oldest first`,
  );
}

function assertSeriesPointShape(
  point: NuanzeCohortSeriesPoint,
  label: string,
): void {
  assert.match(point.timestamp, ISO_UTC, `${label}.timestamp`);
  assertNonNegativeInteger(point.walletCount, `${label}.walletCount`);
  if (point.longPct !== null) {
    assertPct(point.longPct, `${label}.longPct`);
  }
}

function assertPct(value: BigNumber, label: string): void {
  assertBigNumberFinite(value, label);
  assert.ok(value.gte(0) && value.lte(100), `${label} should be within 0-100`);
}
