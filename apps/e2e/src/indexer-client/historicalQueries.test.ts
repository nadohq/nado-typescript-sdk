import { IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, QUOTE_PRODUCT_ID, Subaccount } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import type { Address } from 'viem';
import {
  assertArray,
  assertArrayElements,
  assertBigDecimalFinite,
  assertDefined,
  assertNumber,
  assertPaginatedResponse,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { getServerError } from '../utils/getServerError';
import { createTestContext } from '../utils/runWithContext';
import { assertSubaccountListingShape } from '../utils/shapeAssertions';
import {
  TEST_CONTEST_IDS,
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

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      client = new IndexerClient({
        url: context.endpoints.indexer,
        walletClient,
      });
      subaccount = {
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: walletClient.account.address,
      };
      chainId = walletClient.chain.id;
      endpointAddr = context.contracts.endpoint;
    });

    void test('listSubaccounts returns subaccounts for address', async () => {
      const subaccounts = await client.listSubaccounts({
        address: subaccount.subaccountOwner,
        limit: 10,
      });

      debugPrint('List subaccounts', subaccounts);
      assertArray(subaccounts, 'subaccounts');
      if (subaccounts.length > 0) {
        assertArrayElements(
          subaccounts,
          assertSubaccountListingShape,
          'subaccounts',
        );
      }
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

    void test('updateLeaderboardRegistration succeeds or returns registration', async () => {
      try {
        const result = await client.updateLeaderboardRegistration({
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
          contestId: TEST_CONTEST_IDS.REGISTRATION,
          updateRegistration: {
            verifyingAddr: endpointAddr,
            chainId,
          },
        });

        debugPrint('Update leaderboard registration', result);
        assertDefined(result, 'updateLeaderboardRegistration result');
        if (result.registration != null) {
          assertDefined(
            result.registration.subaccount,
            'registration.subaccount',
          );
          assertNumber(result.registration.contestId, 'registration.contestId');
          assert.equal(
            result.registration.contestId,
            TEST_CONTEST_IDS.REGISTRATION,
            'contestId should match',
          );
          assertBigDecimalFinite(
            result.registration.updateTime,
            'registration.updateTime',
          );
        }
      } catch (e: unknown) {
        const serverError = getServerError(e);
        debugPrint('updateLeaderboardRegistration error', serverError);
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
      if (result.events.length > 0) {
        assertArrayElements(
          result.events,
          (event, label) => {
            assertBigDecimalFinite(event.timestamp, `${label}.timestamp`);
            assertString(event.submissionIndex, `${label}.submissionIndex`);
            assertDefined(event.quote, `${label}.quote`);
          },
          'result.events',
        );
      }
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
      if (result.events.length > 0) {
        assertArrayElements(
          result.events,
          (event, label) => {
            assertBigDecimalFinite(event.timestamp, `${label}.timestamp`);
            assertString(event.submissionIndex, `${label}.submissionIndex`);
            assertDefined(event.quote, `${label}.quote`);
          },
          'result.events',
        );
      }
    });
  },
);
