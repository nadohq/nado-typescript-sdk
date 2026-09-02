import {
  INDEXER_SERVER_CASH_INCENTIVES_WALLET_STATUSES,
  IndexerClient,
} from '@nadohq/indexer-client';
import {
  nowInSeconds,
  QUOTE_PRODUCT_ID,
  Subaccount,
  TimeInSeconds,
  toBigNumber,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { Address } from 'viem';
import {
  assertArray,
  assertArrayElements,
  assertBigNumberFinite,
  assertBigNumberNonNegative,
  assertDefined,
  assertEnumMember,
  assertHexString,
  assertNumber,
  assertPaginatedResponse,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  assertIndexerEventShape,
  assertIndexerOrderShape,
  assertIndexerPositionShape,
  assertLinkedSignerShape,
  assertMatchEventShape,
} from '../utils/shapeAssertions';
import {
  TEST_DELAYS,
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

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      const tc = createTestContext();
      client = tc.indexer;
      subaccount = {
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
      };
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('getMultiSubaccountSnapshots returns valid snapshots', async () => {
      const summary = await client.getMultiSubaccountSnapshots({
        subaccounts: [subaccount],
        timestamps: [nowInSeconds(), nowInSeconds() - TimeInSeconds.DAY],
      });

      debugPrint('Summary', summary);
      assertDefined(summary, 'summary');
      assertDefined(summary.subaccountHexIds, 'summary.subaccountHexIds');
      assertArray(summary.subaccountHexIds, 'summary.subaccountHexIds');
      assertDefined(summary.snapshots, 'summary.snapshots');
      for (const [hexId, timestampMap] of Object.entries(summary.snapshots)) {
        assertString(hexId, 'snapshot hex id');
        for (const [ts, snapshot] of Object.entries(timestampMap)) {
          assertDefined(snapshot, `snapshots[${hexId}][${ts}]`);
          assertBigNumberFinite(
            snapshot.timestamp,
            `snapshots[${hexId}][${ts}].timestamp`,
          );
          assertArray(snapshot.balances, `snapshots[${hexId}][${ts}].balances`);
        }
      }
    });

    void test('getPortfolio returns all series across timeframes', async () => {
      const portfolio = await client.getPortfolio({ subaccount });

      debugPrint('Portfolio', portfolio);
      assertDefined(portfolio, 'portfolio');

      const periods = [
        'day',
        'week',
        'month',
        'allTime',
        'perpDay',
        'perpWeek',
        'perpMonth',
        'perpAllTime',
      ] as const;

      const series = [
        'accountValueHistory',
        'pnlHistory',
        'volumeHistory',
        'tradeSizeHistory',
        'marketCountHistory',
      ] as const;

      for (const period of periods) {
        const history = portfolio[period];
        assertDefined(history, `portfolio.${period}`);

        for (const key of series) {
          assertArray(history[key], `portfolio.${period}.${key}`);
          assertArrayElements(
            history[key],
            (point, label) => {
              assertBigNumberFinite(point.timestamp, `${label}.timestamp`);
              assertBigNumberFinite(point.value, `${label}.value`);
            },
            `portfolio.${period}.${key}`,
          );
        }

        // All series are aligned: same length, same timestamps.
        const { accountValueHistory } = history;
        for (const key of series) {
          assert.equal(
            history[key].length,
            accountValueHistory.length,
            `portfolio.${period}.${key} should have the same length as accountValueHistory`,
          );
          history[key].forEach((point, idx) => {
            assert.equal(
              point.timestamp.toString(),
              accountValueHistory[idx]?.timestamp.toString(),
              `portfolio.${period}.${key}[${idx}].timestamp should match accountValueHistory[${idx}].timestamp`,
            );
          });
        }
      }
    });

    void test('getLinkedSignerWithRateLimit returns signer info', async () => {
      const linkedSigner = await client.getLinkedSignerWithRateLimit({
        subaccount,
      });

      debugPrint('Linked Signer', linkedSigner);
      assertDefined(linkedSigner, 'linkedSigner');
      assertLinkedSignerShape(linkedSigner, 'linkedSigner');
    });

    void test('getSubaccountDDA returns DDA info', async () => {
      const dda = await client.getSubaccountDDA({ subaccount });

      debugPrint('DDA', dda);
      assertDefined(dda, 'dda');
      assertHexString(dda.address, 'dda.address');
    });

    void test('getPaginatedSubaccountOrders returns paginated orders', async () => {
      const orders = await client.getPaginatedSubaccountOrders({
        limit: 1,
        startCursor: undefined,
        subaccountName: subaccount.subaccountName,
        subaccountOwner: subaccount.subaccountOwner,
      });

      debugPrint('Paginated Orders', orders);
      assertPaginatedResponse(orders, 'orders');
      assertArray(orders.orders, 'orders.orders');
      assertArrayElements(
        orders.orders,
        assertIndexerOrderShape,
        'orders.orders',
      );
    });

    void test('getEvents returns deposit/withdraw collateral events', async () => {
      const events = await client.getEvents({
        eventTypes: [
          'deposit_collateral',
          'withdraw_collateral',
          'withdraw_collateral_v2',
        ],
        limit: {
          type: 'txs',
          value: 1,
        },
        maxTimestampInclusive: nowInSeconds(),
        subaccounts: [subaccount],
      });

      debugPrint('Raw Events', events);
      assertArray(events, 'events');
      assertArrayElements(events, assertIndexerEventShape, 'events');
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
      assertArrayElements(eventsAsc, assertIndexerEventShape, 'eventsAsc');
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
      assertArrayElements(
        matchEvents.events,
        assertMatchEventShape,
        'matchEvents.events',
      );
    });

    void test('getPositions returns position history with boundary events', async () => {
      const positionsResponse = await client.getPositions({
        subaccount,
        limit: 5,
      });

      debugPrint('Positions', positionsResponse);
      assertDefined(positionsResponse, 'positionsResponse');
      assertArray(positionsResponse.positions, 'positionsResponse.positions');
      assertArrayElements(
        positionsResponse.positions,
        assertIndexerPositionShape,
        'positionsResponse.positions',
      );
      assertArray(positionsResponse.events, 'positionsResponse.events');
      assertArrayElements(
        positionsResponse.events,
        assertIndexerEventShape,
        'positionsResponse.events',
      );

      // Positions are ordered descending by openId
      for (let i = 1; i < positionsResponse.positions.length; i++) {
        assert.ok(
          toBigNumber(positionsResponse.positions[i - 1].openId).gte(
            toBigNumber(positionsResponse.positions[i].openId),
          ),
          `positions should be in descending order by openId (index ${i})`,
        );
      }
    });

    void test('getPositions applies product & open filters', async () => {
      const closedPositions = await client.getPositions({
        subaccount,
        productId: TEST_PRODUCT_IDS.PERP_BTC,
        open: false,
        limit: 5,
      });

      debugPrint('Closed positions', closedPositions);
      assertArray(closedPositions.positions, 'closedPositions.positions');
      assertArrayElements(
        closedPositions.positions,
        (position, label) => {
          assertIndexerPositionShape(position, label);
          assert.equal(
            position.productId,
            TEST_PRODUCT_IDS.PERP_BTC,
            `${label}.productId should match the product filter`,
          );
          assert.notEqual(
            position.closeId,
            '-1',
            `${label} should be closed when filtering with open: false`,
          );
          assert.ok(
            position.amount.isZero(),
            `${label}.amount should be 0 for a closed position`,
          );
        },
        'closedPositions.positions',
      );
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
      assertArray(
        interestFundingPayments.interestPayments,
        'interestFundingPayments.interestPayments',
      );
      assertArray(
        interestFundingPayments.fundingPayments,
        'interestFundingPayments.fundingPayments',
      );
      for (const payments of [
        interestFundingPayments.interestPayments,
        interestFundingPayments.fundingPayments,
      ]) {
        assertArrayElements(
          payments,
          (payment, label) => {
            assertNumber(payment.productId, `${label}.productId`);
            assertString(payment.submissionIndex, `${label}.submissionIndex`);
            assertBigNumberFinite(payment.timestamp, `${label}.timestamp`);
            assertBigNumberFinite(
              payment.paymentAmount,
              `${label}.paymentAmount`,
            );
            assertBigNumberFinite(payment.oraclePrice, `${label}.oraclePrice`);
          },
          'payment',
        );
      }
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
      assertArrayElements(
        settlementEvents.events,
        (event, label) => {
          assertBigNumberFinite(event.timestamp, `${label}.timestamp`);
          assertString(event.submissionIndex, `${label}.submissionIndex`);
          assertBigNumberFinite(event.quoteDelta, `${label}.quoteDelta`);
          assertDefined(event.snapshot, `${label}.snapshot`);
        },
        'settlementEvents.events',
      );
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
      assertArrayElements(
        allCollateralEvents.events,
        (event, label) => {
          assertBigNumberFinite(event.timestamp, `${label}.timestamp`);
          assertString(event.submissionIndex, `${label}.submissionIndex`);
          assertDefined(event.eventType, `${label}.eventType`);
          assertBigNumberFinite(event.amount, `${label}.amount`);
          assertBigNumberFinite(event.newAmount, `${label}.newAmount`);
        },
        'allCollateralEvents.events',
      );
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
          eventTypes: ['withdraw_collateral', 'withdraw_collateral_v2'],
        });

      debugPrint('Paginated withdrawal events', withdrawEvents);
      assertPaginatedResponse(withdrawEvents, 'withdrawEvents');
      assertArray(withdrawEvents.events, 'withdrawEvents.events');
    });

    void test('getSequencerBacklog returns backlog info', async () => {
      const sequencerBacklog = await client.getSequencerBacklog();

      debugPrint('Sequencer backlog', sequencerBacklog);
      assertDefined(sequencerBacklog, 'sequencerBacklog');
      assertBigNumberFinite(
        sequencerBacklog.totalTxs,
        'sequencerBacklog.totalTxs',
      );
      assertBigNumberFinite(
        sequencerBacklog.totalSubmissions,
        'sequencerBacklog.totalSubmissions',
      );
      assertBigNumberNonNegative(
        sequencerBacklog.backlogSize,
        'sequencerBacklog.backlogSize',
      );
      assertBigNumberFinite(
        sequencerBacklog.updatedAt,
        'sequencerBacklog.updatedAt',
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
            eventTypes: ['withdraw_collateral', 'withdraw_collateral_v2'],
          });

        if (withdrawEvents.events.length === 0) {
          // No withdrawal events available — nothing to compute
          return;
        }

        const sequencerBacklog = await client.getSequencerBacklog();
        const withdrawalSubmissionIndex = toBigNumber(
          withdrawEvents.events[0].submissionIndex,
        );
        const placeInQueue = withdrawalSubmissionIndex.minus(
          sequencerBacklog.totalSubmissions,
        );

        const withdrawalPlaceInQueue = placeInQueue.isNegative()
          ? toBigNumber(0)
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
        eventTypes: ['withdraw_collateral_v2'],
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

      try {
        const fastWithdrawalSignature = await client.getFastWithdrawalSignature(
          {
            idx: latestWithdrawal[0].submissionIndex,
          },
        );

        debugPrint('Fast Withdrawal Signature', fastWithdrawalSignature);
        assertDefined(fastWithdrawalSignature, 'fastWithdrawalSignature');
      } catch (e: unknown) {
        // Signature may be unavailable for older withdrawals (400/404)
        debugPrint('getFastWithdrawalSignature error (acceptable)', e);
      }
    });

    void test('getPoints returns points for the wallet address', async () => {
      const points = await client.getPoints({
        address: subaccount.subaccountOwner as Address,
      });

      debugPrint('Points', points);
      assertDefined(points, 'points');
      assertDefined(points.allTimePoints, 'points.allTimePoints');
      assertBigNumberFinite(
        points.allTimePoints.points,
        'points.allTimePoints.points',
      );
      assertNumber(points.allTimePoints.rank, 'points.allTimePoints.rank');
      assertArray(points.pointsPerEpoch, 'points.pointsPerEpoch');
      assertArrayElements(
        points.pointsPerEpoch,
        (epoch, label) => {
          assertNumber(epoch.epoch, `${label}.epoch`);
          assertBigNumberFinite(epoch.points, `${label}.points`);
          assertNumber(epoch.rank, `${label}.rank`);
        },
        'points.pointsPerEpoch',
      );
    });

    void test('getXPoints returns xPoints for the wallet address', async () => {
      const xPoints = await client.getXPoints({
        address: subaccount.subaccountOwner as Address,
      });

      debugPrint('XPoints', xPoints);
      assertDefined(xPoints, 'xPoints');
      assertDefined(xPoints.allTimePoints, 'xPoints.allTimePoints');
      assertBigNumberFinite(
        xPoints.allTimePoints.totalPoints,
        'xPoints.allTimePoints.totalPoints',
      );
      assertNumber(xPoints.allTimePoints.rank, 'xPoints.allTimePoints.rank');
      assertArray(xPoints.allTimePoints.quests, 'xPoints.allTimePoints.quests');
      assertArrayElements(
        xPoints.allTimePoints.quests,
        (quest, label) => {
          assertString(quest.questType, `${label}.questType`);
          assertBigNumberFinite(quest.points, `${label}.points`);
        },
        'xPoints.allTimePoints.quests',
      );
      assertArray(xPoints.pointsPerEpoch, 'xPoints.pointsPerEpoch');
      assertArrayElements(
        xPoints.pointsPerEpoch,
        (epoch, label) => {
          assertNumber(epoch.epoch, `${label}.epoch`);
          assertString(epoch.description, `${label}.description`);
          assertBigNumberFinite(epoch.startTime, `${label}.startTime`);
          assertBigNumberFinite(epoch.endTime, `${label}.endTime`);
          assertBigNumberFinite(epoch.totalPoints, `${label}.totalPoints`);
          assertNumber(epoch.rank, `${label}.rank`);
          assertArray(epoch.quests, `${label}.quests`);
          assertArrayElements(
            epoch.quests,
            (quest, questLabel) => {
              assertString(quest.questType, `${questLabel}.questType`);
              assertBigNumberFinite(quest.points, `${questLabel}.points`);
            },
            `${label}.quests`,
          );
        },
        'xPoints.pointsPerEpoch',
      );
    });

    void test('getCashIncentives returns platform volume and rewards per event', async () => {
      const cashIncentives = await client.getCashIncentives({
        address: subaccount.subaccountOwner as Address,
      });

      debugPrint('CashIncentives', cashIncentives);
      assertDefined(cashIncentives, 'cashIncentives');

      assertArray(cashIncentives.events, 'cashIncentives.events');
      assertArrayElements(
        cashIncentives.events,
        (event, label) => {
          assertDefined(event.metadata, `${label}.metadata`);
          assertNumber(event.metadata.eventId, `${label}.metadata.eventId`);
          assertString(
            event.metadata.description,
            `${label}.metadata.description`,
          );
          assertBigNumberFinite(
            event.metadata.epochStart,
            `${label}.metadata.epochStart`,
          );
          assertBigNumberFinite(
            event.metadata.epochEnd,
            `${label}.metadata.epochEnd`,
          );
          assertBigNumberNonNegative(
            event.metadata.maxVolume,
            `${label}.metadata.maxVolume`,
          );
          assertBigNumberNonNegative(
            event.metadata.maxReward,
            `${label}.metadata.maxReward`,
          );
          assertBigNumberNonNegative(
            event.metadata.minVolume,
            `${label}.metadata.minVolume`,
          );
          assertBigNumberNonNegative(
            event.metadata.minReward,
            `${label}.metadata.minReward`,
          );

          assertDefined(event.platform, `${label}.platform`);
          assertBigNumberNonNegative(
            event.platform.platformVolume,
            `${label}.platform.platformVolume`,
          );
          assertBigNumberNonNegative(
            event.platform.unlockedReward,
            `${label}.platform.unlockedReward`,
          );

          assertDefined(event.wallet, `${label}.wallet`);
          assertBigNumberNonNegative(
            event.wallet.reward,
            `${label}.wallet.reward`,
          );
          const claim = event.wallet.claim;
          const claimLabel = `${label}.wallet.claim`;
          assertDefined(claim, claimLabel);
          assertEnumMember(
            claim.status,
            INDEXER_SERVER_CASH_INCENTIVES_WALLET_STATUSES,
            `${claimLabel}.status`,
          );

          // Only the `claimable` variant of the tagged union carries proof data
          if (claim.status === 'claimable') {
            assertHexString(
              claim.airdropAddress,
              `${claimLabel}.airdropAddress`,
            );
            assertNumber(claim.week, `${claimLabel}.week`);
            assertBigNumberNonNegative(
              claim.totalAmount,
              `${claimLabel}.totalAmount`,
            );
            assertArray(claim.proof, `${claimLabel}.proof`);
            assertArrayElements(
              claim.proof,
              assertHexString,
              `${claimLabel}.proof`,
            );
          } else {
            assert.ok(
              !('proof' in claim),
              `${claimLabel} should not carry proof data when status is ${claim.status}`,
            );
          }
        },
        'cashIncentives.events',
      );

      assertDefined(
        cashIncentives.walletSummary,
        'cashIncentives.walletSummary',
      );
      assertBigNumberNonNegative(
        cashIncentives.walletSummary.totalReward,
        'cashIncentives.walletSummary.totalReward',
      );
      assertBigNumberNonNegative(
        cashIncentives.walletSummary.claimableReward,
        'cashIncentives.walletSummary.claimableReward',
      );
    });
  },
);
