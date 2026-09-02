import {
  EIP712LeaderboardAuthenticationValues,
  EIP712SocialAuthenticationValues,
  SignedTx,
} from '@nadohq/shared';
import { IndexerEventType } from './IndexerEventType';
import { IndexerLeaderboardRankType } from './IndexerLeaderboardType';
import { NadoWithdrawCollateralTx, NadoWithdrawCollateralV2Tx } from './NadoTx';
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
  IndexerServerNlpSnapshot,
  IndexerServerOraclePrice,
  IndexerServerOrder,
  IndexerServerPosition,
  IndexerServerProductPayment,
  IndexerServerProductSnapshot,
  IndexerServerSnapshotsInterval,
  IndexerServerSocialAccount,
  IndexerServerTx,
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

export interface IndexerServerFundingRateHistoryParams {
  product_id: number;
  start_time?: number | string;
  end_time?: number | string;
  // Max number of rates to return. Defaults to 100, max 1000.
  limit?: number;
}

export interface IndexerServerPriceParams {
  product_id: number;
}

export interface IndexerServerPerpPricesParams {
  product_ids: number[];
}

export interface IndexerServerPortfolioParams {
  subaccount: string;
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
  subaccounts?: string[];
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

export type IndexerServerTriggerTypeFilter =
  | 'none'
  | 'price_trigger'
  | 'time_trigger';

export interface IndexerServerOrdersParams {
  subaccounts?: string[];
  product_ids?: number[];
  trigger_types?: IndexerServerTriggerTypeFilter[];
  digests?: string[];
  max_time?: number;
  limit?: number;
  // If not given, will return both isolated & non-iso orders
  isolated?: boolean;
  // submission_idx for pagination, inclusive
  idx?: string;
}

export interface IndexerServerMatchEventsParams {
  subaccounts?: string[];
  product_ids?: number[];
  // If not given, will return both isolated & non-iso events
  isolated?: boolean;
  max_time?: number;
  limit: number;
  // submission_idx for pagination, inclusive
  idx?: string;
}

/**
 * Params for the positions query. All parameters except `subaccount` are optional filters.
 */
export interface IndexerServerPositionsParams {
  // Subaccount hex identifier. Isolated positions are also returned under the parent subaccount
  subaccount: string;
  // When provided, only return positions of the specified product
  product_id?: number;
  // If not given, will return both isolated & cross positions
  isolated?: boolean;
  // If not given, will return both open & closed positions
  open?: boolean;
  // open_id for pagination, inclusive (only positions with open_id <= idx are returned)
  idx?: number | string;
  // Max number of positions to return. Defaults to 100, max 500
  limit?: number;
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
  rank_type?: IndexerLeaderboardRankType;
  start?: number | string;
  limit?: number | string;
  order?: 'ASC' | 'DESC';
}

export interface IndexerServerLeaderboardRankParams {
  subaccount: string;
  contest_ids: number[];
}

export interface IndexerServerLeaderboardContestsParams {
  contest_ids?: number[];
  active?: boolean;
}

export interface IndexerServerLeaderboardRegistrationsParams {
  subaccount: string;
  contest_ids?: number[];
  active?: boolean;
}

export interface IndexerServerLeaderboardRegisterParams {
  update_registration: SignedTx<EIP712LeaderboardAuthenticationValues>;
}

export interface IndexerServerSocialConnectParams {
  update_social_account: SignedTx<EIP712SocialAuthenticationValues>;
}

export interface IndexerServerListSocialAccountsParams {
  address: string;
}

export type IndexerServerRevokeSocialAccountParams =
  IndexerServerSocialConnectParams;

export interface IndexerServerFastWithdrawalSignatureParams {
  /**
   * The submission index of the WithdrawCollateral tx to be used for fast withdraw.
   */
  idx: number | string;
}

export interface IndexerServerNlpSnapshotsParams {
  interval: IndexerServerSnapshotsInterval;
}

export interface IndexerServerDDAQueryParams {
  subaccount: string;
}

export interface IndexerServerPrivateAlphaChoiceParams {
  address: string;
}

export interface IndexerServerPointsParams {
  address: string;
}

export interface IndexerServerXPointsParams {
  address: string;
}

export interface IndexerServerCashIncentivesParams {
  wallet_address: string;
}

// Request
export interface IndexerServerQueryRequestByType {
  account_snapshots: IndexerServerMultiSubaccountSnapshotsParams;
  backlog: Record<string, never>;
  candlesticks: IndexerServerCandlesticksParams;
  direct_deposit_address: IndexerServerDDAQueryParams;
  edge_candlesticks: IndexerEdgeServerCandlesticksParams;
  edge_market_snapshots: IndexerEdgeServerMarketSnapshotsParams;
  events: IndexerServerEventsParams;
  fast_withdrawal_signature: IndexerServerFastWithdrawalSignatureParams;
  funding_rate: IndexerServerFundingRateParams;
  funding_rate_history: IndexerServerFundingRateHistoryParams;
  funding_rates: IndexerServerFundingRatesParams;
  interest_and_funding: IndexerServerInterestFundingParams;
  leaderboard: IndexerServerLeaderboardParams;
  leaderboard_contests: IndexerServerLeaderboardContestsParams;
  leaderboard_rank: IndexerServerLeaderboardRankParams;
  leaderboard_register: IndexerServerLeaderboardRegisterParams;
  leaderboard_registrations: IndexerServerLeaderboardRegistrationsParams;
  linked_signer_rate_limit: IndexerServerLinkedSignerParams;
  maker_statistics: IndexerServerMakerStatisticsParams;
  market_snapshots: IndexerServerMarketSnapshotsParams;
  matches: IndexerServerMatchEventsParams;
  oracle_price: IndexerServerOraclePricesParams;
  orders: IndexerServerOrdersParams;
  perp_prices: IndexerServerPerpPricesParams;
  portfolio: IndexerServerPortfolioParams;
  positions: IndexerServerPositionsParams;
  price: IndexerServerPriceParams;
  product_snapshots: IndexerServerMultiProductsParams;
  products: IndexerServerProductsParams;
  referral_code: IndexerServerReferralCodeParams;
  subaccounts: IndexerServerListSubaccountsParams;
  quote_price: Record<string, never>;
  nlp_snapshots: IndexerServerNlpSnapshotsParams;
  private_alpha_choice: IndexerServerPrivateAlphaChoiceParams;
  nado_points: IndexerServerPointsParams;
  nado_xpoints: IndexerServerXPointsParams;
  cash_incentives: IndexerServerCashIncentivesParams;
  social_connect: IndexerServerSocialConnectParams;
  list_social_accounts: IndexerServerListSocialAccountsParams;
  revoke_social_account: IndexerServerRevokeSocialAccountParams;
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
    // UNIX timestamp in seconds
    created_at: string;
    isolated: boolean;
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

export interface IndexerServerFundingRateHistoryEntry {
  product_id: number;
  // Epoch time in seconds of the settlement tick this funding rate was recorded at.
  timestamp: string;
  // Realized hourly funding rate at this tick, multiplied by 10^18 (% = rate * 100).
  funding_rate_x18: string;
}

export interface IndexerServerFundingRateHistoryResponse {
  // Always ascending by timestamp.
  funding_rates: IndexerServerFundingRateHistoryEntry[];
}

export type IndexerServerPortfolioPeriod =
  | 'day'
  | 'week'
  | 'month'
  | 'allTime'
  | 'perpDay'
  | 'perpWeek'
  | 'perpMonth'
  | 'perpAllTime';

/**
 * [timestamp (unix seconds), value] — both x18-free decimal strings. Values are
 * USDT0-denominated, except `marketCountHistory` points, which are integer counts.
 */
export type IndexerServerPortfolioPoint = [string, string];

// All five series are aligned: same timestamps, same length.
export interface IndexerServerPortfolioHistory {
  accountValueHistory: IndexerServerPortfolioPoint[];
  pnlHistory: IndexerServerPortfolioPoint[];
  volumeHistory: IndexerServerPortfolioPoint[];
  tradeSizeHistory: IndexerServerPortfolioPoint[];
  marketCountHistory: IndexerServerPortfolioPoint[];
}

export type IndexerServerPortfolioResponse = [
  IndexerServerPortfolioPeriod,
  IndexerServerPortfolioHistory,
][];

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

/**
 * Response for the positions query. Positions are in descending order by `open_id`.
 * `events` / `txs` are the events and transactions at each position's boundaries
 * (open and close, or open and latest update while still open), joined to positions
 * via `open_id` / `close_id` / `submission_idx`.
 */
export interface IndexerServerPositionsResponse {
  positions: IndexerServerPosition[];
  events: IndexerServerEvent[];
  txs: IndexerServerTx[];
}

export interface IndexerServerQuotePriceResponse {
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

export interface IndexerServerLeaderboardRegistrationsResponse {
  registrations: IndexerServerLeaderboardRegistration[];
}

export type IndexerServerLeaderboardRegisterResponse =
  IndexerServerLeaderboardRegistrationsResponse;

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
  // Present only for `WithdrawCollateralV2` withdrawals.
  tx_v2?: NadoWithdrawCollateralV2Tx['withdraw_collateral_v2'];
  tx_bytes: string;
  signatures: string[];
}

export interface IndexerServerNlpSnapshotsResponse {
  snapshots: IndexerServerNlpSnapshot[];
}

export interface IndexerServerDDAResponse {
  v1_address: string;
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

export interface IndexerServerPrivateAlphaChoiceResponse {
  points: string;
  fee_refund: string;
  nft_eligibility: boolean;
}

export interface IndexerServerPointsEpoch {
  epoch: number;
  description: string;
  start_time: string;
  end_time: string;
  total_points: string;
  points: string;
  rank: number;
  tier: number;
}

export interface IndexerServerAllTimePoints {
  points: string;
  rank: number;
  tier: number;
}

export interface IndexerServerPointsResponse {
  points_per_epoch: IndexerServerPointsEpoch[];
  all_time_points: IndexerServerAllTimePoints;
}

export interface IndexerServerXPointsQuest {
  quest_type: string;
  points: string;
}

export interface IndexerServerXPointsEpoch {
  epoch: number;
  description: string;
  start_time: string;
  end_time: string;
  total_points: string;
  rank: number;
  quests: IndexerServerXPointsQuest[];
}

export interface IndexerServerXPointsAllTime {
  total_points: string;
  rank: number;
  quests: IndexerServerXPointsQuest[];
}

export interface IndexerServerXPointsResponse {
  points_per_epoch: IndexerServerXPointsEpoch[];
  all_time_points: IndexerServerXPointsAllTime;
}

export interface IndexerServerCashIncentivesEventMetadata {
  event_id: number;
  description: string;
  // UNIX timestamp in seconds
  epoch_start: string;
  // UNIX timestamp in seconds
  epoch_end: string;
  // x18 string
  max_volume: string;
  // x18 string
  max_reward: string;
  // x18 string
  min_volume: string;
  // x18 string
  min_reward: string;
}

export interface IndexerServerCashIncentivesEventPlatform {
  // x18 string
  platform_volume: string;
  // x18 string
  unlocked_reward: string;
}

/**
 * Claim status of a wallet for a single Cash Incentives event.
 *
 * - `in_progress`: the event is still active.
 * - `pending`: the event has ended, but its settlement has not been published.
 * - `no_reward`: the settlement exists, but the wallet has no reward.
 * - `claimable`: the settlement grants this wallet a reward, and the proof to claim it is included.
 *
 * There is deliberately no `claimed` status. The airdrop contract's `getClaimed` is the source of
 * truth for whether a reward has already been taken, so a reward stays `claimable` here even after
 * it has been claimed onchain.
 */
export const INDEXER_SERVER_CASH_INCENTIVES_WALLET_STATUSES = [
  'in_progress',
  'pending',
  'no_reward',
  'claimable',
] as const;

export type IndexerServerCashIncentivesWalletStatus =
  (typeof INDEXER_SERVER_CASH_INCENTIVES_WALLET_STATUSES)[number];

/**
 * `wallet.claim` variant carrying everything needed to claim onchain.
 */
export interface IndexerServerCashIncentivesClaimableClaim {
  status: 'claimable';
  airdrop_address: string;
  // Reward event id within the airdrop contract, distinct from `metadata.event_id`
  week: number;
  // Integer string in raw token units, as committed to by the merkle root
  total_amount: string;
  // Merkle proof hashes
  proof: string[];
}

/**
 * `wallet.claim` variant for events with nothing to claim, which carries only the status.
 */
export interface IndexerServerCashIncentivesUnclaimableClaim {
  status: Exclude<IndexerServerCashIncentivesWalletStatus, 'claimable'>;
}

/**
 * Always present, tagged on `status`. Only the `claimable` variant carries proof data.
 */
export type IndexerServerCashIncentivesWalletClaim =
  | IndexerServerCashIncentivesClaimableClaim
  | IndexerServerCashIncentivesUnclaimableClaim;

export interface IndexerServerCashIncentivesEventWallet {
  // x18 string
  reward: string;
  claim: IndexerServerCashIncentivesWalletClaim;
}

export interface IndexerServerCashIncentivesEvent {
  metadata: IndexerServerCashIncentivesEventMetadata;
  platform: IndexerServerCashIncentivesEventPlatform;
  wallet: IndexerServerCashIncentivesEventWallet;
}

export interface IndexerServerCashIncentivesWalletSummary {
  // x18 string
  total_reward: string;
  // x18 string
  claimable_reward: string;
}

export interface IndexerServerCashIncentivesResponse {
  events: IndexerServerCashIncentivesEvent[];
  wallet_summary: IndexerServerCashIncentivesWalletSummary;
}

export interface IndexerServerSocialConnectResponse {
  url: string;
}

export interface IndexerServerSocialAccountsResponse {
  accounts: IndexerServerSocialAccount[];
}

// Response
export interface IndexerServerQueryResponseByType {
  account_snapshots: IndexerServerMultiSubaccountSnapshotsResponse;
  backlog: IndexerServerBacklogResponse;
  candlesticks: IndexerServerCandlesticksResponse;
  direct_deposit_address: IndexerServerDDAResponse;
  edge_candlesticks: IndexerEdgeServerCandlesticksResponse;
  edge_market_snapshots: IndexerEdgeServerMarketSnapshotsResponse;
  events: IndexerServerEventsResponse;
  fast_withdrawal_signature: IndexerServerFastWithdrawalSignatureResponse;
  funding_rate: IndexerServerFundingRateResponse;
  funding_rate_history: IndexerServerFundingRateHistoryResponse;
  funding_rates: IndexerServerFundingRatesResponse;
  interest_and_funding: IndexerServerInterestFundingResponse;
  leaderboard: IndexerServerLeaderboardResponse;
  leaderboard_contests: IndexerServerLeaderboardContestsResponse;
  leaderboard_rank: IndexerServerLeaderboardRankResponse;
  leaderboard_register: IndexerServerLeaderboardRegisterResponse;
  leaderboard_registrations: IndexerServerLeaderboardRegistrationsResponse;
  linked_signer_rate_limit: IndexerServerLinkedSignerResponse;
  maker_statistics: IndexerServerMakerStatisticsResponse;
  market_snapshots: IndexerServerMarketSnapshotsResponse;
  matches: IndexerServerMatchEventsResponse;
  oracle_price: IndexerServerOraclePricesResponse;
  orders: IndexerServerOrdersResponse;
  perp_prices: IndexerServerPerpPricesResponse;
  portfolio: IndexerServerPortfolioResponse;
  positions: IndexerServerPositionsResponse;
  price: IndexerServerPriceResponse;
  product_snapshots: IndexerServerMultiProductsResponse;
  products: IndexerServerProductsResponse;
  referral_code: IndexerServerReferralCodeResponse;
  subaccounts: IndexerServerListSubaccountsResponse;
  quote_price: IndexerServerQuotePriceResponse;
  nlp_snapshots: IndexerServerNlpSnapshotsResponse;
  private_alpha_choice: IndexerServerPrivateAlphaChoiceResponse;
  nado_points: IndexerServerPointsResponse;
  nado_xpoints: IndexerServerXPointsResponse;
  cash_incentives: IndexerServerCashIncentivesResponse;
  social_connect: IndexerServerSocialConnectResponse;
  list_social_accounts: IndexerServerSocialAccountsResponse;
  revoke_social_account: IndexerServerSocialAccountsResponse;
}

/**
 * V2 API Types
 */

/**
 * Individual ticker data from v2 indexer endpoint (server format)
 */
export interface IndexerServerV2TickerResponse {
  product_id: number;
  ticker_id: string;
  base_currency: string;
  quote_currency: string;
  last_price: number;
  base_volume: number;
  quote_volume: number;
  price_change_percent_24h: number;
}

/**
 * Response from v2 tickers endpoint (server format)
 * Maps ticker IDs to their respective ticker data
 */
export type IndexerServerV2TickersResponse = Record<
  string,
  IndexerServerV2TickerResponse
>;

/**
 * Market hours data from v2 symbols endpoint (server format)
 */
export interface IndexerServerV2MarketHours {
  is_open: boolean;
  reason: string | null;
  next_close: string | null;
  next_open: string | null;
}

/**
 * Individual symbol data from v2 indexer endpoint (server format)
 */
export interface IndexerServerV2Symbol {
  type: string;
  product_id: number;
  symbol: string;
  price_increment_x18: string;
  size_increment: string;
  min_size: string;
  maker_fee_rate_x18: string;
  taker_fee_rate_x18: string;
  long_weight_initial_x18: string;
  long_weight_maintenance_x18: string;
  /**
   * Defined only for perp markets with a max OI cap
   */
  max_open_interest_x18: string | null;
  /**
   * Defined only for xStocks spot markets
   */
  exchange_rate_x18: string | null;
  trading_status: string;
  isolated_only: boolean;
  market_hours: IndexerServerV2MarketHours | null;
  /**
   * Boost tier for products with rewards boosts. Null for non-boosted products.
   * 0 = none, 1 = taker 4x / maker 4x, 2 = taker 3x / maker 4x
   */
  boost_type: number | null;
  /**
   * Taker rewards multiplier. Null for non-boosted products.
   */
  taker_multiplier: number | null;
  /**
   * Maker rewards multiplier. Null for non-boosted products.
   */
  maker_multiplier: number | null;
}

/**
 * Response from v2 symbols endpoint (server format)
 * Maps symbols to their respective data
 */
export type IndexerServerV2SymbolsResponse = Record<
  string,
  IndexerServerV2Symbol
>;

/**
 * Wire `request_type` the indexer echoes on failure envelopes. The indexer's failure envelope is
 * keyed by route (`<verb>_<query_type>`), mirroring the engine and trigger services. Kept as a
 * `${string}_${string}` template to avoid enumerating the full set of v1 query types declared
 * above.
 */
export type IndexerServerRequestType = `${string}_${string}`;

/**
 * Failure envelope returned by the indexer service API. Mirrors the failure shape used by the
 * engine and trigger services: a `status: 'failure'` discriminant plus an `error`/`error_code`
 * pair and the originating `request_type`. A response missing this envelope shape (e.g. a
 * malformed body, or a non-JSON response) is a transport-level error, not a domain error.
 *
 * The v2 REST endpoints do not return this envelope — they use plain HTTP error responses
 * without an `error_code` field.
 */
export interface IndexerServerFailureResponse {
  status: 'failure';
  error: string;
  error_code: number;
  request_type: IndexerServerRequestType;
}

/**
 * Narrows an unknown response body to the indexer service API failure envelope.
 */
export function isIndexerServerFailureResponse(
  data: unknown,
): data is IndexerServerFailureResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).status === 'failure'
  );
}
