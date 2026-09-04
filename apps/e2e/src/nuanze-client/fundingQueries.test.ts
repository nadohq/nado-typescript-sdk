import {
  NUANZE_MARKET_VENUES,
  NuanzeFundingRate,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertEnumMember,
  assertNonEmptyString,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: funding',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(() => {
      tc = createTestContext();
    });

    void test('lists latest perpetual funding rates', async () => {
      const response = await tc.nuanze.getFundingRates();
      debugPrint('Funding rates', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.ok(response.rates.length > 0, 'rates should not be empty');
      assertArrayElements(response.rates, assertFundingRateShape, 'rates');

      for (const rate of response.rates) {
        assert.equal(rate.venue, 'perp', `${rate.ticker} should be a perp`);
        assert.equal(rate.productId % 2, 0, `${rate.ticker} productId`);
      }
    });

    void test('rejects a spot venue with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getFundingRates({
          venue: 'spot' as 'perp',
        });
        assert.fail('expected BAD_REQUEST for a spot venue');
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

function assertFundingRateShape(rate: NuanzeFundingRate, label: string): void {
  assertNumber(rate.productId, `${label}.productId`);
  assertNonEmptyString(rate.symbol, `${label}.symbol`);
  assertNonEmptyString(rate.ticker, `${label}.ticker`);
  assertEnumMember(rate.venue, NUANZE_MARKET_VENUES, `${label}.venue`);
  assertBigNumberFinite(rate.rate, `${label}.rate`);
  assertBigNumberFinite(rate.annualizedRate, `${label}.annualizedRate`);
  assert.match(rate.observedAt, ISO_UTC, `${label}.observedAt`);
}
