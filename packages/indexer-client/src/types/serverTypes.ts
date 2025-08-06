import {
  EIP712LeaderboardAuthenticationValues,
  SignedTx,
} from '@nadohq/contracts';
import { IndexerEventType } from './IndexerEventType';
import { IndexerLeaderboardRankType } from './IndexerLeaderboardType';
import { NadoWithdrawCollateralTx } from './NadoTx';
import {
  IndexerServerCandlestick,
  IndexerServerEvent,
  IndexerServerLeaderboardContest,
  IndexerServerLeaderboardPosition,
  IndexerServerLeaderboardRegistration,
  IndexerServerMaker,
  IndexerServerMarketSnapshot,
  IndexerServerMarketSnapshotInterval,
  IndexerServerMatchEvent,
  IndexerServerOraclePrice,
  IndexerServerOrder,
  IndexerServerProductPayment,
  IndexerServerProductSnapshot,
  IndexerServerSnapshotsInterval,
  IndexerServerTx,
  IndexerServerVlpSnapshot,
} from './serverModelTypes';

/**
 * Params
 */

export interface IndexerServerListSubaccountsParams {
  // Inclusive, defaults to 0
  start?: number;
  // Defaults to 100
  limit?: number;
  address?: string;
}

export interface IndexerServerMultiSubaccountSnapshotsParams {
  // Subaccount hex identifiers
  subaccounts: string[];
  timestamps: number[];
  // If not given, will return both isolated & non-iso balances
  isolated?: boolean;
}

export interface IndexerServerReferralCodeParams {
  subaccount: string;
}

export interface IndexerServerFundingRateParams {
  product_id: number;
}

export interface IndexerServerFundingRatesParams {
  product_ids: number[];
}

export interface IndexerServerPriceParams {
  product_id: number;
}

export interface IndexerServerPerpPricesParams {
  product_ids: number[];
}

export interface IndexerServerOraclePricesParams {
  product_ids: number[];
}

export interface IndexerServerCandlesticksParams {
  product_id: number;
  granularity: number;
  // Seconds
  max_time?: number;
  limit: number;
}

export type IndexerEdgeServerCandlesticksParams =
  IndexerServerCandlesticksParams;

export interface IndexerServerProductsParams {
  product_id: number;
  max_time?: number;
  limit: number;
  // submission_idx for pagination, inclusive
  idx?: string;
}

export interface IndexerServerMultiProductsParams {
  product_ids: number[];
  max_time: number[];
}

export interface IndexerServerEventsParams {
  subaccount?: string;
  product_ids?: number[];
  // If not given, will return both isolated & non-iso events
  isolated?: boolean;
  event_types?: IndexerEventType[];
  // Descending order for idx (time), defaults to true
  desc?: boolean;
  // submission_idx for pagination, inclusive
  idx?: string;
  max_time?: number;
  limit?:
    | {
        raw: number;
      }
    | {
        txs: number;
      };
}

export interface IndexerServerOrdersParams {
  subaccount?: string;
  product_ids?: number[];
  digests?: string[];
  max_time?: number;
  limit?: number;
  // If not given, will return both isolated & non-iso orders
  isolated?: boolean;
  // submission_idx for pagination, inclusive
  idx?: string;
}

export interface IndexerServerMatchEventsParams {
  subaccount?: string;
  product_ids?: number[];
  // If not given, will return both isolated & non-iso events
  isolated?: boolean;
  max_time?: number;
  limit: number;
  // submission_idx for pagination, inclusive
  idx?: string;
}

export interface IndexerServerLinkedSignerParams {
  subaccount: string;
}

export interface IndexerServerMarketSnapshotsParams {
  interval: IndexerServerMarketSnapshotInterval;
  // Defaults to all
  product_ids?: number[];
}

export interface IndexerEdgeServerMarketSnapshotsParams {
  interval: IndexerServerMarketSnapshotInterval;
}

export interface IndexerServerInterestFundingParams {
  subaccount: string;
  product_ids: number[];
  // If not given, defaults to latest
  max_idx?: string;
  max_time?: number;
  limit: number;
}

export interface IndexerServerMakerStatisticsParams {
  product_id: number;
  epoch: number;
  interval: number;
}

export interface IndexerServerLeaderboardParams {
  contest_id: number;
  rank_type: IndexerLeaderboardRankType;
  start?: number | string;
  limit?: number | string;
}

export interface IndexerServerLeaderboardRankParams {
  subaccount: string;
  contest_ids: number[];
}

export interface IndexerServerLeaderboardContestsParams {
  contest_ids: number[];
}

export interface IndexerServerLeaderboardRegistrationParams {
  subaccount: string;
  contest_id: number;
  update_registration: SignedTx<EIP712LeaderboardAuthenticationValues> | null;
}

export interface IndexerServerFastWithdrawalSignatureParams {
  /**
   * The submission index of the WithdrawCollateral tx to be used for fast withdraw.
   */
  idx: number | string;
}

export interface IndexerServerVlpSnapshotsParams {
  interval: IndexerServerSnapshotsInterval;
}

// Request
export interface IndexerServerQueryRequestByType {
  account_snapshots: IndexerServerMultiSubaccountSnapshotsParams;
  backlog: Record<string, never>;
  candlesticks: IndexerServerCandlesticksParams;
  edge_candlesticks: IndexerEdgeServerCandlesticksParams;
  edge_market_snapshots: IndexerEdgeServerMarketSnapshotsParams;
  events: IndexerServerEventsParams;
  fast_withdrawal_signature: IndexerServerFastWithdrawalSignatureParams;
  funding_rate: IndexerServerFundingRateParams;
  funding_rates: IndexerServerFundingRatesParams;
  interest_and_funding: IndexerServerInterestFundingParams;
  leaderboard: IndexerServerLeaderboardParams;
  leaderboard_contests: IndexerServerLeaderboardContestsParams;
  leaderboard_rank: IndexerServerLeaderboardRankParams;
  leaderboard_registration: IndexerServerLeaderboardRegistrationParams;
  linked_signer_rate_limit: IndexerServerLinkedSignerParams;
  maker_statistics: IndexerServerMakerStatisticsParams;
  market_snapshots: IndexerServerMarketSnapshotsParams;
  matches: IndexerServerMatchEventsParams;
  oracle_price: IndexerServerOraclePricesParams;
  orders: IndexerServerOrdersParams;
  perp_prices: IndexerServerPerpPricesParams;
  price: IndexerServerPriceParams;
  product_snapshots: IndexerServerMultiProductsParams;
  products: IndexerServerProductsParams;
  referral_code: IndexerServerReferralCodeParams;
  subaccounts: IndexerServerListSubaccountsParams;
  usdc_price: Record<string, never>;
  vlp_snapshots: IndexerServerVlpSnapshotsParams;
}

export type IndexerServerQueryRequestType =
  keyof IndexerServerQueryRequestByType;

/**
 * Responses
 */

export interface IndexerServerListSubaccountsResponse {
  subaccounts: {
    id: string;
    // Hex of subaccount bytes
    subaccount: string;
  }[];
}

export interface IndexerServerMultiSubaccountSnapshotsResponse {
  // Map of subaccount hex -> timestamp requested -> latest events corresponding to each product
  snapshots: Record<string, Record<string, IndexerServerEvent[]>>;
}

export interface IndexerServerReferralCodeResponse {
  referral_code: string | null;
}

export interface IndexerServerFundingRate {
  product_id: number;
  funding_rate_x18: string;
  update_time: number;
}

export type IndexerServerFundingRateResponse = IndexerServerFundingRate;

// Map of productId -> IndexerServerFundingRate
export type IndexerServerFundingRatesResponse = Record<
  string,
  IndexerServerFundingRate
>;

export interface IndexerServerPerpPrices {
  product_id: number;
  index_price_x18: string;
  mark_price_x18: string;
  update_time: number;
}

export type IndexerServerPriceResponse = IndexerServerPerpPrices;

// Map of productId -> IndexerServerPerpPrices
export type IndexerServerPerpPricesResponse = Record<
  string,
  IndexerServerPerpPrices
>;

export interface IndexerServerOraclePricesResponse {
  prices: IndexerServerOraclePrice[];
}

export interface IndexerServerCandlesticksResponse {
  candlesticks: IndexerServerCandlestick[];
}

export type IndexerEdgeServerCandlesticksResponse =
  IndexerServerCandlesticksResponse;

export interface IndexerServerProductsResponse {
  products: IndexerServerProductSnapshot[];
  txs: IndexerServerTx[];
}

// Map of timestamp -> (productID -> IndexerServerProductSnapshot)
export type IndexerServerMultiProductsResponse = Record<
  string,
  Record<string, IndexerServerProductSnapshot>
>;

export interface IndexerServerEventsResponse {
  events: IndexerServerEvent[];
  txs: IndexerServerTx[];
}

export interface IndexerServerOrdersResponse {
  orders: IndexerServerOrder[];
}

export interface IndexerServerMatchEventsResponse {
  matches: IndexerServerMatchEvent[];
  txs: IndexerServerTx[];
}

export interface IndexerServerUsdcPriceResponse {
  price_x18: string;
}

export interface IndexerServerLinkedSignerResponse {
  total_tx_limit: string;
  remaining_tx: string;
  wait_time: string;
  signer: string;
}

export interface IndexerServerMarketSnapshotsResponse {
  snapshots: IndexerServerMarketSnapshot[];
}

export interface IndexerEdgeServerMarketSnapshotsResponse {
  snapshots: Record<number, IndexerServerMarketSnapshot[]>;
}

export interface IndexerServerInterestFundingResponse {
  interest_payments: IndexerServerProductPayment[];
  funding_payments: IndexerServerProductPayment[];
  next_idx: string;
}

export interface IndexerServerMakerStatisticsResponse {
  reward_coefficient: string;
  makers: IndexerServerMaker[];
}

export interface IndexerServerLeaderboardResponse {
  positions: IndexerServerLeaderboardPosition[];
}

export interface IndexerServerLeaderboardRegistrationResponse {
  // For non-tiered contests, null if the user is not registered for the provided contestId.
  // For tiered contests (i.e., related contests), null if the user is not registered for any of the contests in the tier group.
  registration: IndexerServerLeaderboardRegistration | null;
}

export interface IndexerServerLeaderboardRankResponse {
  // If the subaccount is not eligible for a given contest, it would not be included in the response.
  // contestId -> IndexerServerLeaderboardPosition
  positions: Record<string, IndexerServerLeaderboardPosition>;
}

export interface IndexerServerLeaderboardContestsResponse {
  contests: IndexerServerLeaderboardContest[];
}

export interface IndexerServerFastWithdrawalSignatureResponse {
  idx: string;
  tx: NadoWithdrawCollateralTx['withdraw_collateral'];
  tx_bytes: string;
  signatures: string[];
}

export interface IndexerServerVlpSnapshotsResponse {
  snapshots: IndexerServerVlpSnapshot[];
}

export interface IndexerServerBacklogResponse {
  // Total number of transactions stored in the indexer DB
  total_txs: string;
  // Current nSubmissions value from the chain (i.e., number of processed txs)
  total_submissions: string;
  // Number of unprocessed transactions (total_txs - total_submissions)
  backlog_size: string;
  // UNIX timestamp (in seconds) of when the data was last updated
  updated_at: string;
  // Estimated time in seconds (float) to clear the entire backlog (null if unavailable)
  backlog_eta_in_seconds: string | null;
  // Current submission rate in transactions per second (float) (null if unavailable)
  txs_per_second: string | null;
}

// Response
export interface IndexerServerQueryResponseByType {
  account_snapshots: IndexerServerMultiSubaccountSnapshotsResponse;
  backlog: IndexerServerBacklogResponse;
  candlesticks: IndexerServerCandlesticksResponse;
  edge_candlesticks: IndexerEdgeServerCandlesticksResponse;
  edge_market_snapshots: IndexerEdgeServerMarketSnapshotsResponse;
  events: IndexerServerEventsResponse;
  fast_withdrawal_signature: IndexerServerFastWithdrawalSignatureResponse;
  funding_rate: IndexerServerFundingRateResponse;
  funding_rates: IndexerServerFundingRatesResponse;
  interest_and_funding: IndexerServerInterestFundingResponse;
  leaderboard: IndexerServerLeaderboardResponse;
  leaderboard_contests: IndexerServerLeaderboardContestsResponse;
  leaderboard_rank: IndexerServerLeaderboardRankResponse;
  leaderboard_registration: IndexerServerLeaderboardRegistrationResponse;
  linked_signer_rate_limit: IndexerServerLinkedSignerResponse;
  maker_statistics: IndexerServerMakerStatisticsResponse;
  market_snapshots: IndexerServerMarketSnapshotsResponse;
  matches: IndexerServerMatchEventsResponse;
  oracle_price: IndexerServerOraclePricesResponse;
  orders: IndexerServerOrdersResponse;
  perp_prices: IndexerServerPerpPricesResponse;
  price: IndexerServerPriceResponse;
  product_snapshots: IndexerServerMultiProductsResponse;
  products: IndexerServerProductsResponse;
  referral_code: IndexerServerReferralCodeResponse;
  subaccounts: IndexerServerListSubaccountsResponse;
  usdc_price: IndexerServerUsdcPriceResponse;
  vlp_snapshots: IndexerServerVlpSnapshotsResponse;
}
