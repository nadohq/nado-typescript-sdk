import { IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, QUOTE_PRODUCT_ID, Subaccount } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import type { Address } from 'viem';
import {
  assertArray,
  assertArrayElements,
  assertBigNumberFinite,
  assertDefined,
  assertNumber,
  assertPaginatedResponse,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getServerError } from '../utils/getServerError';
import { createTestContext } from '../utils/runWithContext';
import { assertSubaccountListingShape } from '../utils/shapeAssertions';
import {
  TEST_CONTEST_ID,
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[indexer-client]: historical queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;
    let subaccount: Subaccount;
    let chainId: number;
    let endpointAddr: Address;

    before(async () => {
      await delay(TEST_DELAYS.BETWEEN_SUITES);

      const tc = createTestContext();
      client = tc.indexer;
      subaccount = {
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
      };
      chainId = tc.chainId;
      endpointAddr = tc.endpointAddr;
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.BETWEEN_TESTS);
    });

    void test('listSubaccounts returns subaccounts for address', async () => {
      const subaccounts = await client.listSubaccounts({
        address: subaccount.subaccountOwner,
        limit: 10,
      });

      debugPrint('List subaccounts', subaccounts);
      assertArray(subaccounts, 'subaccounts');

      assertArrayElements(
        subaccounts,
        assertSubaccountListingShape,
        'subaccounts',
      );
    });

    void test('listSubaccounts supports pagination params', async () => {
      const subaccounts = await client.listSubaccounts({
        address: subaccount.subaccountOwner,
        start: 0,
        limit: 5,
      });

      debugPrint('List subaccounts paginated', subaccounts);
      assertArray(subaccounts, 'subaccounts');
      assert.ok(subaccounts.length <= 5, 'should return at most limit items');
    });

    void test('registerLeaderboard succeeds or returns registrations', async () => {
      try {
        const result = await client.registerLeaderboard({
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
          contestIds: [TEST_CONTEST_ID],
          registration: {
            verifyingAddr: endpointAddr,
            chainId,
          },
        });

        debugPrint('Register leaderboard', result);
        assertDefined(result, 'registerLeaderboard result');
        assertArray(result.registrations, 'registrations');
        for (const registration of result.registrations) {
          assertDefined(registration.subaccount, 'registration.subaccount');
          assertNumber(registration.contestId, 'registration.contestId');
          assertBigNumberFinite(
            registration.updateTime,
            'registration.updateTime',
          );
        }
      } catch (e: unknown) {
        const serverError = getServerError(e);
        debugPrint('registerLeaderboard error', serverError);
        assert.ok(
          serverError != null,
          'server error should be present on failure',
        );
      }
    });

    void test('getPaginatedSubaccountLiquidationEvents returns paginated response', async () => {
      const result = await client.getPaginatedSubaccountLiquidationEvents({
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
        limit: 5,
        startCursor: undefined,
        maxTimestampInclusive: nowInSeconds(),
      });

      debugPrint('Paginated liquidation events', result);
      assertDefined(result, 'liquidationEvents');
      assertPaginatedResponse(result, 'liquidationEvents');
      assertArray(result.events, 'result.events');
      assertArrayElements(
        result.events,
        (event, label) => {
          assertBigNumberFinite(event.timestamp, `${label}.timestamp`);
          assertString(event.submissionIndex, `${label}.submissionIndex`);
          assertDefined(event.quote, `${label}.quote`);
        },
        'result.events',
      );
    });

    void test('getPaginatedSubaccountLiquidationEvents with productIds filter', async () => {
      const result = await client.getPaginatedSubaccountLiquidationEvents({
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
        limit: 3,
        productIds: [TEST_PRODUCT_IDS.PERP_BTC, QUOTE_PRODUCT_ID],
      });

      debugPrint('Paginated liquidation events with productIds', result);
      assertDefined(result, 'liquidationEvents');
      assertPaginatedResponse(result, 'liquidationEvents');
      assertArray(result.events, 'result.events');
      assertArrayElements(
        result.events,
        (event, label) => {
          assertBigNumberFinite(event.timestamp, `${label}.timestamp`);
          assertString(event.submissionIndex, `${label}.submissionIndex`);
          assertDefined(event.quote, `${label}.quote`);
        },
        'result.events',
      );
    });
  },
);
