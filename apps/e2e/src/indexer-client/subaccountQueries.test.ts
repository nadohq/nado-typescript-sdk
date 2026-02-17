import { IndexerClient } from '@nadohq/indexer-client';
import {
  nowInSeconds,
  QUOTE_PRODUCT_ID,
  Subaccount,
  TimeInSeconds,
  toBigDecimal,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArray,
  assertDefined,
  assertPaginatedResponse,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

void describe(
  '[indexer-client]: subaccount queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: IndexerClient;
    let subaccount: Subaccount;

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
    });

    void test('getMultiSubaccountSnapshots returns valid snapshots', async () => {
      const summary = await client.getMultiSubaccountSnapshots({
        subaccounts: [subaccount],
        timestamps: [nowInSeconds(), nowInSeconds() - TimeInSeconds.DAY],
      });

      debugPrint('Summary', summary);
      assertDefined(summary, 'summary');
    });

    void test('getLinkedSignerWithRateLimit returns signer info', async () => {
      const linkedSigner = await client.getLinkedSignerWithRateLimit({
        subaccount,
      });

      debugPrint('Linked Signer', linkedSigner);
      assertDefined(linkedSigner, 'linkedSigner');
    });

    void test('getSubaccountDDA returns DDA info', async () => {
      const dda = await client.getSubaccountDDA({ subaccount });

      debugPrint('DDA', dda);
      assertDefined(dda, 'dda');
    });

    void test('getPaginatedSubaccountOrders returns paginated orders', async () => {
      const orders = await client.getPaginatedSubaccountOrders({
        limit: 1,
        startCursor: undefined,
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
      });

      debugPrint('Paginated Orders', orders);
      assertDefined(orders, 'orders');
      assertDefined(orders.meta, 'orders.meta');
      assert.equal(
        typeof orders.meta.hasMore,
        'boolean',
        'orders.meta.hasMore should be boolean',
      );
      assertArray(orders.orders, 'orders.orders');
    });

    void test('getEvents returns deposit/withdraw collateral events', async () => {
      const events = await client.getEvents({
        eventTypes: ['deposit_collateral', 'withdraw_collateral'],
        limit: {
          type: 'txs',
          value: 1,
        },
        maxTimestampInclusive: nowInSeconds(),
        subaccounts: [subaccount],
      });

      debugPrint('Raw Events', events);
      assertArray(events, 'events');
    });

    void test('getEvents supports ascending order', async () => {
      const eventsAsc = await client.getEvents({
        eventTypes: ['match_orders'],
        limit: {
          type: 'events',
          value: 1,
        },
        desc: false,
        subaccounts: [subaccount],
      });

      debugPrint('Raw Events Asc', eventsAsc);
      assertArray(eventsAsc, 'eventsAsc');
    });

    void test('getPaginatedSubaccountMatchEvents returns match events', async () => {
      const matchEvents = await client.getPaginatedSubaccountMatchEvents({
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
        productIds: [
          TEST_PRODUCT_IDS.PERP_BTC,
          TEST_PRODUCT_IDS.SPOT_ETH,
          TEST_PRODUCT_IDS.PERP_ETH,
        ],
        limit: 10,
      });

      debugPrint('Match events', matchEvents);
      assertPaginatedResponse(matchEvents, 'matchEvents');
      assertArray(matchEvents.events, 'matchEvents.events');
    });

    void test('getPaginatedSubaccountInterestFundingPayments returns payments', async () => {
      const interestFundingPayments =
        await client.getPaginatedSubaccountInterestFundingPayments({
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
          productIds: [
            QUOTE_PRODUCT_ID,
            TEST_PRODUCT_IDS.PERP_BTC,
            TEST_PRODUCT_IDS.SPOT_ETH,
            TEST_PRODUCT_IDS.PERP_ETH,
          ],
          limit: 10,
        });

      debugPrint('Interest & funding payments', interestFundingPayments);
      assertPaginatedResponse(
        interestFundingPayments,
        'interestFundingPayments',
      );
    });

    void test('getPaginatedSubaccountSettlementEvents returns settlement events', async () => {
      const settlementEvents =
        await client.getPaginatedSubaccountSettlementEvents({
          limit: 1,
          startCursor: undefined,
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
        });

      debugPrint('Paginated settlement events', settlementEvents);
      assertPaginatedResponse(settlementEvents, 'settlementEvents');
      assertArray(settlementEvents.events, 'settlementEvents.events');
    });

    void test('getPaginatedSubaccountCollateralEvents returns all collateral events', async () => {
      const allCollateralEvents =
        await client.getPaginatedSubaccountCollateralEvents({
          limit: 2,
          startCursor: undefined,
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
        });

      debugPrint('Paginated all collateral events', allCollateralEvents);
      assertPaginatedResponse(allCollateralEvents, 'allCollateralEvents');
      assertArray(allCollateralEvents.events, 'allCollateralEvents.events');
    });

    void test('getPaginatedSubaccountCollateralEvents filters by deposit events', async () => {
      const depositEvents = await client.getPaginatedSubaccountCollateralEvents(
        {
          limit: 1,
          startCursor: undefined,
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
          eventTypes: ['deposit_collateral'],
        },
      );

      debugPrint('Paginated deposit events', depositEvents);
      assertPaginatedResponse(depositEvents, 'depositEvents');
      assertArray(depositEvents.events, 'depositEvents.events');
    });

    void test('getPaginatedSubaccountCollateralEvents filters by withdrawal events', async () => {
      const withdrawEvents =
        await client.getPaginatedSubaccountCollateralEvents({
          limit: 1,
          maxTimestampInclusive: nowInSeconds() - TimeInSeconds.DAY,
          subaccountName: subaccount.subaccountName,
          subaccountOwner: subaccount.subaccountOwner,
          eventTypes: ['withdraw_collateral'],
        });

      debugPrint('Paginated withdrawal events', withdrawEvents);
      assertPaginatedResponse(withdrawEvents, 'withdrawEvents');
      assertArray(withdrawEvents.events, 'withdrawEvents.events');
    });

    void test('getSequencerBacklog returns backlog info', async () => {
      const sequencerBacklog = await client.getSequencerBacklog();

      debugPrint('Sequencer backlog', sequencerBacklog);
      assertDefined(sequencerBacklog, 'sequencerBacklog');
      assertDefined(
        sequencerBacklog.totalSubmissions,
        'sequencerBacklog.totalSubmissions',
      );
    });

    void describe('withdrawal queue estimation', () => {
      void test('computes place-in-queue from withdrawal events and backlog', async () => {
        const withdrawEvents =
          await client.getPaginatedSubaccountCollateralEvents({
            limit: 1,
            maxTimestampInclusive: nowInSeconds() - TimeInSeconds.DAY,
            subaccountName: subaccount.subaccountName,
            subaccountOwner: subaccount.subaccountOwner,
            eventTypes: ['withdraw_collateral'],
          });

        if (withdrawEvents.events.length === 0) {
          // No withdrawal events available — nothing to compute
          return;
        }

        const sequencerBacklog = await client.getSequencerBacklog();
        const withdrawalSubmissionIndex = toBigDecimal(
          withdrawEvents.events[0].submissionIndex,
        );
        const placeInQueue = withdrawalSubmissionIndex.minus(
          sequencerBacklog.totalSubmissions,
        );

        const withdrawalPlaceInQueue = placeInQueue.isNegative()
          ? toBigDecimal(0)
          : placeInQueue;

        const withdrawalEta = sequencerBacklog.txsPerSecond?.gt(0)
          ? withdrawalPlaceInQueue.div(sequencerBacklog.txsPerSecond)
          : null;

        debugPrint(
          'Withdrawal place in queue',
          withdrawalPlaceInQueue.toString(),
        );
        debugPrint('Withdrawal ETA', withdrawalEta?.toString() ?? 'N/A');

        assert.ok(
          withdrawalPlaceInQueue.gte(0),
          'place in queue should be >= 0',
        );
      });
    });

    void test('getPaginatedSubaccountNlpEvents returns NLP events', async () => {
      const nlpEvents = await client.getPaginatedSubaccountNlpEvents({
        limit: 1,
        startCursor: undefined,
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
      });

      debugPrint('Paginated NLP events', nlpEvents);
      assertPaginatedResponse(nlpEvents, 'nlpEvents');
      assertArray(nlpEvents.events, 'nlpEvents.events');
    });

    void test('getFastWithdrawalSignature returns a signature for a recent withdrawal', async () => {
      const latestWithdrawal = await client.getEvents({
        eventTypes: ['withdraw_collateral'],
        // Query an older event such that the fast withdrawal signature is available
        maxTimestampInclusive: nowInSeconds() - TimeInSeconds.DAY,
        limit: {
          type: 'txs',
          value: 1,
        },
      });

      if (latestWithdrawal.length === 0) {
        // No withdrawal events available — skip signature check
        return;
      }

      const fastWithdrawalSignature = await client.getFastWithdrawalSignature({
        idx: latestWithdrawal[0].submissionIndex,
      });

      debugPrint('Fast Withdrawal Signature', fastWithdrawalSignature);
      assertDefined(fastWithdrawalSignature, 'fastWithdrawalSignature');
    });

    void test('getPoints returns points for the wallet address', async () => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();

      const points = await client.getPoints({
        address: walletClient.account.address,
      });

      debugPrint('Points', points);
      assertDefined(points, 'points');
    });
  },
);
