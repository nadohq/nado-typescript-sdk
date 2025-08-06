import {
  getRecvTimeFromOrderNonce,
  Market,
  parseRawExpirationTimestamp,
  PerpMarket,
  ProductEngineType,
  SpotMarket,
  subaccountFromHex,
} from '@vertex-protocol/contracts';
import {
  mapEngineServerPerpProduct,
  mapEngineServerSpotProduct,
} from '@vertex-protocol/engine-client';
import {
  mapValues,
  removeDecimals,
  toBigDecimal,
  toIntegerString,
} from '@vertex-protocol/utils';
import {
  Candlestick,
  IndexerEvent,
  IndexerEventWithTx,
  IndexerFundingRate,
  IndexerLeaderboardContest,
  IndexerLeaderboardParticipant,
  IndexerLeaderboardRegistration,
  IndexerMaker,
  IndexerMarketSnapshot,
  IndexerMatchEventBalances,
  IndexerOrder,
  IndexerPerpBalance,
  IndexerPerpPrices,
  IndexerProductPayment,
  IndexerServerBalance,
  IndexerServerCandlestick,
  IndexerServerEvent,
  IndexerServerFundingRate,
  IndexerServerLeaderboardContest,
  IndexerServerLeaderboardPosition,
  IndexerServerLeaderboardRegistration,
  IndexerServerMaker,
  IndexerServerMarketSnapshot,
  IndexerServerMatchEventBalances,
  IndexerServerOrder,
  IndexerServerPerpPrices,
  IndexerServerProduct,
  IndexerServerProductPayment,
  IndexerServerSnapshotsInterval,
  IndexerServerTx,
  IndexerServerVlpSnapshot,
  IndexerSnapshotsIntervalParams,
  IndexerSpotBalance,
  IndexerVlpSnapshot,
} from './types';

export function mapSnapshotsIntervalToServerParams(
  params: IndexerSnapshotsIntervalParams,
): IndexerServerSnapshotsInterval {
  return {
    count: params.limit,
    max_time: params.maxTimeInclusive
      ? toIntegerString(params.maxTimeInclusive)
      : undefined,
    granularity: params.granularity,
  };
}

export function mapIndexerServerProduct(product: IndexerServerProduct): Market {
  if ('spot' in product) {
    return mapEngineServerSpotProduct(product.spot);
  }
  return mapEngineServerPerpProduct(product.perp);
}

export function mapIndexerServerBalance(
  balance: IndexerServerBalance,
): IndexerSpotBalance | IndexerPerpBalance {
  if ('spot' in balance) {
    return {
      amount: toBigDecimal(balance.spot.balance.amount),
      productId: balance.spot.product_id,
      type: ProductEngineType.SPOT,
    };
  }
  return {
    amount: toBigDecimal(balance.perp.balance.amount),
    productId: balance.perp.product_id,
    type: ProductEngineType.PERP,
    vQuoteBalance: toBigDecimal(balance.perp.balance.v_quote_balance),
  };
}

export function mapIndexerOrder(order: IndexerServerOrder): IndexerOrder {
  const expiration = toBigDecimal(order.expiration);
  const expirationEncodedData = parseRawExpirationTimestamp(order.expiration);
  return {
    amount: toBigDecimal(order.amount),
    digest: order.digest,
    isolated: order.isolated,
    rawExpiration: expiration,
    isReduceOnly: expirationEncodedData.reduceOnly,
    expiration: expirationEncodedData.expirationTime,
    orderType: expirationEncodedData.type,
    nonce: toBigDecimal(order.nonce),
    recvTimeSeconds: getRecvTimeFromOrderNonce(order.nonce) / 1000,
    price: removeDecimals(order.price_x18),
    productId: order.product_id,
    subaccount: order.subaccount,
    submissionIndex: order.submission_idx,
    baseFilled: toBigDecimal(order.base_filled),
    quoteFilled: toBigDecimal(order.quote_filled),
    totalFee: toBigDecimal(order.fee),
  };
}

export function mapIndexerEvent(event: IndexerServerEvent): IndexerEvent {
  const eventState: IndexerEvent['state'] = (() => {
    // Assume backend data is consistent
    if ('spot' in event.pre_balance) {
      return {
        type: ProductEngineType.SPOT,
        market: mapIndexerServerProduct(event.product) as SpotMarket,
        preBalance: mapIndexerServerBalance(
          event.pre_balance,
        ) as IndexerSpotBalance,
        postBalance: mapIndexerServerBalance(
          event.post_balance,
        ) as IndexerSpotBalance,
      };
    }
    return {
      type: ProductEngineType.PERP,
      market: mapIndexerServerProduct(event.product) as PerpMarket,
      preBalance: mapIndexerServerBalance(
        event.pre_balance,
      ) as IndexerPerpBalance,
      postBalance: mapIndexerServerBalance(
        event.post_balance,
      ) as IndexerPerpBalance,
    };
  })();

  return {
    eventType: event.event_type,
    productId: event.product_id,
    isolated: event.isolated,
    isolatedProductId: event.isolated_product_id,
    state: eventState,
    subaccount: event.subaccount,
    submissionIndex: event.submission_idx,
    trackedVars: {
      netEntryCumulative: toBigDecimal(event.net_entry_cumulative),
      netEntryUnrealized: toBigDecimal(event.net_entry_unrealized),
      netFundingCumulative: toBigDecimal(event.net_funding_cumulative),
      netFundingUnrealized: toBigDecimal(event.net_funding_unrealized),
      netInterestCumulative: toBigDecimal(event.net_interest_cumulative),
      netInterestUnrealized: toBigDecimal(event.net_interest_unrealized),
    },
  };
}

export function mapIndexerEventWithTx(
  event: IndexerServerEvent,
  tx: IndexerServerTx,
): IndexerEventWithTx {
  return {
    timestamp: toBigDecimal(tx.timestamp),
    tx: tx.tx,
    ...mapIndexerEvent(event),
  };
}

export function mapIndexerMatchEventBalances(
  eventBalances: IndexerServerMatchEventBalances,
): IndexerMatchEventBalances {
  return {
    base: mapIndexerServerBalance(eventBalances.base),
    quote: eventBalances.quote
      ? (mapIndexerServerBalance(eventBalances.quote) as IndexerSpotBalance)
      : undefined,
  };
}

export function mapIndexerProductPayment(
  payment: IndexerServerProductPayment,
): IndexerProductPayment {
  return {
    submissionIndex: payment.idx,
    timestamp: toBigDecimal(payment.timestamp),
    paymentAmount: toBigDecimal(payment.amount),
    balanceAmount: toBigDecimal(payment.balance_amount),
    annualPaymentRate: removeDecimals(payment.rate_x18),
    oraclePrice: removeDecimals(payment.oracle_price_x18),
    isolated: payment.isolated,
    productId: payment.product_id,
    isolatedProductId: payment.isolated_product_id,
  };
}

export function mapIndexerPerpPrices(
  perpPrices: IndexerServerPerpPrices,
): IndexerPerpPrices {
  return {
    indexPrice: removeDecimals(perpPrices.index_price_x18),
    markPrice: removeDecimals(perpPrices.mark_price_x18),
    updateTime: toBigDecimal(perpPrices.update_time),
    productId: perpPrices.product_id,
  };
}

export function mapIndexerFundingRate(
  fundingRate: IndexerServerFundingRate,
): IndexerFundingRate {
  return {
    fundingRate: removeDecimals(fundingRate.funding_rate_x18),
    updateTime: toBigDecimal(fundingRate.update_time),
    productId: fundingRate.product_id,
  };
}

export function mapIndexerMakerStatistics(
  maker: IndexerServerMaker,
): IndexerMaker {
  return {
    address: maker.address,
    snapshots: maker.data.map((makerData) => {
      return {
        timestamp: toBigDecimal(makerData.timestamp),
        makerFee: toBigDecimal(makerData.maker_fee),
        uptime: toBigDecimal(makerData.uptime),
        sumQMin: toBigDecimal(makerData.sum_q_min),
        qScore: toBigDecimal(makerData.q_score),
        makerShare: toBigDecimal(makerData.maker_share),
        expectedMakerReward: toBigDecimal(makerData.expected_maker_reward),
      };
    }),
  };
}

export function mapIndexerLeaderboardPosition(
  position: IndexerServerLeaderboardPosition,
): IndexerLeaderboardParticipant {
  return {
    subaccount: subaccountFromHex(position.subaccount),
    contestId: position.contest_id,
    pnl: toBigDecimal(position.pnl),
    pnlRank: toBigDecimal(position.pnl_rank),
    percentRoi: toBigDecimal(position.roi),
    roiRank: toBigDecimal(position.roi_rank),
    accountValue: toBigDecimal(position.account_value),
    volume: position.volume ? toBigDecimal(position.volume) : undefined,
    updateTime: toBigDecimal(position.update_time),
  };
}

export function mapIndexerLeaderboardRegistration(
  registration: IndexerServerLeaderboardRegistration,
): IndexerLeaderboardRegistration {
  return {
    subaccount: subaccountFromHex(registration.subaccount),
    contestId: registration.contest_id,
    updateTime: toBigDecimal(registration.update_time),
  };
}

export function mapIndexerLeaderboardContest(
  contest: IndexerServerLeaderboardContest,
): IndexerLeaderboardContest {
  return {
    contestId: contest.contest_id,
    startTime: toBigDecimal(contest.start_time),
    endTime: toBigDecimal(contest.end_time),
    period: toBigDecimal(contest.threshold),
    totalParticipants: toBigDecimal(contest.count),
    minRequiredAccountValue: toBigDecimal(contest.threshold),
    minRequiredVolume: toBigDecimal(contest.volume_threshold),
    requiredProductIds: contest.product_ids,
    active: contest.active,
    lastUpdated: toBigDecimal(contest.last_updated),
  };
}

export function mapIndexerCandlesticks(
  candlestick: IndexerServerCandlestick,
): Candlestick {
  return {
    close: removeDecimals(candlestick.close_x18),
    high: removeDecimals(candlestick.high_x18),
    low: removeDecimals(candlestick.low_x18),
    open: removeDecimals(candlestick.open_x18),
    time: toBigDecimal(candlestick.timestamp),
    volume: toBigDecimal(candlestick.volume),
  };
}

export function mapIndexerMarketSnapshot(
  snapshot: IndexerServerMarketSnapshot,
): IndexerMarketSnapshot {
  return {
    timestamp: toBigDecimal(snapshot.timestamp),
    cumulativeUsers: toBigDecimal(snapshot.cumulative_users),
    dailyActiveUsers: toBigDecimal(snapshot.daily_active_users),
    tvl: toBigDecimal(snapshot.tvl),
    borrowRates: mapValues(snapshot.borrow_rates, (value) =>
      removeDecimals(value),
    ),
    cumulativeLiquidationAmounts: mapValues(
      snapshot.cumulative_liquidation_amounts,
      toBigDecimal,
    ),
    cumulativeMakerFees: mapValues(
      snapshot.cumulative_maker_fees,
      toBigDecimal,
    ),
    cumulativeSequencerFees: mapValues(
      snapshot.cumulative_sequencer_fees,
      toBigDecimal,
    ),
    cumulativeTakerFees: mapValues(
      snapshot.cumulative_taker_fees,
      toBigDecimal,
    ),
    cumulativeTrades: mapValues(snapshot.cumulative_trades, toBigDecimal),
    cumulativeVolumes: mapValues(snapshot.cumulative_volumes, toBigDecimal),
    depositRates: mapValues(snapshot.deposit_rates, (value) =>
      removeDecimals(value),
    ),
    fundingRates: mapValues(snapshot.funding_rates, (value) =>
      removeDecimals(value),
    ),
    openInterestsQuote: mapValues(snapshot.open_interests, toBigDecimal),
    totalBorrows: mapValues(snapshot.total_borrows, toBigDecimal),
    totalDeposits: mapValues(snapshot.total_deposits, toBigDecimal),
    cumulativeTradeSizes: mapValues(
      snapshot.cumulative_trade_sizes,
      toBigDecimal,
    ),
    cumulativeInflows: mapValues(snapshot.cumulative_inflows, toBigDecimal),
    cumulativeOutflows: mapValues(snapshot.cumulative_outflows, toBigDecimal),
    oraclePrices: mapValues(snapshot.oracle_prices, (value) =>
      removeDecimals(value),
    ),
  };
}

export function mapIndexerVlpSnapshot(
  snapshot: IndexerServerVlpSnapshot,
): IndexerVlpSnapshot {
  return {
    submissionIndex: snapshot.submission_idx,
    timestamp: toBigDecimal(snapshot.timestamp),
    cumulativeBurnAmountUsdc: toBigDecimal(snapshot.cumulative_burn_usdc),
    cumulativeMintAmountUsdc: toBigDecimal(snapshot.cumulative_mint_usdc),
    cumulativePnl: toBigDecimal(snapshot.cumulative_pnl),
    cumulativeTrades: toBigDecimal(snapshot.cumulative_trades),
    cumulativeVolume: toBigDecimal(snapshot.cumulative_volume),
    depositors: toBigDecimal(snapshot.depositors),
    oraclePrice: removeDecimals(snapshot.oracle_price_x18),
    tvl: toBigDecimal(snapshot.tvl),
  };
}
