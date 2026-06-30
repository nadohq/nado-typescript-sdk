import {
  mapEngineServerPerpProduct,
  mapEngineServerSpotProduct,
} from '@nadohq/engine-client';
import {
  getRecvTimeFromOrderNonce,
  mapValues,
  Market,
  PerpMarket,
  ProductEngineType,
  removeDecimals,
  SpotMarket,
  subaccountFromHex,
  toBigNumber,
  toIntegerString,
  unpackOrderAppendix,
} from '@nadohq/shared';
import {
  Candlestick,
  IndexerEvent,
  IndexerEventWithTx,
  IndexerFundingRate,
  IndexerFundingRateHistoryEntry,
  IndexerLeaderboardContest,
  IndexerLeaderboardParticipant,
  IndexerLeaderboardRegistration,
  IndexerMaker,
  IndexerMarketSnapshot,
  IndexerMatchEventBalances,
  IndexerNlpSnapshot,
  IndexerOrder,
  IndexerPerpBalance,
  IndexerPerpPrices,
  IndexerProductPayment,
  IndexerServerBalance,
  IndexerServerCandlestick,
  IndexerServerEvent,
  IndexerServerFundingRate,
  IndexerServerFundingRateHistoryEntry,
  IndexerServerLeaderboardContest,
  IndexerServerLeaderboardPosition,
  IndexerServerLeaderboardRegistration,
  IndexerServerMaker,
  IndexerServerMarketSnapshot,
  IndexerServerMatchEventBalances,
  IndexerServerNlpSnapshot,
  IndexerServerOrder,
  IndexerServerPerpPrices,
  IndexerServerProduct,
  IndexerServerProductPayment,
  IndexerServerSnapshotsInterval,
  IndexerServerTx,
  IndexerServerV2MarketHours,
  IndexerServerV2Symbol,
  IndexerServerV2TickerResponse,
  IndexerSnapshotsIntervalParams,
  IndexerSpotBalance,
  IndexerV2MarketHours,
  IndexerV2Symbol,
  IndexerV2TickerResponse,
  IndexerV2TradingStatus,
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
      amount: toBigNumber(balance.spot.balance.amount),
      productId: balance.spot.product_id,
      type: ProductEngineType.SPOT,
    };
  }
  return {
    amount: toBigNumber(balance.perp.balance.amount),
    productId: balance.perp.product_id,
    type: ProductEngineType.PERP,
    vQuoteBalance: toBigNumber(balance.perp.balance.v_quote_balance),
  };
}

export function mapIndexerOrder(order: IndexerServerOrder): IndexerOrder {
  const appendix = unpackOrderAppendix(order.appendix);
  return {
    amount: toBigNumber(order.amount),
    digest: order.digest,
    expiration: Number(order.expiration),
    appendix,
    nonce: toBigNumber(order.nonce),
    isolated: order.isolated,
    recvTimeSeconds: getRecvTimeFromOrderNonce(order.nonce) / 1000,
    price: removeDecimals(order.price_x18),
    productId: order.product_id,
    subaccount: order.subaccount,
    submissionIndex: order.submission_idx,
    lastFillSubmissionIndex: order.last_fill_submission_idx,
    baseFilled: toBigNumber(order.base_filled),
    quoteFilled: toBigNumber(order.quote_filled),
    totalFee: toBigNumber(order.fee),
    builderFee: toBigNumber(order.builder_fee),
    realizedPnl: toBigNumber(order.realized_pnl),
    closedAmount: toBigNumber(order.closed_amount),
    closedNetEntry: toBigNumber(order.closed_net_entry),
    preCloseMargin: order.closed_margin
      ? toBigNumber(order.closed_margin)
      : null,
    firstFillTimestamp: toBigNumber(order.first_fill_timestamp),
    lastFillTimestamp: toBigNumber(order.last_fill_timestamp),
    preBalances: mapIndexerMatchEventBalances(order.pre_balance),
    postBalances: mapIndexerMatchEventBalances(order.post_balance),
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
      netEntryCumulative: toBigNumber(event.net_entry_cumulative),
      netEntryUnrealized: toBigNumber(event.net_entry_unrealized),
      netFundingCumulative: toBigNumber(event.net_funding_cumulative),
      netFundingUnrealized: toBigNumber(event.net_funding_unrealized),
      netInterestCumulative: toBigNumber(event.net_interest_cumulative),
      netInterestUnrealized: toBigNumber(event.net_interest_unrealized),
      quoteVolumeCumulative: toBigNumber(event.quote_volume_cumulative),
    },
  };
}

export function mapIndexerEventWithTx(
  event: IndexerServerEvent,
  tx: IndexerServerTx,
): IndexerEventWithTx {
  return {
    timestamp: toBigNumber(tx.timestamp),
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
    timestamp: toBigNumber(payment.timestamp),
    paymentAmount: toBigNumber(payment.amount),
    balanceAmount: toBigNumber(payment.balance_amount),
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
    updateTime: toBigNumber(perpPrices.update_time),
    productId: perpPrices.product_id,
  };
}

export function mapIndexerFundingRate(
  fundingRate: IndexerServerFundingRate,
): IndexerFundingRate {
  return {
    fundingRate: removeDecimals(fundingRate.funding_rate_x18),
    updateTime: toBigNumber(fundingRate.update_time),
    productId: fundingRate.product_id,
  };
}

export function mapIndexerFundingRateHistory(
  entry: IndexerServerFundingRateHistoryEntry,
): IndexerFundingRateHistoryEntry {
  return {
    productId: entry.product_id,
    timestamp: toBigNumber(entry.timestamp),
    fundingRateFrac: removeDecimals(entry.funding_rate_frac_x18),
  };
}

export function mapIndexerMakerStatistics(
  maker: IndexerServerMaker,
): IndexerMaker {
  return {
    address: maker.address,
    snapshots: maker.data.map((makerData) => {
      return {
        timestamp: toBigNumber(makerData.timestamp),
        makerFee: toBigNumber(makerData.maker_fee),
        uptime: toBigNumber(makerData.uptime),
        sumQMin: toBigNumber(makerData.sum_q_min),
        qScore: toBigNumber(makerData.q_score),
        makerShare: toBigNumber(makerData.maker_share),
        expectedMakerReward: toBigNumber(makerData.expected_maker_reward),
      };
    }),
  };
}

export function mapIndexerLeaderboardPosition(
  position: IndexerServerLeaderboardPosition,
): IndexerLeaderboardParticipant {
  const tracks = mapValues(position.tracks, (trackData) => ({
    value: toBigNumber(trackData.value),
    rank: toBigNumber(trackData.rank),
    qualificationStatus: trackData.qualification_status,
  }));

  return {
    subaccount: subaccountFromHex(position.subaccount),
    contestId: position.contest_id,
    accountValue: toBigNumber(position.account_value),
    updateTime: toBigNumber(position.update_time),
    tracks,
    socialAccounts: position.social_accounts.map((account) => ({
      provider: account.provider,
      username: account.username,
      displayName: account.display_name,
      profileImageUrl: account.profile_image_url,
    })),
  };
}

export function mapIndexerLeaderboardRegistration(
  registration: IndexerServerLeaderboardRegistration,
): IndexerLeaderboardRegistration {
  return {
    subaccount: subaccountFromHex(registration.subaccount),
    contestId: registration.contest_id,
    updateTime: toBigNumber(registration.update_time),
  };
}

export function mapIndexerLeaderboardContest(
  contest: IndexerServerLeaderboardContest,
): IndexerLeaderboardContest {
  const startTime = toBigNumber(contest.start_time);
  const endTime = toBigNumber(contest.end_time);

  return {
    contestId: contest.contest_id,
    startTime,
    endTime,
    totalParticipants: toBigNumber(contest.count),
    requiredProductIds: contest.product_ids,
    active: contest.active,
    lastUpdated: toBigNumber(contest.last_updated),
    title: contest.title,
    description: contest.description,
    tracks: contest.tracks.map((track) => ({
      trackId: track.track_id,
      rankType: track.rank_type,
      sortOrder: track.sort_order,
      minRequiredAccountValue: toBigNumber(track.threshold),
    })),
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
    time: toBigNumber(candlestick.timestamp),
    volume: toBigNumber(candlestick.volume),
  };
}

export function mapIndexerMarketSnapshot(
  snapshot: IndexerServerMarketSnapshot,
): IndexerMarketSnapshot {
  return {
    timestamp: toBigNumber(snapshot.timestamp),
    cumulativeUsers: toBigNumber(snapshot.cumulative_users),
    dailyActiveUsers: toBigNumber(snapshot.daily_active_users),
    tvl: toBigNumber(snapshot.tvl),
    borrowRates: mapValues(snapshot.borrow_rates, (value) =>
      removeDecimals(value),
    ),
    cumulativeLiquidationAmounts: mapValues(
      snapshot.cumulative_liquidation_amounts,
      toBigNumber,
    ),
    cumulativeMakerFees: mapValues(snapshot.cumulative_maker_fees, toBigNumber),
    cumulativeSequencerFees: mapValues(
      snapshot.cumulative_sequencer_fees,
      toBigNumber,
    ),
    cumulativeTakerFees: mapValues(snapshot.cumulative_taker_fees, toBigNumber),
    cumulativeTrades: mapValues(snapshot.cumulative_trades, toBigNumber),
    cumulativeVolumes: mapValues(snapshot.cumulative_volumes, toBigNumber),
    depositRates: mapValues(snapshot.deposit_rates, (value) =>
      removeDecimals(value),
    ),
    fundingRates: mapValues(snapshot.funding_rates, (value) =>
      removeDecimals(value),
    ),
    openInterestsQuote: mapValues(snapshot.open_interests, toBigNumber),
    totalBorrows: mapValues(snapshot.total_borrows, toBigNumber),
    totalDeposits: mapValues(snapshot.total_deposits, toBigNumber),
    cumulativeTradeSizes: mapValues(
      snapshot.cumulative_trade_sizes,
      toBigNumber,
    ),
    cumulativeInflows: mapValues(snapshot.cumulative_inflows, toBigNumber),
    cumulativeOutflows: mapValues(snapshot.cumulative_outflows, toBigNumber),
    oraclePrices: mapValues(snapshot.oracle_prices, (value) =>
      removeDecimals(value),
    ),
  };
}

export function mapIndexerNlpSnapshot(
  snapshot: IndexerServerNlpSnapshot,
): IndexerNlpSnapshot {
  return {
    submissionIndex: snapshot.submission_idx,
    timestamp: toBigNumber(snapshot.timestamp),
    cumulativeBurnAmountQuote: toBigNumber(snapshot.cumulative_burn_quote),
    cumulativeMintAmountQuote: toBigNumber(snapshot.cumulative_mint_quote),
    cumulativePnl: toBigNumber(snapshot.cumulative_pnl),
    cumulativeTrades: toBigNumber(snapshot.cumulative_trades),
    cumulativeVolume: toBigNumber(snapshot.cumulative_volume),
    depositors: toBigNumber(snapshot.depositors),
    oraclePrice: removeDecimals(snapshot.oracle_price_x18),
    tvl: toBigNumber(snapshot.tvl),
  };
}

export function mapIndexerV2Ticker(
  ticker: IndexerServerV2TickerResponse,
): IndexerV2TickerResponse {
  return {
    productId: ticker.product_id,
    tickerId: ticker.ticker_id,
    baseCurrency: ticker.base_currency,
    quoteCurrency: ticker.quote_currency,
    lastPrice: ticker.last_price,
    baseVolume: ticker.base_volume,
    quoteVolume: ticker.quote_volume,
    priceChangePercent24h: ticker.price_change_percent_24h,
  };
}

export function mapIndexerV2MarketHours(
  hours: IndexerServerV2MarketHours,
): IndexerV2MarketHours {
  return {
    isOpen: hours.is_open,
    reason: hours.reason,
    nextClose: hours.next_close,
    nextOpen: hours.next_open,
  };
}

export function mapIndexerV2Symbols(
  symbol: IndexerServerV2Symbol,
): IndexerV2Symbol {
  return {
    type: symbol.type,
    productId: symbol.product_id,
    symbol: symbol.symbol,
    priceIncrement: removeDecimals(symbol.price_increment_x18),
    sizeIncrement: symbol.size_increment,
    minSize: symbol.min_size,
    makerFeeRate: removeDecimals(symbol.maker_fee_rate_x18),
    takerFeeRate: removeDecimals(symbol.taker_fee_rate_x18),
    longWeightInitial: removeDecimals(symbol.long_weight_initial_x18),
    longWeightMaintenance: removeDecimals(symbol.long_weight_maintenance_x18),
    maxOpenInterest: symbol.max_open_interest_x18
      ? removeDecimals(symbol.max_open_interest_x18)
      : null,
    exchangeRate: symbol.exchange_rate_x18
      ? removeDecimals(symbol.exchange_rate_x18)
      : null,
    tradingStatus: symbol.trading_status as IndexerV2TradingStatus,
    isolatedOnly: symbol.isolated_only,
    marketHours: symbol.market_hours
      ? mapIndexerV2MarketHours(symbol.market_hours)
      : null,
    boostType: symbol.boost_type ?? null,
    takerMultiplier: symbol.taker_multiplier ?? null,
    makerMultiplier: symbol.maker_multiplier ?? null,
  };
}
