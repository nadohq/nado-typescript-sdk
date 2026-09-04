import type {
  EngineOrder,
  SubaccountSummaryState,
} from '@nadohq/engine-client';
import type {
  Candlestick,
  GetIndexerLinkedSignerResponse,
  IndexerEventWithTx,
  IndexerLeaderboardParticipant,
  IndexerMarketSnapshot,
  IndexerMatchEvent,
  IndexerNlpSnapshot,
  IndexerOrder,
  IndexerPerpPrices,
  IndexerPosition,
  IndexerProductSnapshot,
  IndexerV2Symbol,
  IndexerV2TickerResponse,
  ListIndexerSubaccountsResponse,
} from '@nadohq/indexer-client';
import { INDEXER_EVENT_TYPES } from '@nadohq/indexer-client';
import type {
  MobileFollowSummary,
  MobileIdentitySummary,
} from '@nadohq/mobile-client';
import { MOBILE_FOLLOWED_BY_PREVIEW_LIMIT } from '@nadohq/mobile-client';
import type {
  BalanceWithProduct,
  HealthStatusByType,
  MarketWithProduct,
} from '@nadohq/shared';
import type { TriggerOrderInfo } from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import {
  assertArrayElements,
  assertBigNumberFinite,
  assertBigNumberNonNegative,
  assertBoolean,
  assertDefined,
  assertEnumMember,
  assertHexString,
  assertNonNegativeInteger,
  assertNullableString,
  assertNumber,
  assertString,
} from './assertions';

// ---------------------------------------------------------------------------
// Market & product shapes
// ---------------------------------------------------------------------------

/**
 * Validates the shape of a {@link MarketWithProduct} element.
 */
export function assertMarketWithProductShape(
  market: MarketWithProduct,
  label: string,
): void {
  assertNumber(market.productId, `${label}.productId`);
  assertDefined(market.product, `${label}.product`);
  assertBigNumberFinite(
    market.product.oraclePrice,
    `${label}.product.oraclePrice`,
  );
  assertBigNumberFinite(market.minSize, `${label}.minSize`);
  assertBigNumberFinite(market.priceIncrement, `${label}.priceIncrement`);
  assertBigNumberFinite(market.sizeIncrement, `${label}.sizeIncrement`);
}

// ---------------------------------------------------------------------------
// Balance & health shapes
// ---------------------------------------------------------------------------

/**
 * Validates the shape of a {@link BalanceWithProduct} element.
 */
export function assertBalanceWithProductShape(
  balance: BalanceWithProduct,
  label: string,
): void {
  assertNumber(balance.productId, `${label}.productId`);
  assertBigNumberFinite(balance.amount, `${label}.amount`);
  assertDefined(balance.oraclePrice, `${label}.oraclePrice`);
  assertBigNumberFinite(balance.oraclePrice, `${label}.oraclePrice`);
}

/**
 * Validates the shape of a {@link HealthStatusByType} record.
 */
export function assertHealthStatusByTypeShape(
  health: HealthStatusByType,
  label: string,
): void {
  for (const healthType of ['initial', 'maintenance', 'unweighted'] as const) {
    const entry = health[healthType];
    assertDefined(entry, `${label}.${healthType}`);
    assertBigNumberFinite(entry.health, `${label}.${healthType}.health`);
    assertBigNumberFinite(entry.assets, `${label}.${healthType}.assets`);
    assertBigNumberFinite(
      entry.liabilities,
      `${label}.${healthType}.liabilities`,
    );
  }
}

/**
 * Validates the shape of a {@link SubaccountSummaryState} response.
 */
export function assertSubaccountSummaryShape(
  summary: SubaccountSummaryState,
  label: string,
): void {
  assertDefined(summary.health, `${label}.health`);
  assertHealthStatusByTypeShape(summary.health, `${label}.health`);
  assertDefined(summary.balances, `${label}.balances`);
  for (let i = 0; i < summary.balances.length; i++) {
    assertBalanceWithProductShape(
      summary.balances[i],
      `${label}.balances[${i}]`,
    );
  }
}

// ---------------------------------------------------------------------------
// Engine order shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link EngineOrder} element.
 */
export function assertEngineOrderShape(
  order: EngineOrder,
  label: string,
): void {
  assertNumber(order.productId, `${label}.productId`);
  assertBigNumberFinite(order.price, `${label}.price`);
  assertBigNumberFinite(order.totalAmount, `${label}.totalAmount`);
  assertBigNumberFinite(order.unfilledAmount, `${label}.unfilledAmount`);
  assertNumber(order.expiration, `${label}.expiration`);
  assertString(order.nonce, `${label}.nonce`);
  assertHexString(order.digest, `${label}.digest`);
  assertNumber(order.placementTime, `${label}.placementTime`);
  assertDefined(order.appendix, `${label}.appendix`);
}

// ---------------------------------------------------------------------------
// Engine market price shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an engine market price entry.
 */
export function assertEngineMarketPriceShape(
  price: { productId: number; bid: unknown; ask: unknown },
  label: string,
): void {
  assertNumber(price.productId, `${label}.productId`);
  assertBigNumberFinite(price.bid, `${label}.bid`);
  assertBigNumberFinite(price.ask, `${label}.ask`);
}

// ---------------------------------------------------------------------------
// Candlestick shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of a {@link Candlestick} element.
 */
export function assertCandlestickShape(
  candle: Candlestick,
  label: string,
): void {
  assertBigNumberFinite(candle.time, `${label}.time`);
  assertBigNumberFinite(candle.open, `${label}.open`);
  assertBigNumberFinite(candle.high, `${label}.high`);
  assertBigNumberFinite(candle.low, `${label}.low`);
  assertBigNumberFinite(candle.close, `${label}.close`);
  assertBigNumberNonNegative(candle.volume, `${label}.volume`);
}

// ---------------------------------------------------------------------------
// Indexer order shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerOrder} element.
 */
export function assertIndexerOrderShape(
  order: IndexerOrder,
  label: string,
): void {
  assertHexString(order.digest, `${label}.digest`);
  assertString(order.subaccount, `${label}.subaccount`);
  assertNumber(order.productId, `${label}.productId`);
  assertString(order.submissionIndex, `${label}.submissionIndex`);
  assertString(
    order.lastFillSubmissionIndex,
    `${label}.lastFillSubmissionIndex`,
  );
  assertBigNumberFinite(order.amount, `${label}.amount`);
  assertBigNumberFinite(order.price, `${label}.price`);
  assertNumber(order.expiration, `${label}.expiration`);
  assertDefined(order.appendix, `${label}.appendix`);
  assertBoolean(order.isolated, `${label}.isolated`);
  assertBigNumberFinite(order.baseFilled, `${label}.baseFilled`);
  assertBigNumberFinite(order.quoteFilled, `${label}.quoteFilled`);
  assertBigNumberFinite(order.totalFee, `${label}.totalFee`);
  assertDefined(order.preBalances, `${label}.preBalances`);
  assertDefined(order.postBalances, `${label}.postBalances`);
}

// ---------------------------------------------------------------------------
// Indexer event shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerEventWithTx} element.
 */
export function assertIndexerEventShape(
  event: IndexerEventWithTx,
  label: string,
): void {
  assertString(event.subaccount, `${label}.subaccount`);
  assertNumber(event.productId, `${label}.productId`);
  assertString(event.submissionIndex, `${label}.submissionIndex`);
  assertDefined(event.eventType, `${label}.eventType`);
  assertDefined(event.state, `${label}.state`);
  assertDefined(event.trackedVars, `${label}.trackedVars`);
  assertBigNumberFinite(event.timestamp, `${label}.timestamp`);
  assertBoolean(event.isolated, `${label}.isolated`);
}

// ---------------------------------------------------------------------------
// Indexer position shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerPosition} element.
 */
export function assertIndexerPositionShape(
  position: IndexerPosition,
  label: string,
): void {
  assertString(position.subaccount, `${label}.subaccount`);
  assertNumber(position.productId, `${label}.productId`);
  assertBoolean(position.isolated, `${label}.isolated`);
  assertBoolean(position.direction, `${label}.direction`);
  assertString(position.openId, `${label}.openId`);
  assertString(position.closeId, `${label}.closeId`);
  assertString(position.submissionIndex, `${label}.submissionIndex`);
  assertBigNumberNonNegative(position.amount, `${label}.amount`);
  assertBigNumberNonNegative(position.maxAmount, `${label}.maxAmount`);
  assertBigNumberNonNegative(
    position.totalOpenAmount,
    `${label}.totalOpenAmount`,
  );
  assertBigNumberNonNegative(
    position.totalCloseAmount,
    `${label}.totalCloseAmount`,
  );
  assertBigNumberFinite(
    position.averageEntryPrice,
    `${label}.averageEntryPrice`,
  );
  assertBigNumberFinite(position.averageExitPrice, `${label}.averageExitPrice`);
  assertBigNumberNonNegative(
    position.liquidatedAmount,
    `${label}.liquidatedAmount`,
  );
  assertBigNumberFinite(
    position.maxIsolatedLeverage,
    `${label}.maxIsolatedLeverage`,
  );
  assertBigNumberFinite(position.openFee, `${label}.openFee`);
  assertBigNumberFinite(position.closeFee, `${label}.closeFee`);
  assertBigNumberFinite(position.realizedPnl, `${label}.realizedPnl`);
  assertBigNumberFinite(position.openTimestamp, `${label}.openTimestamp`);
  assertBigNumberFinite(position.updateTimestamp, `${label}.updateTimestamp`);
  assertEnumMember(
    position.openReason,
    INDEXER_EVENT_TYPES,
    `${label}.openReason`,
  );
  assertBigNumberFinite(
    position.netFundingPayment,
    `${label}.netFundingPayment`,
  );
  assertBigNumberFinite(
    position.netInterestPayment,
    `${label}.netInterestPayment`,
  );
  assertBigNumberFinite(
    position.netEntryUnrealized,
    `${label}.netEntryUnrealized`,
  );
  // A closed position has a real closeId & reason; an open one has the -1 sentinel and nulls
  const isClosed = position.closeId !== '-1';
  if (isClosed) {
    assertEnumMember(
      position.closeReason,
      INDEXER_EVENT_TYPES,
      `${label}.closeReason`,
    );
  } else {
    assert.equal(
      position.closeReason,
      null,
      `${label}.closeReason should be null while the position is open`,
    );
  }
}

// ---------------------------------------------------------------------------
// Match event shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerMatchEvent} element.
 */
export function assertMatchEventShape(
  event: IndexerMatchEvent,
  label: string,
): void {
  assertNumber(event.productId, `${label}.productId`);
  assertHexString(event.digest, `${label}.digest`);
  assertBoolean(event.isolated, `${label}.isolated`);
  assertBigNumberFinite(event.baseFilled, `${label}.baseFilled`);
  assertBigNumberFinite(event.quoteFilled, `${label}.quoteFilled`);
  assertBigNumberFinite(event.totalFee, `${label}.totalFee`);
  assertBigNumberFinite(event.timestamp, `${label}.timestamp`);
  assertBoolean(event.isTaker, `${label}.isTaker`);
  assertDefined(event.preBalances, `${label}.preBalances`);
  assertDefined(event.postBalances, `${label}.postBalances`);
}

// ---------------------------------------------------------------------------
// Perp prices shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerPerpPrices} element.
 */
export function assertPerpPricesShape(
  prices: IndexerPerpPrices,
  label: string,
): void {
  assertNumber(prices.productId, `${label}.productId`);
  assertBigNumberFinite(prices.indexPrice, `${label}.indexPrice`);
  assertBigNumberFinite(prices.markPrice, `${label}.markPrice`);
  assertBigNumberFinite(prices.updateTime, `${label}.updateTime`);
}

// ---------------------------------------------------------------------------
// Funding rate shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of a funding rate entry.
 */
export function assertFundingRateShape(
  rate: { productId: number; fundingRate: unknown; updateTime: unknown },
  label: string,
): void {
  assertNumber(rate.productId, `${label}.productId`);
  assertBigNumberFinite(rate.fundingRate, `${label}.fundingRate`);
  assertBigNumberFinite(rate.updateTime, `${label}.updateTime`);
}

/**
 * Validates the shape of a historical funding rate entry.
 */
export function assertFundingRateHistoryEntryShape(
  entry: { productId: number; timestamp: unknown; fundingRateFrac: unknown },
  label: string,
): void {
  assertNumber(entry.productId, `${label}.productId`);
  assertBigNumberFinite(entry.timestamp, `${label}.timestamp`);
  assertBigNumberFinite(entry.fundingRateFrac, `${label}.fundingRateFrac`);
}

// ---------------------------------------------------------------------------
// Market snapshot shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerMarketSnapshot} element.
 */
export function assertMarketSnapshotShape(
  snapshot: IndexerMarketSnapshot,
  label: string,
): void {
  assertBigNumberFinite(snapshot.timestamp, `${label}.timestamp`);
  assertBigNumberFinite(snapshot.tvl, `${label}.tvl`);
  assertBigNumberFinite(snapshot.cumulativeUsers, `${label}.cumulativeUsers`);
  assertBigNumberFinite(snapshot.dailyActiveUsers, `${label}.dailyActiveUsers`);
  assertDefined(snapshot.cumulativeVolumes, `${label}.cumulativeVolumes`);
  assertDefined(snapshot.fundingRates, `${label}.fundingRates`);
  assertDefined(snapshot.oraclePrices, `${label}.oraclePrices`);
}

// ---------------------------------------------------------------------------
// Product snapshot shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerProductSnapshot} element.
 */
export function assertProductSnapshotShape(
  snapshot: IndexerProductSnapshot,
  label: string,
): void {
  assertNumber(snapshot.productId, `${label}.productId`);
  assertString(snapshot.submissionIndex, `${label}.submissionIndex`);
  assertBigNumberFinite(snapshot.minSize, `${label}.minSize`);
  assertBigNumberFinite(snapshot.priceIncrement, `${label}.priceIncrement`);
}

// ---------------------------------------------------------------------------
// Leaderboard participant shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerLeaderboardParticipant}.
 */
export function assertLeaderboardParticipantShape(
  p: IndexerLeaderboardParticipant,
  label: string,
): void {
  assertDefined(p.subaccount, `${label}.subaccount`);
  assertNumber(p.contestId, `${label}.contestId`);
  assertBigNumberFinite(p.accountValue, `${label}.accountValue`);
  assertBigNumberFinite(p.updateTime, `${label}.updateTime`);
  assertDefined(p.tracks, `${label}.tracks`);

  for (const [rankType, trackData] of Object.entries(p.tracks)) {
    assertBigNumberFinite(trackData.value, `${label}.tracks.${rankType}.value`);
    assertBigNumberFinite(trackData.rank, `${label}.tracks.${rankType}.rank`);
    assertDefined(
      trackData.qualificationStatus,
      `${label}.tracks.${rankType}.qualificationStatus`,
    );
  }
}

// ---------------------------------------------------------------------------
// V2 ticker shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerV2TickerResponse}.
 */
export function assertV2TickerShape(
  ticker: IndexerV2TickerResponse,
  label: string,
): void {
  assertNumber(ticker.productId, `${label}.productId`);
  assertString(ticker.tickerId, `${label}.tickerId`);
  assertString(ticker.baseCurrency, `${label}.baseCurrency`);
  assertString(ticker.quoteCurrency, `${label}.quoteCurrency`);
  assertNumber(ticker.lastPrice, `${label}.lastPrice`);
  assertNumber(ticker.baseVolume, `${label}.baseVolume`);
  assertNumber(ticker.quoteVolume, `${label}.quoteVolume`);
  assertNumber(ticker.priceChangePercent24h, `${label}.priceChangePercent24h`);
}

// ---------------------------------------------------------------------------
// V2 symbol shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerV2Symbol}.
 */
export function assertV2SymbolShape(
  symbol: IndexerV2Symbol,
  label: string,
): void {
  assertString(symbol.type, `${label}.type`);
  assertNumber(symbol.productId, `${label}.productId`);
  assertString(symbol.symbol, `${label}.symbol`);
  assertBigNumberFinite(symbol.priceIncrement, `${label}.priceIncrement`);
  assertString(symbol.sizeIncrement, `${label}.sizeIncrement`);
  assertString(symbol.minSize, `${label}.minSize`);
  assertBigNumberFinite(symbol.makerFeeRate, `${label}.makerFeeRate`);
  assertBigNumberFinite(symbol.takerFeeRate, `${label}.takerFeeRate`);
  assertBigNumberFinite(symbol.longWeightInitial, `${label}.longWeightInitial`);
  assertBigNumberFinite(
    symbol.longWeightMaintenance,
    `${label}.longWeightMaintenance`,
  );
  assertString(symbol.tradingStatus, `${label}.tradingStatus`);
  assertBoolean(symbol.isolatedOnly, `${label}.isolatedOnly`);
  if (symbol.marketHours != null) {
    assertBoolean(symbol.marketHours.isOpen, `${label}.marketHours.isOpen`);
  }
  if (symbol.exchangeRate != null) {
    assertBigNumberFinite(symbol.exchangeRate, `${label}.exchangeRate`);
  }
  if (symbol.boostType != null) {
    assertNumber(symbol.boostType, `${label}.boostType`);
  }
  if (symbol.takerMultiplier != null) {
    assertNumber(symbol.takerMultiplier, `${label}.takerMultiplier`);
  }
  if (symbol.makerMultiplier != null) {
    assertNumber(symbol.makerMultiplier, `${label}.makerMultiplier`);
  }
}

// ---------------------------------------------------------------------------
// NLP snapshot shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link IndexerNlpSnapshot}.
 */
export function assertNlpSnapshotShape(
  snapshot: IndexerNlpSnapshot,
  label: string,
): void {
  assertString(snapshot.submissionIndex, `${label}.submissionIndex`);
  assertBigNumberFinite(snapshot.timestamp, `${label}.timestamp`);
  assertBigNumberFinite(snapshot.cumulativeVolume, `${label}.cumulativeVolume`);
  assertBigNumberFinite(snapshot.cumulativeTrades, `${label}.cumulativeTrades`);
  assertBigNumberFinite(
    snapshot.cumulativeMintAmountQuote,
    `${label}.cumulativeMintAmountQuote`,
  );
  assertBigNumberFinite(
    snapshot.cumulativeBurnAmountQuote,
    `${label}.cumulativeBurnAmountQuote`,
  );
  assertBigNumberFinite(snapshot.cumulativePnl, `${label}.cumulativePnl`);
  assertBigNumberFinite(snapshot.tvl, `${label}.tvl`);
  assertBigNumberFinite(snapshot.oraclePrice, `${label}.oraclePrice`);
  assertBigNumberFinite(snapshot.depositors, `${label}.depositors`);
}

// ---------------------------------------------------------------------------
// Linked signer shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of an {@link GetIndexerLinkedSignerResponse}.
 */
export function assertLinkedSignerShape(
  signer: GetIndexerLinkedSignerResponse,
  label: string,
): void {
  assertBigNumberFinite(signer.totalTxLimit, `${label}.totalTxLimit`);
  assertBigNumberFinite(signer.remainingTxs, `${label}.remainingTxs`);
  assertBigNumberFinite(
    signer.waitTimeUntilNextTx,
    `${label}.waitTimeUntilNextTx`,
  );
  assertString(signer.signer, `${label}.signer`);
}

// ---------------------------------------------------------------------------
// Indexer subaccount listing shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of a single entry in {@link ListIndexerSubaccountsResponse}.
 */
export function assertSubaccountListingShape(
  entry: ListIndexerSubaccountsResponse[number],
  label: string,
): void {
  assertString(entry.hexId, `${label}.hexId`);
  assertNumber(entry.createdAt, `${label}.createdAt`);
  assertBoolean(entry.isolated, `${label}.isolated`);
  assertString(entry.subaccountOwner, `${label}.subaccountOwner`);
  assertString(entry.subaccountName, `${label}.subaccountName`);
}

// ---------------------------------------------------------------------------
// Mobile identity shapes
// ---------------------------------------------------------------------------

/**
 * Validates the shape of a {@link MobileIdentitySummary}. Name fields are `null` until a username is claimed,
 * and `avatarUrl` is `null` until an avatar source exists on the backend.
 */
export function assertMobileIdentitySummaryShape(
  identity: MobileIdentitySummary,
  label: string,
): void {
  assertHexString(identity.subaccount, `${label}.subaccount`);
  assertNullableString(identity.username, `${label}.username`);
  assertNullableString(identity.displayName, `${label}.displayName`);
  assertNullableString(identity.avatarUrl, `${label}.avatarUrl`);
}

/**
 * Validates the shape of a {@link MobileFollowSummary} and its preview identities.
 */
export function assertMobileFollowSummaryShape(
  summary: MobileFollowSummary,
  label: string,
): void {
  assertBoolean(summary.isFollowing, `${label}.isFollowing`);
  assertNonNegativeInteger(summary.followedByCount, `${label}.followedByCount`);
  assertArrayElements(
    summary.followedBy,
    assertMobileIdentitySummaryShape,
    `${label}.followedBy`,
  );
  // The preview is capped by the backend, but the count covers the whole intersection.
  assert.ok(
    summary.followedBy.length <= summary.followedByCount,
    `${label}.followedBy should never exceed the exact followed-by count`,
  );
  assert.ok(
    summary.followedBy.length <= MOBILE_FOLLOWED_BY_PREVIEW_LIMIT,
    `${label}.followedBy should respect the fixed preview limit of ${MOBILE_FOLLOWED_BY_PREVIEW_LIMIT}`,
  );
}

// ---------------------------------------------------------------------------
// Trigger order info shape
// ---------------------------------------------------------------------------

/**
 * Validates the shape of a {@link TriggerOrderInfo} element.
 */
export function assertTriggerOrderInfoShape(
  info: TriggerOrderInfo,
  label: string,
): void {
  assertDefined(info.order, `${label}.order`);
  assertNumber(info.order.productId, `${label}.order.productId`);
  assertBigNumberFinite(info.order.price, `${label}.order.price`);
  assertBigNumberFinite(info.order.amount, `${label}.order.amount`);
  assertHexString(info.order.digest, `${label}.order.digest`);
  assertDefined(info.order.triggerCriteria, `${label}.order.triggerCriteria`);
  assertDefined(info.status, `${label}.status`);
  assertString(info.status.type, `${label}.status.type`);
  assertNumber(info.updatedAt, `${label}.updatedAt`);
  assertNumber(info.placementTime, `${label}.placementTime`);
}
