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
  assertBigDecimalFinite,
  assertBigDecimalNonNegative,
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
  assertBigDecimalFinite(
    market.product.oraclePrice,
    `${label}.product.oraclePrice`,
  );
  assertBigDecimalFinite(market.minSize, `${label}.minSize`);
  assertBigDecimalFinite(market.priceIncrement, `${label}.priceIncrement`);
  assertBigDecimalFinite(market.sizeIncrement, `${label}.sizeIncrement`);
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
  assertBigDecimalFinite(balance.amount, `${label}.amount`);
  assertDefined(balance.oraclePrice, `${label}.oraclePrice`);
  assertBigDecimalFinite(balance.oraclePrice, `${label}.oraclePrice`);
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
    assertBigDecimalFinite(entry.health, `${label}.${healthType}.health`);
    assertBigDecimalFinite(entry.assets, `${label}.${healthType}.assets`);
    assertBigDecimalFinite(
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
  assertBigDecimalFinite(order.price, `${label}.price`);
  assertBigDecimalFinite(order.totalAmount, `${label}.totalAmount`);
  assertBigDecimalFinite(order.unfilledAmount, `${label}.unfilledAmount`);
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
  assertBigDecimalFinite(price.bid, `${label}.bid`);
  assertBigDecimalFinite(price.ask, `${label}.ask`);
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
  assertBigDecimalFinite(candle.time, `${label}.time`);
  assertBigDecimalFinite(candle.open, `${label}.open`);
  assertBigDecimalFinite(candle.high, `${label}.high`);
  assertBigDecimalFinite(candle.low, `${label}.low`);
  assertBigDecimalFinite(candle.close, `${label}.close`);
  assertBigDecimalNonNegative(candle.volume, `${label}.volume`);
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
  assertBigDecimalFinite(order.amount, `${label}.amount`);
  assertBigDecimalFinite(order.price, `${label}.price`);
  assertNumber(order.expiration, `${label}.expiration`);
  assertDefined(order.appendix, `${label}.appendix`);
  assertBigDecimalFinite(order.baseFilled, `${label}.baseFilled`);
  assertBigDecimalFinite(order.quoteFilled, `${label}.quoteFilled`);
  assertBigDecimalFinite(order.totalFee, `${label}.totalFee`);
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
  assertBigDecimalFinite(event.timestamp, `${label}.timestamp`);
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
  assertBigDecimalFinite(event.baseFilled, `${label}.baseFilled`);
  assertBigDecimalFinite(event.quoteFilled, `${label}.quoteFilled`);
  assertBigDecimalFinite(event.totalFee, `${label}.totalFee`);
  assertBigDecimalFinite(event.timestamp, `${label}.timestamp`);
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
  assertBigDecimalFinite(prices.indexPrice, `${label}.indexPrice`);
  assertBigDecimalFinite(prices.markPrice, `${label}.markPrice`);
  assertBigDecimalFinite(prices.updateTime, `${label}.updateTime`);
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
  assertBigDecimalFinite(rate.fundingRate, `${label}.fundingRate`);
  assertBigDecimalFinite(rate.updateTime, `${label}.updateTime`);
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
  assertBigDecimalFinite(snapshot.timestamp, `${label}.timestamp`);
  assertBigDecimalFinite(snapshot.tvl, `${label}.tvl`);
  assertBigDecimalFinite(snapshot.cumulativeUsers, `${label}.cumulativeUsers`);
  assertBigDecimalFinite(
    snapshot.dailyActiveUsers,
    `${label}.dailyActiveUsers`,
  );
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
  assertBigDecimalFinite(snapshot.minSize, `${label}.minSize`);
  assertBigDecimalFinite(snapshot.priceIncrement, `${label}.priceIncrement`);
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
  assertBigDecimalFinite(p.pnl, `${label}.pnl`);
  assertBigDecimalFinite(p.pnlRank, `${label}.pnlRank`);
  assertBigDecimalFinite(p.percentRoi, `${label}.percentRoi`);
  assertBigDecimalFinite(p.roiRank, `${label}.roiRank`);
  assertBigDecimalFinite(p.accountValue, `${label}.accountValue`);
  assertBigDecimalFinite(p.updateTime, `${label}.updateTime`);
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
  assertBigDecimalFinite(snapshot.timestamp, `${label}.timestamp`);
  assertBigDecimalFinite(
    snapshot.cumulativeVolume,
    `${label}.cumulativeVolume`,
  );
  assertBigDecimalFinite(
    snapshot.cumulativeTrades,
    `${label}.cumulativeTrades`,
  );
  assertBigDecimalFinite(
    snapshot.cumulativeMintAmountQuote,
    `${label}.cumulativeMintAmountQuote`,
  );
  assertBigDecimalFinite(
    snapshot.cumulativeBurnAmountQuote,
    `${label}.cumulativeBurnAmountQuote`,
  );
  assertBigDecimalFinite(snapshot.cumulativePnl, `${label}.cumulativePnl`);
  assertBigDecimalFinite(snapshot.tvl, `${label}.tvl`);
  assertBigDecimalFinite(snapshot.oraclePrice, `${label}.oraclePrice`);
  assertBigDecimalFinite(snapshot.depositors, `${label}.depositors`);
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
  assertBigDecimalFinite(signer.totalTxLimit, `${label}.totalTxLimit`);
  assertBigDecimalFinite(signer.remainingTxs, `${label}.remainingTxs`);
  assertBigDecimalFinite(
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
  assertBigDecimalFinite(info.order.price, `${label}.order.price`);
  assertBigDecimalFinite(info.order.amount, `${label}.order.amount`);
  assertHexString(info.order.digest, `${label}.order.digest`);
  assertDefined(info.order.triggerCriteria, `${label}.order.triggerCriteria`);
  assertDefined(info.status, `${label}.status`);
  assertString(info.status.type, `${label}.status.type`);
  assertNumber(info.updatedAt, `${label}.updatedAt`);
  assertNumber(info.placementTime, `${label}.placementTime`);
}
