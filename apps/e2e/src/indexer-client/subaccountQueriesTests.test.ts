import { QUOTE_PRODUCT_ID, Subaccount } from '@vertex-protocol/contracts';
import { IndexerClient } from '@vertex-protocol/indexer-client';
import {
  nowInSeconds,
  TimeInSeconds,
  toBigDecimal,
} from '@vertex-protocol/utils';
import { RunContext } from '../utils/types';
import { runWithContext } from '../utils/runWithContext';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';

async function subaccountQueriesTests(context: RunContext) {
  const walletClient = context.getWalletClient();

  const client = new IndexerClient({
    url: context.endpoints.indexer,
    walletClient,
  });

  const subaccount: Subaccount = {
    subaccountName: 'default',
    subaccountOwner: walletClient.account.address,
  };

  const summary = await client.getMultiSubaccountSnapshots({
    subaccounts: [subaccount],
    timestamps: [nowInSeconds(), nowInSeconds() - TimeInSeconds.DAY],
  });

  debugPrint('Summary', summary);

  const linkedSigner = await client.getLinkedSignerWithRateLimit({
    subaccount,
  });

  debugPrint('Linked Signer', linkedSigner);

  const referralCode = await client.getReferralCode({
    subaccount,
  });

  debugPrint('Referral code', referralCode);

  const orders = await client.getPaginatedSubaccountOrders({
    limit: 1,
    startCursor: undefined,
    subaccountName: subaccount.subaccountName,
    subaccountOwner: subaccount.subaccountOwner,
  });

  debugPrint('Paginated Orders', orders);

  const events = await client.getEvents({
    eventTypes: ['deposit_collateral', 'withdraw_collateral'],
    limit: {
      type: 'txs',
      value: 1,
    },
    maxTimestampInclusive: nowInSeconds(),
    subaccount,
  });

  debugPrint('Raw Events', events);

  const eventsAsc = await client.getEvents({
    eventTypes: ['match_orders'],
    limit: {
      type: 'events',
      value: 1,
    },
    desc: false,
    subaccount,
  });

  debugPrint('Raw Events Asc', eventsAsc);

  const matchEvents = await client.getPaginatedSubaccountMatchEvents({
    subaccountName: subaccount.subaccountName,
    subaccountOwner: subaccount.subaccountOwner,
    productIds: [2, 3, 4],
    limit: 10,
  });

  debugPrint('Match events', matchEvents);

  const interestFundingPayments =
    await client.getPaginatedSubaccountInterestFundingPayments({
      subaccountName: subaccount.subaccountName,
      subaccountOwner: subaccount.subaccountOwner,
      productIds: [QUOTE_PRODUCT_ID, 2, 3, 4],
      limit: 10,
    });

  debugPrint('Interest & funding payments', interestFundingPayments);

  const settlementEvents = await client.getPaginatedSubaccountSettlementEvents({
    limit: 1,
    startCursor: undefined,
    subaccountName: subaccount.subaccountName,
    subaccountOwner: subaccount.subaccountOwner,
  });

  debugPrint('Paginated settlement events', settlementEvents);

  const allCollateralEvents =
    await client.getPaginatedSubaccountCollateralEvents({
      limit: 2,
      startCursor: '507204',
      subaccountName: subaccount.subaccountName,
      subaccountOwner: subaccount.subaccountOwner,
    });

  debugPrint('Paginated all collateral events', allCollateralEvents);

  const depositEvents = await client.getPaginatedSubaccountCollateralEvents({
    limit: 1,
    startCursor: '507204',
    subaccountName: subaccount.subaccountName,
    subaccountOwner: subaccount.subaccountOwner,
    eventTypes: ['deposit_collateral'],
  });

  debugPrint('Paginated deposit events', depositEvents);

  const withdrawEvents = await client.getPaginatedSubaccountCollateralEvents({
    limit: 1,
    maxTimestampInclusive: nowInSeconds() - TimeInSeconds.DAY,
    subaccountName: subaccount.subaccountName,
    subaccountOwner: subaccount.subaccountOwner,
    eventTypes: ['withdraw_collateral'],
  });

  debugPrint('Paginated withdrawal events', withdrawEvents);

  const sequencerBacklog = await client.getSequencerBacklog();

  debugPrint('Sequencer backlog', sequencerBacklog);

  if (withdrawEvents.events.length > 0) {
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

    debugPrint('Withdrawal place in queue', withdrawalPlaceInQueue.toString());
    debugPrint('Withdrawal ETA', withdrawalEta?.toString() ?? 'N/A');
  }

  const vlpEvents = await client.getPaginatedSubaccountVlpEvents({
    limit: 1,
    startCursor: undefined,
    subaccountName: subaccount.subaccountName,
    subaccountOwner: subaccount.subaccountOwner,
  });

  debugPrint('Paginated VLP events', vlpEvents);

  const latestWithdrawal = await client.getEvents({
    eventTypes: ['withdraw_collateral'],
    limit: {
      type: 'txs',
      value: 1,
    },
  });

  const fastWithdrawalSignature = await client.getFastWithdrawalSignature({
    idx: latestWithdrawal[0].submissionIndex,
  });

  debugPrint('Fast Withdrawal Signature', fastWithdrawalSignature);
}

void test('[indexer-client]: Running subaccount queries tests', () =>
  runWithContext(subaccountQueriesTests));
