import {
  EIP712OrderValues,
  Market,
  OrderAppendix,
  PerpBalance,
  PerpMarket,
  ProductEngineType,
  SpotBalance,
  SpotMarket,
  Subaccount,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { Address, Hex } from 'viem';
import { CandlestickPeriod } from './CandlestickPeriod';
import { IndexerEventType } from './IndexerEventType';
import { IndexerLeaderboardRankType } from './IndexerLeaderboardType';
import { NadoTx, NadoWithdrawCollateralTx } from './NadoTx';
import {
  IndexerServerFastWithdrawalSignatureParams,
  IndexerServerListSubaccountsParams,
  IndexerServerTriggerTypeFilter,
} from './serverTypes';

/**
 * Base types
 */

export type IndexerSpotBalance = Omit<SpotBalance, 'healthContributions'>;

export type IndexerPerpBalance = Omit<PerpBalance, 'healthContributions'>;

export interface IndexerEventSpotStateSnapshot {
  type: ProductEngineType.SPOT;
  preBalance: IndexerSpotBalance;
  postBalance: IndexerSpotBalance;
  market: SpotMarket;
}

export interface IndexerEventPerpStateSnapshot {
  type: ProductEngineType.PERP;
  preBalance: IndexerPerpBalance;
  postBalance: IndexerPerpBalance;
  market: PerpMarket;
}

export type IndexerEventBalanceStateSnapshot =
  | IndexerEventSpotStateSnapshot
  | IndexerEventPerpStateSnapshot;

export interface IndexerBalanceTrackedVars {
  netInterestUnrealized: BigNumber;
  netInterestCumulative: BigNumber;
  netFundingUnrealized: BigNumber;
  netFundingCumulative: BigNumber;
  netEntryUnrealized: BigNumber;
  netEntryCumulative: BigNumber;
  quoteVolumeCumulative: BigNumber;
}

export interface IndexerEvent<
  TStateType extends IndexerEventBalanceStateSnapshot =
    IndexerEventBalanceStateSnapshot,
> {
  subaccount: string;
  isolated: boolean;
  // The product ID associated with the isolated perp market. This is only used when productId === QUOTE_PRODUCT_ID and isolated === true
  isolatedProductId: number | null;
  productId: number;
  submissionIndex: string;
  eventType: IndexerEventType;
  state: TStateType;
  trackedVars: IndexerBalanceTrackedVars;
}

export interface IndexerEventWithTx<
  TStateType extends IndexerEventBalanceStateSnapshot =
    IndexerEventBalanceStateSnapshot,
> extends IndexerEvent<TStateType> {
  timestamp: BigNumber;
  tx: NadoTx;
}

/**
 * List subaccounts
 */

export type ListIndexerSubaccountsParams = IndexerServerListSubaccountsParams;

export type ListIndexerSubaccountsResponse = ({
  hexId: string;
  // Unix timestamp in seconds
  createdAt: number;
  isolated: boolean;
} & Subaccount)[];

/**
 * Subaccount snapshots
 */

export interface GetIndexerMultiSubaccountSnapshotsParams {
  subaccounts: Subaccount[];
  // A series of timestamps for which to return a summary of each subaccount
  timestamps: number[];
  // If not given, will return both isolated & non-iso balances
  isolated?: boolean;
}

export type IndexerSnapshotBalance<
  TStateType extends IndexerEventBalanceStateSnapshot =
    IndexerEventBalanceStateSnapshot,
> = IndexerEvent<TStateType>;

export interface IndexerSubaccountSnapshot {
  timestamp: BigNumber;
  balances: IndexerSnapshotBalance[];
}

export interface GetIndexerMultiSubaccountSnapshotsResponse {
  // Utility for retrieving a subaccount's hex ID, in the same order as the request params
  subaccountHexIds: string[];
  // Map of subaccount hex -> timestamp requested -> summary for that time
  snapshots: Record<string, Record<string, IndexerSubaccountSnapshot>>;
}

/**
 * Perp prices
 */

export interface GetIndexerPerpPricesParams {
  productId: number;
}

export interface IndexerPerpPrices {
  productId: number;
  indexPrice: BigNumber;
  markPrice: BigNumber;
  // Seconds
  updateTime: BigNumber;
}

export type GetIndexerPerpPricesResponse = IndexerPerpPrices;

export interface GetIndexerMultiProductPerpPricesParams {
  productIds: number[];
}

// Map of productId -> IndexerPerpPrices
export type GetIndexerMultiProductPerpPricesResponse = Record<
  number,
  IndexerPerpPrices
>;

/**
 * Oracle prices
 */

export interface GetIndexerOraclePricesParams {
  productIds: number[];
}

export interface IndexerOraclePrice {
  productId: number;
  oraclePrice: BigNumber;
  // Seconds
  updateTime: BigNumber;
}

export type GetIndexerOraclePricesResponse = IndexerOraclePrice[];

/**
 * Funding rates
 */

export interface GetIndexerFundingRateParams {
  productId: number;
}

export interface IndexerFundingRate {
  productId: number;
  fundingRate: BigNumber;
  // Seconds
  updateTime: BigNumber;
}

export type GetIndexerFundingRateResponse = IndexerFundingRate;

export interface GetIndexerMultiProductFundingRatesParams {
  productIds: number[];
}

// Map of productId -> IndexerFundingRate
export type GetIndexerMultiProductFundingRatesResponse = Record<
  number,
  IndexerFundingRate
>;

/**
 * Candlesticks
 */

export interface GetIndexerCandlesticksParams {
  productId: number;
  period: CandlestickPeriod;
  // Seconds
  maxTimeInclusive?: number;
  limit: number;
}

// Semi-Tradingview compatible bars
export interface Candlestick {
  // In SECONDS, for TV compat, this needs to be in millis
  time: BigNumber;
  open: BigNumber;
  high: BigNumber;
  low: BigNumber;
  close: BigNumber;
  volume: BigNumber;
}

export type GetIndexerCandlesticksResponse = Candlestick[];

export type GetIndexerEdgeCandlesticksResponse = GetIndexerCandlesticksResponse;

export type GetIndexerEdgeCandlesticksParams = GetIndexerCandlesticksParams;

/**
 * Product snapshots
 */

export interface GetIndexerProductSnapshotsParams {
  // Max submission index, inclusive
  startCursor?: string;
  productId: number;
  maxTimestampInclusive?: number;
  limit: number;
}

export interface IndexerProductSnapshot extends Market {
  submissionIndex: string;
}

export type GetIndexerProductSnapshotsResponse = IndexerProductSnapshot[];

export interface GetIndexerMultiProductSnapshotsParams {
  productIds: number[];
  maxTimestampInclusive?: number[];
}

// Map of timestamp -> (productId -> IndexerProductSnapshot)
export type GetIndexerMultiProductSnapshotsResponse = Record<
  string,
  Record<number, IndexerProductSnapshot>
>;

export interface IndexerSnapshotsIntervalParams {
  /** Currently accepts all integers, in seconds */
  granularity: number;
  /**
   * Optional upper bound for snapshot timestamps (in seconds).
   * Without this, snapshots will default to align with last UTC midnight,
   * which can make "Last 24h" metrics inaccurate.
   */
  maxTimeInclusive?: number;
  limit: number;
}

/**
 * Market snapshots
 */

export interface GetIndexerMarketSnapshotsParams extends IndexerSnapshotsIntervalParams {
  // Defaults to all
  productIds?: number[];
}

export interface IndexerMarketSnapshot {
  timestamp: BigNumber;
  cumulativeUsers: BigNumber;
  dailyActiveUsers: BigNumber;
  tvl: BigNumber;
  cumulativeVolumes: Record<number, BigNumber>;
  cumulativeTakerFees: Record<number, BigNumber>;
  cumulativeSequencerFees: Record<number, BigNumber>;
  cumulativeMakerFees: Record<number, BigNumber>;
  cumulativeTrades: Record<number, BigNumber>;
  cumulativeLiquidationAmounts: Record<number, BigNumber>;
  openInterestsQuote: Record<number, BigNumber>;
  totalDeposits: Record<number, BigNumber>;
  totalBorrows: Record<number, BigNumber>;
  fundingRates: Record<number, BigNumber>;
  depositRates: Record<number, BigNumber>;
  borrowRates: Record<number, BigNumber>;
  cumulativeTradeSizes: Record<number, BigNumber>;
  cumulativeInflows: Record<number, BigNumber>;
  cumulativeOutflows: Record<number, BigNumber>;
  oraclePrices: Record<number, BigNumber>;
}

export type GetIndexerMarketSnapshotsResponse = IndexerMarketSnapshot[];

export type GetIndexerEdgeMarketSnapshotsParams =
  IndexerSnapshotsIntervalParams;

// Map of chain id -> IndexerMarketSnapshot[]
export type GetIndexerEdgeMarketSnapshotResponse = Record<
  number,
  IndexerMarketSnapshot[]
>;

/**
 * Events
 */

// There can be multiple events per tx, this allows a limit depending on usecase
export type GetIndexerEventsLimitType = 'events' | 'txs';

export interface GetIndexerEventsParams {
  // Max submission index, inclusive
  startCursor?: string;
  subaccounts?: Subaccount[];
  productIds?: number[];
  // If not given, will return both isolated & non-iso events
  isolated?: boolean;
  eventTypes?: IndexerEventType[];
  maxTimestampInclusive?: number;
  // Descending order for idx (time), defaults to true
  desc?: boolean;
  limit?: {
    type: GetIndexerEventsLimitType;
    value: number;
  };
}

export type GetIndexerEventsResponse = IndexerEventWithTx[];

/**
 * Historical orders
 */

export interface GetIndexerOrdersParams {
  // Max submission index, inclusive
  startCursor?: string;
  subaccounts?: Subaccount[];
  minTimestampInclusive?: number;
  maxTimestampInclusive?: number;
  limit?: number;
  productIds?: number[];
  triggerTypes?: IndexerServerTriggerTypeFilter[];
  // If not given, will return both isolated & non-iso orders
  isolated?: boolean;
  digests?: string[];
}

export interface IndexerOrder {
  digest: string;
  subaccount: string;
  productId: number;
  submissionIndex: string;
  lastFillSubmissionIndex: string;
  amount: BigNumber;
  price: BigNumber;
  expiration: number;
  // Order metadata from appendix
  appendix: OrderAppendix;
  nonce: BigNumber;
  isolated: boolean;
  // Derived from the nonce
  recvTimeSeconds: number;
  // Fill amounts
  baseFilled: BigNumber;
  // Includes fee
  quoteFilled: BigNumber;
  // Includes sequencer fee
  totalFee: BigNumber;
  builderFee: BigNumber;
  realizedPnl: BigNumber;
  // Signed closed amount (positive for longs, negative for shorts)
  closedAmount: BigNumber;
  // Cumulative realized entry price for the closed amount on an order
  closedNetEntry: BigNumber;
  // Weighted average margin allocated to the closed amount. Only present for isolated margin orders; null for cross-margin orders
  closedMargin: BigNumber | null;
  // Unix timestamp (seconds) of the first fill on the order
  firstFillTimestamp: BigNumber;
  // Unix timestamp (seconds) of the last fill on the order
  lastFillTimestamp: BigNumber;
  /** Balances before the order was filled */
  preBalances: IndexerMatchEventBalances;
  /** Balances after the order was filled */
  postBalances: IndexerMatchEventBalances;
}

export type GetIndexerOrdersResponse = IndexerOrder[];

/**
 * Match events
 */

export interface GetIndexerMatchEventsParams {
  // When not given, will return all maker events
  subaccounts?: Subaccount[];
  productIds?: number[];
  // If not given, will return both isolated & non-iso events
  isolated?: boolean;
  maxTimestampInclusive?: number;
  limit: number;
  // Max submission index, inclusive
  startCursor?: string;
}

// There are 2 balance states per match event if the match is in a spot market, but only one if the match is in a perp market
export interface IndexerMatchEventBalances {
  base: IndexerSpotBalance | IndexerPerpBalance;
  quote?: IndexerSpotBalance;
}

export interface IndexerMatchEvent extends Subaccount {
  productId: number;
  digest: string;
  isolated: boolean;
  order: EIP712OrderValues;
  baseFilled: BigNumber;
  quoteFilled: BigNumber;
  // Includes sequencer fee
  totalFee: BigNumber;
  sequencerFee: BigNumber;
  builderFee: BigNumber;
  cumulativeBaseFilled: BigNumber;
  cumulativeQuoteFilled: BigNumber;
  cumulativeFee: BigNumber;
  submissionIndex: string;
  timestamp: BigNumber;
  isTaker: boolean;
  // Tracked vars for the balance BEFORE this match event occurred
  preEventTrackedVars: Pick<
    IndexerBalanceTrackedVars,
    'netEntryCumulative' | 'netEntryUnrealized'
  >;
  preBalances: IndexerMatchEventBalances;
  postBalances: IndexerMatchEventBalances;
  tx: NadoTx;
  realizedPnl: BigNumber;
  // Signed closed amount (positive for longs, negative for shorts)
  closedAmount: BigNumber;
  // Realized entry price for the closed amount on this match (x18). Represents the total quote value at which the closed portion of the position was originally entered.
  closedNetEntry: BigNumber;
  // Margin allocated to the closed amount on this match (x18). Only present for isolated margin orders; null for cross-margin orders.
  margin: BigNumber | null;
}

export type GetIndexerMatchEventsResponse = IndexerMatchEvent[];

/**
 * Quote price
 */

export interface GetIndexerQuotePriceResponse {
  price: BigNumber;
}

/**
 * Linked Signer
 */

export interface GetIndexerLinkedSignerParams {
  subaccount: Subaccount;
}

export interface GetIndexerLinkedSignerResponse {
  totalTxLimit: BigNumber;
  remainingTxs: BigNumber;
  // If remainingTxs is 0, this is the time until the next link signer tx can be sent
  waitTimeUntilNextTx: BigNumber;
  // If zero address, none is configured
  signer: string;
}

/**
 * Interest / funding payments
 */

export interface GetIndexerInterestFundingPaymentsParams {
  subaccount: Subaccount;
  productIds: number[];
  maxTimestampInclusive?: number;
  limit: number;
  // Max submission index, inclusive
  startCursor?: string;
}

export interface IndexerProductPayment {
  productId: number;
  submissionIndex: string;
  timestamp: BigNumber;
  paymentAmount: BigNumber;
  // For spots: previous spot balance at the moment of payment (exclusive of `paymentAmount`).
  // For perps: previous perp balance at the moment of payment + amount of perps locked in LPs (exclusive of `paymentAmount`).
  balanceAmount: BigNumber;
  // Represents the annually interest rate for spots and annually funding rate for perps.
  annualPaymentRate: BigNumber;
  oraclePrice: BigNumber;
  isolated: boolean;
  // The product ID associated with the isolated perp market. This is only used when product_id === QUOTE_PRODUCT_ID and isolated === true
  isolatedProductId: number | null;
}

export interface GetIndexerInterestFundingPaymentsResponse {
  interestPayments: IndexerProductPayment[];
  fundingPayments: IndexerProductPayment[];
  nextCursor: string | null;
}

/**
 * Referral code
 */

export interface GetIndexerReferralCodeParams {
  subaccount: Subaccount;
}

export interface GetIndexerReferralCodeResponse {
  referralCode: string | null;
}

/**
 * Maker stats
 */

export interface GetIndexerMakerStatisticsParams {
  productId: number;
  epoch: number;
  interval: number;
}

export interface IndexerMakerSnapshot {
  timestamp: BigNumber;
  makerFee: BigNumber;
  uptime: BigNumber;
  sumQMin: BigNumber;
  qScore: BigNumber;
  makerShare: BigNumber;
  expectedMakerReward: BigNumber;
}

export interface IndexerMaker {
  address: string;
  snapshots: IndexerMakerSnapshot[];
}

export interface GetIndexerMakerStatisticsResponse {
  rewardCoefficient: BigNumber;
  makers: IndexerMaker[];
}

/**
 * Leaderboards
 */

export interface GetIndexerLeaderboardParams {
  contestId: number;
  rankType: IndexerLeaderboardRankType;
  // Min rank inclusive
  startCursor?: string;
  limit?: number;
}

export interface IndexerLeaderboardParticipant {
  subaccount: Subaccount;
  contestId: number;
  pnl: BigNumber;
  pnlRank: BigNumber;
  percentRoi: BigNumber;
  roiRank: BigNumber;
  // Float indicating the ending account value at the time the snapshot was taken i.e: at updateTime
  accountValue: BigNumber;
  // Float indicating the trading volume at the time the snapshot was taken i.e: at updateTime.
  // Null for contests that have no volume requirement.
  volume?: BigNumber;
  // Seconds
  updateTime: BigNumber;
}

export interface GetIndexerLeaderboardResponse {
  participants: IndexerLeaderboardParticipant[];
}

export interface GetIndexerLeaderboardParticipantParams {
  contestIds: number[];
  subaccount: Subaccount;
}

export interface GetIndexerLeaderboardParticipantResponse {
  // If the subaccount is not eligible for a given contest, it would not be included in the response.
  // contestId -> IndexerLeaderboardParticipant
  participant: Record<string, IndexerLeaderboardParticipant>;
}

interface LeaderboardSignatureParams {
  // endpoint address
  verifyingAddr: string;
  chainId: number;
}

export interface GetIndexerLeaderboardRegistrationParams extends Subaccount {
  contestId: number;
}

export interface UpdateIndexerLeaderboardRegistrationParams extends GetIndexerLeaderboardRegistrationParams {
  updateRegistration: LeaderboardSignatureParams;
  // In millis, defaults to 90s in the future
  recvTime?: BigNumber;
}

export interface IndexerLeaderboardRegistration {
  subaccount: Subaccount;
  contestId: number;
  // Seconds
  updateTime: BigNumber;
}

export interface GetIndexerLeaderboardRegistrationResponse {
  // For non-tiered contests, null if the user is not registered for the provided contestId.
  // For tiered contests (i.e., related contests), null if the user is not registered for any of the contests in the tier group.
  registration: IndexerLeaderboardRegistration | null;
}

export type UpdateIndexerLeaderboardRegistrationResponse =
  GetIndexerLeaderboardRegistrationResponse;

export interface GetIndexerLeaderboardContestsParams {
  contestIds: number[];
}

export interface IndexerLeaderboardContest {
  contestId: number;
  // NOTE: Start / End times are ignored when `period` is non-zero.
  // Start time in seconds
  startTime: BigNumber;
  // End time in seconds
  endTime: BigNumber;
  // Contest duration in seconds; when set to 0, contest duration is [startTime,endTime];
  // Otherwise, contest runs indefinitely in the interval [lastUpdated - period, lastUpdated] if active;
  period: BigNumber;
  // Last updated time in Seconds
  lastUpdated: BigNumber;
  totalParticipants: BigNumber;
  // Float indicating the min account value required to be eligible for this contest e.g: 250.0
  minRequiredAccountValue: BigNumber;
  // Float indicating the min trading volume required to be eligible for this contest e.g: 1000.0
  minRequiredVolume: BigNumber;
  // For market-specific contests, only the volume from these products will be counted.
  requiredProductIds: number[];
  active: boolean;
}

export interface GetIndexerLeaderboardContestsResponse {
  contests: IndexerLeaderboardContest[];
}

export type GetIndexerFastWithdrawalSignatureParams =
  IndexerServerFastWithdrawalSignatureParams;

export interface GetIndexerFastWithdrawalSignatureResponse {
  idx: bigint;
  tx: NadoWithdrawCollateralTx['withdraw_collateral'];
  txBytes: Hex;
  signatures: Hex[];
}

/**
 * NLP
 */

export type GetIndexerNlpSnapshotsParams = IndexerSnapshotsIntervalParams;

export interface IndexerNlpSnapshot {
  submissionIndex: string;
  timestamp: BigNumber;
  // Total volume traded by the NLP, in terms of the primary quote
  cumulativeVolume: BigNumber;
  cumulativeTrades: BigNumber;
  cumulativeMintAmountQuote: BigNumber;
  cumulativeBurnAmountQuote: BigNumber;
  cumulativePnl: BigNumber;
  tvl: BigNumber;
  oraclePrice: BigNumber;
  depositors: BigNumber;
}

export interface GetIndexerNlpSnapshotsResponse {
  snapshots: IndexerNlpSnapshot[];
}

export interface GetIndexerBacklogResponse {
  // Total number of transactions stored in the indexer DB
  totalTxs: BigNumber;
  // Current nSubmissions value from the chain (i.e., number of processed txs)
  totalSubmissions: BigNumber;
  // Number of unprocessed transactions (totalTxs - totalSubmissions)
  backlogSize: BigNumber;
  // UNIX timestamp (in seconds) of when the data was last updated
  updatedAt: BigNumber;
  // Estimated time in seconds (float) to clear the entire backlog (null if unavailable)
  backlogEtaInSeconds: BigNumber | null;
  // Current submission rate in transactions per second (float) (null if unavailable)
  txsPerSecond: BigNumber | null;
}

export interface GetIndexerSubaccountDDAParams {
  subaccount: Subaccount;
}

export interface GetIndexerSubaccountDDAResponse {
  address: Address;
}

/**
 * Private Alpha Choice
 */

export interface GetIndexerPrivateAlphaChoiceParams {
  address: Address;
}

export interface GetIndexerPrivateAlphaChoiceResponse {
  points: BigNumber;
  feeRefund: BigNumber;
  nftEligibility: boolean;
}

/**
 * Nado Points
 */

export interface GetIndexerPointsParams {
  address: Address;
}

export interface IndexerPointsEpoch {
  epoch: number;
  description: string;
  /** Unix timestamp in seconds */
  startTime: BigNumber;
  /** Unix timestamp in seconds */
  endTime: BigNumber;
  totalPoints: BigNumber;
  points: BigNumber;
  rank: number;
  tier: number;
}

export interface IndexerAllTimePoints {
  points: BigNumber;
  rank: number;
  tier: number;
}

export interface GetIndexerPointsResponse {
  pointsPerEpoch: IndexerPointsEpoch[];
  allTimePoints: IndexerAllTimePoints;
}

/**
 * V2 Tickers
 */

/**
 * Market type for ticker filtering
 */
export type TickerMarketType = 'spot' | 'perp';

/**
 * Parameters for querying v2 tickers endpoint
 */
export interface GetIndexerV2TickersParams {
  /**
   * Filter tickers by market type (spot or perp)
   * @example 'spot'
   * @example 'perp'
   */
  market?: TickerMarketType;
  /**
   * Whether to include edge products
   * @default false
   */
  edge?: boolean;
}

/**
 * Individual ticker data from v2 endpoint
 */
export interface IndexerV2TickerResponse {
  /** Unique product identifier */
  productId: number;
  /** Unique ticker identifier */
  tickerId: string;
  /** Base currency symbol */
  baseCurrency: string;
  /** Quote currency symbol */
  quoteCurrency: string;
  /** Last traded price */
  lastPrice: number;
  /** 24h trading volume in base currency */
  baseVolume: number;
  /** 24h trading volume in quote currency */
  quoteVolume: number;
  /** 24h price change percentage */
  priceChangePercent24h: number;
}

/**
 * Response from v2 tickers endpoint
 * Maps ticker IDs to their respective ticker data
 */
export type GetIndexerV2TickersResponse = Record<
  string,
  IndexerV2TickerResponse
>;

/**
 * Parameters for querying v2 symbols endpoint
 */
export interface GetIndexerV2SymbolsParams {
  /**
   * Filter by product type
   * @example 'spot'
   * @example 'perp'
   */
  productType?: 'spot' | 'perp';
  /**
   * Comma-separated list of product IDs to filter by
   * @example '2,4,42'
   */
  productIds?: string;
}

/**
 * Market hours information for a product
 */
export interface IndexerV2MarketHours {
  /** Whether the market is currently in its regular trading session */
  isOpen: boolean;
  /** Why the market is closed: "weekend" or "holiday". Null when open. */
  reason: string | null;
  /** ISO 8601 UTC timestamp of the next session close. Null when closed. */
  nextClose: string | null;
  /** ISO 8601 UTC timestamp of the next session open. Null when no upcoming open. */
  nextOpen: string | null;
}

export type IndexerV2TradingStatus =
  // Normal trading, all order types accepted
  | 'live'
  // Only post-only orders accepted (taker orders rejected)
  | 'post_only'
  // Only reduce-only orders accepted; used when a market is being delisted
  | 'reduce_only'
  // No new positions can be opened; only orders that reduce existing positions are accepted. Used during periods of low activity (e.g. weekends, holidays)
  | 'soft_reduce_only'
  // No orders accepted
  | 'not_tradable';

/**
 * Individual symbol data from v2 endpoint
 */
export interface IndexerV2Symbol {
  /** Product type: "spot" or "perp" */
  type: string;
  /** Unique product identifier */
  productId: number;
  /** Trading symbol (e.g., "BTC-PERP", "WETH") */
  symbol: string;
  /** Minimum price increment */
  priceIncrement: BigNumber;
  /** Minimum order size increment (base denominated) */
  sizeIncrement: string;
  /** Minimum order size (USDT0 denominated) */
  minSize: string;
  /** Default maker fee rate (negative = rebate) */
  makerFeeRate: BigNumber;
  /** Default taker fee rate */
  takerFeeRate: BigNumber;
  /** Initial margin weight for long positions */
  longWeightInitial: BigNumber;
  /** Maintenance margin weight for long positions */
  longWeightMaintenance: BigNumber;
  /** Maximum open interest cap. Null if uncapped. */
  maxOpenInterest: BigNumber | null;
  /** Current trading status */
  tradingStatus: IndexerV2TradingStatus;
  /** Whether the market only accepts isolated margin orders */
  isolatedOnly: boolean;
  /** Market hours information. Null for 24/7 markets. */
  marketHours: IndexerV2MarketHours | null;
}

/**
 * Response from v2 symbols endpoint
 * Maps symbols to their respective data
 */
export type GetIndexerV2SymbolsResponse = Record<string, IndexerV2Symbol>;
