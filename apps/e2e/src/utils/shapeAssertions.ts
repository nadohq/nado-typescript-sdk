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
  IndexerProductSnapshot,
  IndexerV2SymbolResponse,
  IndexerV2TickerResponse,
  ListIndexerSubaccountsResponse,
} from '@nadohq/indexer-client';
import type {
  BalanceWithProduct,
  HealthStatusByType,
  MarketWithProduct,
} from '@nadohq/shared';
import type { TriggerOrderInfo } from '@nadohq/trigger-client';
import {
  assertBigNumberFinite,
  assertBigNumberNonNegative,
  assertBoolean,
  assertDefined,
  assertHexString,
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
  assertBigNumberFinite(order.amount, `${label}.amount`);
  assertBigNumberFinite(order.price, `${label}.price`);
  assertNumber(order.expiration, `${label}.expiration`);
  assertDefined(order.appendix, `${label}.appendix`);
  assertBigNumberFinite(order.baseFilled, `${label}.baseFilled`);
  assertBigNumberFinite(order.quoteFilled, `${label}.quoteFilled`);
  assertBigNumberFinite(order.totalFee, `${label}.totalFee`);
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
  assertBigNumberFinite(p.pnl, `${label}.pnl`);
  assertBigNumberFinite(p.pnlRank, `${label}.pnlRank`);
  assertBigNumberFinite(p.percentRoi, `${label}.percentRoi`);
  assertBigNumberFinite(p.roiRank, `${label}.roiRank`);
  assertBigNumberFinite(p.accountValue, `${label}.accountValue`);
  assertBigNumberFinite(p.updateTime, `${label}.updateTime`);
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
 * Validates the shape of an {@link IndexerV2SymbolResponse}.
 */
export function assertV2SymbolShape(
  symbol: IndexerV2SymbolResponse,
  label: string,
): void {
  assertString(symbol.type, `${label}.type`);
  assertNumber(symbol.productId, `${label}.productId`);
  assertString(symbol.symbol, `${label}.symbol`);
  assertString(symbol.priceIncrementX18, `${label}.priceIncrementX18`);
  assertString(symbol.sizeIncrement, `${label}.sizeIncrement`);
  assertString(symbol.minSize, `${label}.minSize`);
  assertString(symbol.makerFeeRateX18, `${label}.makerFeeRateX18`);
  assertString(symbol.takerFeeRateX18, `${label}.takerFeeRateX18`);
  assertString(symbol.longWeightInitialX18, `${label}.longWeightInitialX18`);
  assertString(
    symbol.longWeightMaintenanceX18,
    `${label}.longWeightMaintenanceX18`,
  );
  assertString(symbol.tradingStatus, `${label}.tradingStatus`);
  assertBoolean(symbol.isolatedOnly, `${label}.isolatedOnly`);
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
