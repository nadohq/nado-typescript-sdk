import {
  EIP712LeaderboardAuthenticationParams,
  EIP712LeaderboardAuthenticationValues,
  EIP712SocialAuthenticationParams,
  getDefaultRecvTime,
  getNadoEIP712Values,
  getSignedTransactionRequest,
  getValidatedAddress,
  getValidatedHex,
  mapValues,
  nowInSeconds,
  removeDecimals,
  SignableRequestType,
  SignableRequestTypeToParams,
  SignedTx,
  subaccountFromHex,
  subaccountToHex,
  toBigInt,
  toBigNumber,
  toIntegerString,
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  mapIndexerCandlesticks,
  mapIndexerEvent,
  mapIndexerEventWithTx,
  mapIndexerFundingRate,
  mapIndexerFundingRateHistory,
  mapIndexerLeaderboardContest,
  mapIndexerLeaderboardPosition,
  mapIndexerLeaderboardRegistration,
  mapIndexerMakerStatistics,
  mapIndexerMarketSnapshot,
  mapIndexerMatchEventBalances,
  mapIndexerNlpSnapshot,
  mapIndexerOrder,
  mapIndexerPerpPrices,
  mapIndexerPortfolio,
  mapIndexerProductPayment,
  mapIndexerServerProduct,
  mapIndexerV2Symbols,
  mapIndexerV2Ticker,
  mapSnapshotsIntervalToServerParams,
} from './dataMappers';
import {
  ConnectSocialAccountParams,
  ConnectSocialAccountResponse,
  GetIndexerBacklogResponse,
  GetIndexerCandlesticksParams,
  GetIndexerCandlesticksResponse,
  GetIndexerCashIncentivesParams,
  GetIndexerCashIncentivesResponse,
  GetIndexerEdgeCandlesticksParams,
  GetIndexerEdgeCandlesticksResponse,
  GetIndexerEdgeMarketSnapshotResponse,
  GetIndexerEdgeMarketSnapshotsParams,
  GetIndexerEventsParams,
  GetIndexerEventsResponse,
  GetIndexerFastWithdrawalSignatureParams,
  GetIndexerFastWithdrawalSignatureResponse,
  GetIndexerFundingRateHistoryParams,
  GetIndexerFundingRateHistoryResponse,
  GetIndexerFundingRateParams,
  GetIndexerFundingRateResponse,
  GetIndexerInterestFundingPaymentsParams,
  GetIndexerInterestFundingPaymentsResponse,
  GetIndexerLeaderboardContestsParams,
  GetIndexerLeaderboardContestsResponse,
  GetIndexerLeaderboardParams,
  GetIndexerLeaderboardParticipantParams,
  GetIndexerLeaderboardParticipantResponse,
  GetIndexerLeaderboardRegistrationsParams,
  GetIndexerLeaderboardRegistrationsResponse,
  GetIndexerLeaderboardResponse,
  GetIndexerLinkedSignerParams,
  GetIndexerLinkedSignerResponse,
  GetIndexerMakerStatisticsParams,
  GetIndexerMakerStatisticsResponse,
  GetIndexerMarketSnapshotsParams,
  GetIndexerMarketSnapshotsResponse,
  GetIndexerMatchEventsParams,
  GetIndexerMatchEventsResponse,
  GetIndexerMultiProductFundingRatesParams,
  GetIndexerMultiProductFundingRatesResponse,
  GetIndexerMultiProductPerpPricesParams,
  GetIndexerMultiProductPerpPricesResponse,
  GetIndexerMultiProductSnapshotsParams,
  GetIndexerMultiProductSnapshotsResponse,
  GetIndexerMultiSubaccountSnapshotsParams,
  GetIndexerMultiSubaccountSnapshotsResponse,
  GetIndexerNlpSnapshotsParams,
  GetIndexerNlpSnapshotsResponse,
  GetIndexerOraclePricesParams,
  GetIndexerOraclePricesResponse,
  GetIndexerOrdersParams,
  GetIndexerOrdersResponse,
  GetIndexerPerpPricesParams,
  GetIndexerPerpPricesResponse,
  GetIndexerPointsParams,
  GetIndexerPointsResponse,
  GetIndexerPortfolioParams,
  GetIndexerPortfolioResponse,
  GetIndexerPrivateAlphaChoiceParams,
  GetIndexerPrivateAlphaChoiceResponse,
  GetIndexerProductSnapshotsParams,
  GetIndexerProductSnapshotsResponse,
  GetIndexerQuotePriceResponse,
  GetIndexerReferralCodeParams,
  GetIndexerReferralCodeResponse,
  GetIndexerSubaccountDDAParams,
  GetIndexerSubaccountDDAResponse,
  GetIndexerV2SymbolsParams,
  GetIndexerV2SymbolsResponse,
  GetIndexerV2TickersParams,
  GetIndexerV2TickersResponse,
  GetIndexerXPointsParams,
  GetIndexerXPointsResponse,
  IndexerEventWithTx,
  IndexerMatchEvent,
  IndexerOraclePrice,
  IndexerServerEventsParams,
  IndexerServerFailureError,
  IndexerServerQueryRequestByType,
  IndexerServerQueryRequestType,
  IndexerServerQueryResponseByType,
  IndexerServerV2SymbolsResponse,
  IndexerServerV2TickersResponse,
  IndexerSnapshotBalance,
  IndexerSubaccountSnapshot,
  isIndexerServerFailureResponse,
  ListIndexerSocialAccountsParams,
  ListIndexerSocialAccountsResponse,
  ListIndexerSubaccountsParams,
  ListIndexerSubaccountsResponse,
  RegisterLeaderboardParams,
  RegisterLeaderboardResponse,
  RevokeSocialAccountParams,
  RevokeSocialAccountResponse,
} from './types';

export interface IndexerClientOpts {
  // Server base URL, without a version segment (ex. `https://archive.prod.nado.xyz`)
  url: string;
  // Per-API URLs, each defaulting to the matching path under `url`
  v1Url?: string;
  v2Url?: string;
  rewardsUrl?: string;
  // Wallet Client for EIP712 signing
  walletClient?: WalletClientWithAccount;
  // Linked signer registered through the engine, if provided, execute requests will use this signer
  linkedSignerWalletClient?: WalletClientWithAccount;
}

type IndexerQueryRequestBody = Partial<IndexerServerQueryRequestByType>;

/**
 * Base client for all indexer requests
 */
export class IndexerBaseClient {
  readonly opts: IndexerClientOpts;
  readonly v1Url: string;
  readonly v2Url: string;
  readonly rewardsUrl: string;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: IndexerClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      withCredentials: true,
      // We have custom logic to validate response status and create an appropriate error
      validateStatus: () => true,
    });
    this.v1Url = opts.v1Url ?? `${opts.url}/v1`;
    this.v2Url = opts.v2Url ?? `${opts.url}/v2`;
    this.rewardsUrl = opts.rewardsUrl ?? `${opts.url}/rewards/v1`;
  }

  /**
   * Sets the linked signer for execute requests
   *
   * @param linkedSignerWalletClient The linkedSigner to use for all signatures. Set to null to revert to the chain signer
   */
  public setLinkedSigner(
    linkedSignerWalletClient: WalletClientWithAccount | null,
  ) {
    this.opts.linkedSignerWalletClient = linkedSignerWalletClient ?? undefined;
  }

  /**
   * List all subaccounts
   *
   * @param params
   */
  async listSubaccounts(
    params: ListIndexerSubaccountsParams,
  ): Promise<ListIndexerSubaccountsResponse> {
    const baseResponse = await this.query('subaccounts', params);

    return baseResponse.subaccounts.map((item) => {
      const subaccount = subaccountFromHex(item.subaccount);
      return {
        hexId: item.subaccount,
        createdAt: Number(item.created_at),
        isolated: item.isolated,
        ...subaccount,
      };
    });
  }

  /**
   * Retrieve snapshots of multiple subaccounts at multiple points in time.
   * Each snapshot is a view of the subaccount's balances at this point in time, with tracked variables for interest, funding, etc.
   *
   * @param params
   */
  async getMultiSubaccountSnapshots(
    params: GetIndexerMultiSubaccountSnapshotsParams,
  ): Promise<GetIndexerMultiSubaccountSnapshotsResponse> {
    const subaccountHexIds = params.subaccounts.map(
      ({ subaccountOwner, subaccountName }) =>
        subaccountToHex({
          subaccountOwner,
          subaccountName,
        }),
    );

    const baseResponse = await this.query('account_snapshots', {
      subaccounts: subaccountHexIds,
      timestamps: params.timestamps,
      isolated: params.isolated,
    });

    const snapshotsBySubaccount = mapValues(
      baseResponse.snapshots,
      (balanceSnapshots) => {
        const snapshotByTimestamp: Record<string, IndexerSubaccountSnapshot> =
          {};

        Object.entries(balanceSnapshots).forEach(([timestamp, events]) => {
          const balances: IndexerSnapshotBalance[] =
            events.map(mapIndexerEvent);

          snapshotByTimestamp[timestamp] = {
            timestamp: toBigNumber(timestamp),
            balances,
          };
        });

        return snapshotByTimestamp;
      },
    );

    return {
      subaccountHexIds,
      snapshots: snapshotsBySubaccount,
    };
  }

  /**
   * Retrieves referral code for an address
   *
   * @param params
   */
  async getReferralCode(
    params: GetIndexerReferralCodeParams,
  ): Promise<GetIndexerReferralCodeResponse> {
    const baseResponse = await this.query('referral_code', {
      subaccount: subaccountToHex({
        subaccountOwner: params.subaccount.subaccountOwner,
        subaccountName: params.subaccount.subaccountName,
      }),
    });

    return {
      referralCode: baseResponse.referral_code,
    };
  }

  /**
   * Retrieves funding rate for a product, where 1 = 100%
   * @param params
   */
  async getFundingRate(
    params: GetIndexerFundingRateParams,
  ): Promise<GetIndexerFundingRateResponse> {
    const baseResponse = await this.query('funding_rate', {
      product_id: params.productId,
    });

    return mapIndexerFundingRate(baseResponse);
  }

  /**
   * Retrieves funding rate for multiple products, where 1 = 100%
   * @param params
   */
  async getMultiProductFundingRates(
    params: GetIndexerMultiProductFundingRatesParams,
  ): Promise<GetIndexerMultiProductFundingRatesResponse> {
    const baseResponse = await this.query('funding_rates', {
      product_ids: params.productIds,
    });

    return mapValues(baseResponse, mapIndexerFundingRate);
  }

  /**
   * Retrieves a perp product's historical (realized hourly) funding rates,
   * ordered ascending by timestamp, where 1 = 100%.
   *
   * To paginate forward, pass the last entry's `timestamp + 1` as the next
   * request's `startTimeInclusive`.
   *
   * @param params
   */
  async getFundingRateHistory(
    params: GetIndexerFundingRateHistoryParams,
  ): Promise<GetIndexerFundingRateHistoryResponse> {
    const baseResponse = await this.query('funding_rate_history', {
      product_id: params.productId,
      start_time: params.startTimeInclusive,
      end_time: params.endTimeInclusive,
      limit: params.limit,
    });

    return baseResponse.funding_rates.map(mapIndexerFundingRateHistory);
  }

  /**
   * Retrieves a subaccount's account-value, PnL, traded-volume, average-trade-size,
   * and markets-traded history across all timeframes, keyed by period. The value
   * aggregates the cross-margin account plus every isolated child; the queried
   * subaccount must be cross-margin.
   *
   * Points are downsampled per timeframe, so the most recent point can be up to
   * ~20 minutes stale. For the exact live value, use the engine client's
   * `getSubaccountSummary` query instead.
   *
   * @param params
   */
  async getPortfolio(
    params: GetIndexerPortfolioParams,
  ): Promise<GetIndexerPortfolioResponse> {
    const baseResponse = await this.query('portfolio', {
      subaccount: subaccountToHex(params.subaccount),
    });

    return mapIndexerPortfolio(baseResponse);
  }

  /**
   * Retrieves latest mark/index price for a perp product
   * @param params
   */
  async getPerpPrices(
    params: GetIndexerPerpPricesParams,
  ): Promise<GetIndexerPerpPricesResponse> {
    const baseResponse = await this.query('price', {
      product_id: params.productId,
    });

    return mapIndexerPerpPrices(baseResponse);
  }

  /**
   * Retrieves latest mark/index price for multiple perp products
   * @param params
   */
  async getMultiProductPerpPrices(
    params: GetIndexerMultiProductPerpPricesParams,
  ): Promise<GetIndexerMultiProductPerpPricesResponse> {
    const baseResponse = await this.query('perp_prices', {
      product_ids: params.productIds,
    });

    return mapValues(baseResponse, mapIndexerPerpPrices);
  }

  /**
   * Retrieves latest oracle prices for provided products
   * @param params
   */
  async getOraclePrices(
    params: GetIndexerOraclePricesParams,
  ): Promise<GetIndexerOraclePricesResponse> {
    const baseResponse = await this.query('oracle_price', {
      product_ids: params.productIds,
    });

    return baseResponse.prices.map((price): IndexerOraclePrice => {
      return {
        oraclePrice: removeDecimals(price.oracle_price_x18),
        updateTime: toBigNumber(price.update_time),
        productId: price.product_id,
      };
    });
  }

  /**
   * Retrieves candlesticks for a product
   * @param params
   */
  async getCandlesticks(
    params: GetIndexerCandlesticksParams,
  ): Promise<GetIndexerCandlesticksResponse> {
    const baseResponse = await this.query('candlesticks', {
      product_id: params.productId,
      max_time: params.maxTimeInclusive,
      limit: params.limit,
      granularity: params.period,
    });

    return baseResponse.candlesticks.map(mapIndexerCandlesticks);
  }

  /**
   * Retrieves candlesticks for a product from Edge
   * @param params
   */
  async getEdgeCandlesticks(
    params: GetIndexerEdgeCandlesticksParams,
  ): Promise<GetIndexerEdgeCandlesticksResponse> {
    const baseResponse = await this.query('edge_candlesticks', {
      product_id: params.productId,
      max_time: params.maxTimeInclusive,
      limit: params.limit,
      granularity: params.period,
    });

    return baseResponse.candlesticks.map(mapIndexerCandlesticks);
  }

  /**
   * Retrieves historical snapshots for a product
   * @param params
   */
  async getProductSnapshots(
    params: GetIndexerProductSnapshotsParams,
  ): Promise<GetIndexerProductSnapshotsResponse> {
    const baseResponse = await this.query('products', {
      product_id: params.productId,
      max_time: params.maxTimestampInclusive,
      limit: params.limit,
      idx: params.startCursor,
    });

    return baseResponse.products.map((product) => {
      return {
        ...mapIndexerServerProduct(product.product),
        submissionIndex: product.submission_idx,
      };
    });
  }

  /**
   * Retrieves historical snapshots for multiple products
   * @param params
   */
  async getMultiProductSnapshots(
    params: GetIndexerMultiProductSnapshotsParams,
  ): Promise<GetIndexerMultiProductSnapshotsResponse> {
    const timestampToProductsMap = await this.query('product_snapshots', {
      product_ids: params.productIds,
      max_time: params.maxTimestampInclusive ?? [nowInSeconds()],
    });

    return mapValues(timestampToProductsMap, (productIdToProduct) => {
      return mapValues(productIdToProduct, (indexerProduct) => {
        return {
          ...mapIndexerServerProduct(indexerProduct.product),
          submissionIndex: indexerProduct.submission_idx,
        };
      });
    });
  }

  /**
   * Retrieves historical events
   *
   * @param params
   */
  async getEvents(
    params: GetIndexerEventsParams,
  ): Promise<GetIndexerEventsResponse> {
    const serverLimit = ((): IndexerServerEventsParams['limit'] | undefined => {
      if (!params.limit) {
        return;
      }

      if (params.limit.type === 'events') {
        return {
          raw: params.limit.value,
        };
      }
      return {
        txs: params.limit.value,
      };
    })();

    const baseResponse = await this.query('events', {
      subaccounts: params.subaccounts?.map((subaccount) =>
        subaccountToHex({
          subaccountOwner: subaccount.subaccountOwner,
          subaccountName: subaccount.subaccountName,
        }),
      ),
      product_ids: params.productIds,
      isolated: params.isolated,
      event_types: params.eventTypes,
      max_time: params.maxTimestampInclusive,
      desc: params.desc,
      limit: serverLimit,
      idx: params.startCursor,
    });

    // Keep track of the last tx index, and go to the next one if the submission_idx for the currently processed event does not match
    // txs are ordered the same as events, so this should be correct
    let lastTxIdx = 0;
    return baseResponse.events.map((event): IndexerEventWithTx => {
      if (baseResponse.txs[lastTxIdx].submission_idx !== event.submission_idx) {
        lastTxIdx += 1;
      }
      const tx = baseResponse.txs[lastTxIdx];
      return mapIndexerEventWithTx(event, tx);
    });
  }

  /**
   * Retrieves historical orders
   * @param params
   */
  async getOrders(
    params: GetIndexerOrdersParams,
  ): Promise<GetIndexerOrdersResponse> {
    const baseResponse = await this.query('orders', {
      subaccounts: params?.subaccounts?.map((subaccount) =>
        subaccountToHex({
          subaccountOwner: subaccount.subaccountOwner,
          subaccountName: subaccount.subaccountName,
        }),
      ),
      product_ids: params.productIds,
      trigger_types: params.triggerTypes,
      isolated: params.isolated,
      digests: params.digests,
      max_time: params.maxTimestampInclusive,
      limit: params.limit,
      idx: params.startCursor,
    });

    return baseResponse.orders.map(mapIndexerOrder);
  }

  /**
   * Gets match order events, this will return the same events as the events query, but with additional information
   * to identify the order that was matched
   *
   * @param params
   */
  async getMatchEvents(
    params: GetIndexerMatchEventsParams,
  ): Promise<GetIndexerMatchEventsResponse> {
    const baseResponse = await this.query('matches', {
      subaccounts: params?.subaccounts?.map((subaccount) =>
        subaccountToHex({
          subaccountOwner: subaccount.subaccountOwner,
          subaccountName: subaccount.subaccountName,
        }),
      ),
      product_ids: params.productIds,
      isolated: params.isolated,
      max_time: params.maxTimestampInclusive,
      limit: params.limit,
      idx: params.startCursor,
    });

    // Same as logic in `getEvents`
    let lastTxIdx = 0;
    return baseResponse.matches.map((matchEvent): IndexerMatchEvent => {
      if (
        baseResponse.txs[lastTxIdx].submission_idx !== matchEvent.submission_idx
      ) {
        lastTxIdx += 1;
      }
      const { tx, timestamp } = baseResponse.txs[lastTxIdx];

      // We use this to derive the product ID for the match
      const postBalances = mapIndexerMatchEventBalances(
        matchEvent.post_balance,
      );

      return {
        productId: postBalances.base.productId,
        isolated: matchEvent.isolated,
        totalFee: toBigNumber(matchEvent.fee),
        sequencerFee: toBigNumber(matchEvent.sequencer_fee),
        builderFee: toBigNumber(matchEvent.builder_fee),
        baseFilled: toBigNumber(matchEvent.base_filled),
        quoteFilled: toBigNumber(matchEvent.quote_filled),
        cumulativeFee: toBigNumber(matchEvent.cumulative_fee),
        cumulativeBaseFilled: toBigNumber(matchEvent.cumulative_base_filled),
        cumulativeQuoteFilled: toBigNumber(matchEvent.cumulative_quote_filled),
        digest: matchEvent.digest,
        order: matchEvent.order,
        submissionIndex: matchEvent.submission_idx,
        timestamp: toBigNumber(timestamp),
        preEventTrackedVars: {
          netEntryUnrealized: toBigNumber(matchEvent.net_entry_unrealized),
          netEntryCumulative: toBigNumber(matchEvent.net_entry_cumulative),
        },
        preBalances: mapIndexerMatchEventBalances(matchEvent.pre_balance),
        postBalances,
        tx,
        isTaker: matchEvent.is_taker,
        realizedPnl: toBigNumber(matchEvent.realized_pnl),
        closedAmount: toBigNumber(matchEvent.closed_amount),
        closedNetEntry: toBigNumber(matchEvent.closed_net_entry),
        margin: matchEvent.margin ? toBigNumber(matchEvent.margin) : null,
        ...subaccountFromHex(matchEvent.order.sender),
      };
    });
  }

  /**
   * Retrieves historical funding & interest payments.
   * NOTE: `limit` is an upperbound. If a user changes position size such that his position is 0 during each funding/interest tick,
   *        then the indexer will return fewer than `limit` results per page. However, more events can be present. This means that
   *        there isn't a reliable way to determine whether there is a next page. We just need to keep paginating until the next cursor is null.
   *
   * @param params
   */
  async getInterestFundingPayments(
    params: GetIndexerInterestFundingPaymentsParams,
  ): Promise<GetIndexerInterestFundingPaymentsResponse> {
    const baseResponse = await this.query('interest_and_funding', {
      subaccount: subaccountToHex({
        subaccountOwner: params.subaccount.subaccountOwner,
        subaccountName: params.subaccount.subaccountName,
      }),
      product_ids: params.productIds,
      max_time: params.maxTimestampInclusive,
      limit: params.limit,
      max_idx: params.startCursor,
    });

    return {
      fundingPayments: baseResponse.funding_payments.map(
        mapIndexerProductPayment,
      ),
      interestPayments: baseResponse.interest_payments.map(
        mapIndexerProductPayment,
      ),
      nextCursor: baseResponse.next_idx,
    };
  }

  /**
   * Gets quote (USDT) price in terms of USD
   */
  async getQuotePrice(): Promise<GetIndexerQuotePriceResponse> {
    const baseResponse = await this.query('quote_price', {});
    return {
      price: removeDecimals(baseResponse.price_x18),
    };
  }

  /**
   * Fetches currently registered linked signer with the remaining txs allowed for the subaccount
   */
  async getLinkedSignerWithRateLimit(
    params: GetIndexerLinkedSignerParams,
  ): Promise<GetIndexerLinkedSignerResponse> {
    const baseResponse = await this.query('linked_signer_rate_limit', {
      subaccount: subaccountToHex(params.subaccount),
    });
    return {
      totalTxLimit: toBigNumber(baseResponse.total_tx_limit),
      remainingTxs: toBigNumber(baseResponse.remaining_tx),
      signer: baseResponse.signer,
      waitTimeUntilNextTx: toBigNumber(baseResponse.wait_time),
    };
  }

  /**
   * Retrieve historical market snapshots
   * @param params
   */
  async getMarketSnapshots(
    params: GetIndexerMarketSnapshotsParams,
  ): Promise<GetIndexerMarketSnapshotsResponse> {
    const baseResponse = await this.query('market_snapshots', {
      interval: mapSnapshotsIntervalToServerParams(params),
      product_ids: params.productIds,
    });

    return baseResponse.snapshots.map(mapIndexerMarketSnapshot);
  }

  /**
   * Retrieve historical market snapshots from Edge
   * @param params
   */
  async getEdgeMarketSnapshots(
    params: GetIndexerEdgeMarketSnapshotsParams,
  ): Promise<GetIndexerEdgeMarketSnapshotResponse> {
    const baseResponse = await this.query('edge_market_snapshots', {
      interval: mapSnapshotsIntervalToServerParams(params),
    });

    return mapValues(baseResponse.snapshots, (snapshots) =>
      snapshots.map(mapIndexerMarketSnapshot),
    );
  }

  /**
   * Retrieve maker statistics for a given epoch
   *
   * @param params
   */
  async getMakerStatistics(
    params: GetIndexerMakerStatisticsParams,
  ): Promise<GetIndexerMakerStatisticsResponse> {
    const baseResponse = await this.query('maker_statistics', {
      product_id: params.productId,
      epoch: params.epoch,
      interval: params.interval,
    });

    return {
      rewardCoefficient: toBigNumber(baseResponse.reward_coefficient),
      makers: baseResponse.makers.map(mapIndexerMakerStatistics),
    };
  }

  /**
   * Retrieve leaderboard stats for a given contest
   *
   * @param params
   */
  async getLeaderboard(
    params: GetIndexerLeaderboardParams,
  ): Promise<GetIndexerLeaderboardResponse> {
    const baseResponse = await this.rewardsQuery('leaderboard', {
      contest_id: params.contestId,
      rank_type: params.rankType,
      start: params.startCursor,
      limit: params.limit,
      order: params.order,
    });

    return {
      participants: baseResponse.positions.map(mapIndexerLeaderboardPosition),
    };
  }

  /**
   * Retrieve leaderboard ranking of a subaccount on a given contest
   *
   * @param params
   */
  async getLeaderboardParticipant(
    params: GetIndexerLeaderboardParticipantParams,
  ): Promise<GetIndexerLeaderboardParticipantResponse> {
    const baseResponse = await this.rewardsQuery('leaderboard_rank', {
      subaccount: subaccountToHex(params.subaccount),
      contest_ids: params.contestIds,
    });

    return {
      participant: mapValues(baseResponse.positions, (position) =>
        mapIndexerLeaderboardPosition(position),
      ),
    };
  }

  /**
   * Registers a subaccount for one or more contests. Requires EIP-712 signing.
   *
   * @param params - Registration parameters including contest IDs and signing config.
   */
  async registerLeaderboard(
    params: RegisterLeaderboardParams,
  ): Promise<RegisterLeaderboardResponse> {
    const signatureParams: EIP712LeaderboardAuthenticationParams = {
      expiration: toIntegerString(params.recvTime ?? getDefaultRecvTime()),
      subaccountName: params.subaccountName,
      subaccountOwner: params.subaccountOwner,
      contestIds: params.contestIds,
    };

    const tx = getNadoEIP712Values(
      'leaderboard_authentication',
      signatureParams,
    );
    const signature = await this.sign(
      'leaderboard_authentication',
      params.verifyingAddr,
      params.chainId,
      signatureParams,
    );

    const updateRegistrationTx: SignedTx<EIP712LeaderboardAuthenticationValues> =
      {
        tx,
        signature,
      };

    const baseResponse = await this.rewardsQuery('leaderboard_register', {
      update_registration: updateRegistrationTx,
    });

    return {
      registrations: baseResponse.registrations.map(
        mapIndexerLeaderboardRegistration,
      ),
    };
  }

  /**
   * Retrieves contest registrations for a subaccount. Supports batch lookup
   * across multiple contests with an optional active filter.
   *
   * @param params - Query parameters including subaccount and contest IDs.
   */
  async getLeaderboardRegistrations(
    params: GetIndexerLeaderboardRegistrationsParams,
  ): Promise<GetIndexerLeaderboardRegistrationsResponse> {
    const baseResponse = await this.rewardsQuery('leaderboard_registrations', {
      subaccount: subaccountToHex(params.subaccount),
      contest_ids: params.contestIds,
      active: params.active,
    });

    return {
      registrations: baseResponse.registrations.map(
        mapIndexerLeaderboardRegistration,
      ),
    };
  }

  /**
   * Retrieve metadata of provided leaderboard contests
   *
   * @param params
   */
  async getLeaderboardContests(
    params: GetIndexerLeaderboardContestsParams,
  ): Promise<GetIndexerLeaderboardContestsResponse> {
    const baseResponse = await this.rewardsQuery('leaderboard_contests', {
      contest_ids: params.contestIds,
      active: params.active,
    });

    return {
      contests: baseResponse.contests.map(mapIndexerLeaderboardContest),
    };
  }

  /**
   * Retrieve signature and tx to submit a fast withdrawal
   *
   * @param params
   */
  async getFastWithdrawalSignature(
    params: GetIndexerFastWithdrawalSignatureParams,
  ): Promise<GetIndexerFastWithdrawalSignatureResponse> {
    const baseResponse = await this.query('fast_withdrawal_signature', params);
    return {
      idx: toBigInt(baseResponse.idx),
      tx: baseResponse.tx,
      txV2: baseResponse.tx_v2,
      txBytes: getValidatedHex(baseResponse.tx_bytes),
      signatures: baseResponse.signatures.map(getValidatedHex),
    };
  }

  async getNlpSnapshots(
    params: GetIndexerNlpSnapshotsParams,
  ): Promise<GetIndexerNlpSnapshotsResponse> {
    const baseResponse = await this.query('nlp_snapshots', {
      interval: {
        count: params.limit,
        max_time: params.maxTimeInclusive
          ? toIntegerString(params.maxTimeInclusive)
          : undefined,
        granularity: params.granularity,
      },
    });

    return {
      snapshots: baseResponse.snapshots.map(mapIndexerNlpSnapshot),
    };
  }

  /**
   * Retrieves the subaccount's DDA (Direct Deposit Address)
   * @param params
   */
  async getSubaccountDDA(
    params: GetIndexerSubaccountDDAParams,
  ): Promise<GetIndexerSubaccountDDAResponse> {
    const baseResponse = await this.query('direct_deposit_address', {
      subaccount: subaccountToHex(params.subaccount),
    });

    return {
      address: getValidatedAddress(baseResponse.v1_address),
    };
  }

  async getSequencerBacklog(): Promise<GetIndexerBacklogResponse> {
    const baseResponse = await this.query('backlog', {});

    return {
      totalTxs: toBigNumber(baseResponse.total_txs),
      totalSubmissions: toBigNumber(baseResponse.total_submissions),
      backlogSize: toBigNumber(baseResponse.backlog_size),
      updatedAt: toBigNumber(baseResponse.updated_at),
      backlogEtaInSeconds: baseResponse.backlog_eta_in_seconds
        ? toBigNumber(baseResponse.backlog_eta_in_seconds)
        : null,
      txsPerSecond: baseResponse.txs_per_second
        ? toBigNumber(baseResponse.txs_per_second)
        : null,
    };
  }

  /**
   * Retrieves private alpha choice information for a given address
   * @param params
   */
  async getPrivateAlphaChoice(
    params: GetIndexerPrivateAlphaChoiceParams,
  ): Promise<GetIndexerPrivateAlphaChoiceResponse> {
    const baseResponse = await this.rewardsQuery('private_alpha_choice', {
      address: params.address,
    });

    return {
      points: toBigNumber(baseResponse.points),
      feeRefund: toBigNumber(baseResponse.fee_refund),
      nftEligibility: baseResponse.nft_eligibility,
    };
  }

  /**
   * Retrieves points information for a given address, including points per epoch and all-time points
   * @param params
   */
  async getPoints(
    params: GetIndexerPointsParams,
  ): Promise<GetIndexerPointsResponse> {
    const baseResponse = await this.rewardsQuery('nado_points', {
      address: params.address,
    });

    return {
      pointsPerEpoch: baseResponse.points_per_epoch.map((epoch) => ({
        epoch: epoch.epoch,
        description: epoch.description,
        startTime: toBigNumber(epoch.start_time),
        endTime: toBigNumber(epoch.end_time),
        totalPoints: toBigNumber(epoch.total_points),
        points: toBigNumber(epoch.points),
        rank: epoch.rank,
        tier: epoch.tier,
      })),
      allTimePoints: {
        points: toBigNumber(baseResponse.all_time_points.points),
        rank: baseResponse.all_time_points.rank,
        tier: baseResponse.all_time_points.tier,
      },
    };
  }

  /**
   * Retrieves xPoints information (Nado x xStocks points program) for a given address,
   * including per-epoch points, all-time points, and per-quest breakdowns.
   * @param params
   */
  async getXPoints(
    params: GetIndexerXPointsParams,
  ): Promise<GetIndexerXPointsResponse> {
    const baseResponse = await this.rewardsQuery('nado_xpoints', {
      address: params.address,
    });

    const mapQuests = (
      quests: typeof baseResponse.all_time_points.quests,
    ): GetIndexerXPointsResponse['allTimePoints']['quests'] =>
      quests.map((quest) => ({
        questType: quest.quest_type,
        points: toBigNumber(quest.points),
      }));

    return {
      pointsPerEpoch: baseResponse.points_per_epoch.map((epoch) => ({
        epoch: epoch.epoch,
        description: epoch.description,
        startTime: toBigNumber(epoch.start_time),
        endTime: toBigNumber(epoch.end_time),
        totalPoints: toBigNumber(epoch.total_points),
        rank: epoch.rank,
        quests: mapQuests(epoch.quests),
      })),
      allTimePoints: {
        totalPoints: toBigNumber(baseResponse.all_time_points.total_points),
        rank: baseResponse.all_time_points.rank,
        quests: mapQuests(baseResponse.all_time_points.quests),
      },
    };
  }

  /**
   * Retrieves cash incentives information for a given wallet address: per-event platform volume,
   * unlocked rewards, and `wallet.claim`, which carries the claim status plus the merkle proof when
   * that status is `claimable`.
   * @param params
   */
  async getCashIncentives(
    params: GetIndexerCashIncentivesParams,
  ): Promise<GetIndexerCashIncentivesResponse> {
    const baseResponse = await this.rewardsQuery('cash_incentives', {
      wallet_address: params.address,
    });

    return {
      events: baseResponse.events.map((event) => ({
        metadata: {
          eventId: event.metadata.event_id,
          description: event.metadata.description,
          epochStart: toBigNumber(event.metadata.epoch_start),
          epochEnd: toBigNumber(event.metadata.epoch_end),
          maxVolume: removeDecimals(event.metadata.max_volume),
          maxReward: removeDecimals(event.metadata.max_reward),
          minVolume: removeDecimals(event.metadata.min_volume),
          minReward: removeDecimals(event.metadata.min_reward),
        },
        platform: {
          platformVolume: removeDecimals(event.platform.platform_volume),
          unlockedReward: removeDecimals(event.platform.unlocked_reward),
        },
        wallet: {
          reward: removeDecimals(event.wallet.reward),
          claim:
            event.wallet.claim.status === 'claimable'
              ? {
                  status: 'claimable',
                  airdropAddress: getValidatedAddress(
                    event.wallet.claim.airdrop_address,
                  ),
                  week: event.wallet.claim.week,
                  // Kept in raw token units so it can be passed to the airdrop contract unchanged
                  totalAmount: toBigNumber(event.wallet.claim.total_amount),
                  proof: event.wallet.claim.proof.map(getValidatedHex),
                }
              : { status: event.wallet.claim.status },
        },
      })),
      walletSummary: {
        totalReward: removeDecimals(baseResponse.wallet_summary.total_reward),
        claimableReward: removeDecimals(
          baseResponse.wallet_summary.claimable_reward,
        ),
      },
    };
  }

  /**
   * Initiates a social account connection flow. Returns a URL the user must visit to complete the OAuth flow.
   * Requires EIP-712 signing.
   *
   * @param params - Connection parameters including provider and signing config.
   */
  async connectSocialAccount(
    params: ConnectSocialAccountParams,
  ): Promise<ConnectSocialAccountResponse> {
    const signatureParams: EIP712SocialAuthenticationParams = {
      expiration: toIntegerString(params.recvTime ?? getDefaultRecvTime()),
      subaccountName: params.subaccountName,
      subaccountOwner: params.subaccountOwner,
      provider: params.provider,
    };

    const tx = getNadoEIP712Values('social_authentication', signatureParams);
    const signature = await this.sign(
      'social_authentication',
      params.verifyingAddr,
      params.chainId,
      signatureParams,
    );

    const baseResponse = await this.rewardsQuery('social_connect', {
      update_social_account: { tx, signature },
    });

    return { url: baseResponse.url };
  }

  /**
   * Lists linked social accounts for a given address.
   *
   * @param params - Query parameters including the wallet address.
   */
  async listSocialAccounts(
    params: ListIndexerSocialAccountsParams,
  ): Promise<ListIndexerSocialAccountsResponse> {
    const baseResponse = await this.rewardsQuery('list_social_accounts', {
      address: params.address,
    });

    return {
      accounts: baseResponse.accounts.map((a) => ({
        provider: a.provider,
        username: a.username,
        displayName: a.display_name,
        profileImageUrl: a.profile_image_url,
      })),
    };
  }

  /**
   * Revokes a linked social account. Requires EIP-712 signing.
   *
   * @param params - Revocation parameters including provider and signing config.
   */
  async revokeSocialAccount(
    params: RevokeSocialAccountParams,
  ): Promise<RevokeSocialAccountResponse> {
    const signatureParams: EIP712SocialAuthenticationParams = {
      expiration: toIntegerString(params.recvTime ?? getDefaultRecvTime()),
      subaccountName: params.subaccountName,
      subaccountOwner: params.subaccountOwner,
      provider: params.provider,
    };

    const tx = getNadoEIP712Values('social_authentication', signatureParams);
    const signature = await this.sign(
      'social_authentication',
      params.verifyingAddr,
      params.chainId,
      signatureParams,
    );

    const baseResponse = await this.rewardsQuery('revoke_social_account', {
      update_social_account: { tx, signature },
    });

    return {
      accounts: baseResponse.accounts.map((a) => ({
        provider: a.provider,
        username: a.username,
        displayName: a.display_name,
        profileImageUrl: a.profile_image_url,
      })),
    };
  }

  /**
   * Get tickers from the v2 indexer endpoint
   * @param params
   */
  async getV2Tickers(
    params: GetIndexerV2TickersParams,
  ): Promise<GetIndexerV2TickersResponse> {
    const response =
      await this.axiosInstance.get<IndexerServerV2TickersResponse>(
        `${this.v2Url}/tickers`,
        { params },
      );

    this.checkResponseStatus(response);

    return mapValues(response.data, mapIndexerV2Ticker);
  }

  /**
   * Get symbols with market hours from the v2 indexer endpoint
   * @param params
   */
  async getV2Symbols(
    params?: GetIndexerV2SymbolsParams,
  ): Promise<GetIndexerV2SymbolsResponse> {
    const response =
      await this.axiosInstance.get<IndexerServerV2SymbolsResponse>(
        `${this.v2Url}/symbols`,
        {
          params: {
            product_type: params?.productType,
            product_ids: params?.productIds,
          },
        },
      );

    this.checkResponseStatus(response);

    return mapValues(response.data, mapIndexerV2Symbols);
  }

  protected query<TRequestType extends IndexerServerQueryRequestType>(
    requestType: TRequestType,
    params: IndexerServerQueryRequestByType[TRequestType],
  ): Promise<IndexerServerQueryResponseByType[TRequestType]> {
    return this.queryWithUrl(this.v1Url, requestType, params);
  }

  /**
   * Runs a query against the rewards endpoint, which serves leaderboard, points,
   * cash incentives, private alpha, and social account queries
   */
  protected rewardsQuery<TRequestType extends IndexerServerQueryRequestType>(
    requestType: TRequestType,
    params: IndexerServerQueryRequestByType[TRequestType],
  ): Promise<IndexerServerQueryResponseByType[TRequestType]> {
    return this.queryWithUrl(this.rewardsUrl, requestType, params);
  }

  private async queryWithUrl<
    TRequestType extends IndexerServerQueryRequestType,
  >(
    url: string,
    requestType: TRequestType,
    params: IndexerServerQueryRequestByType[TRequestType],
  ): Promise<IndexerServerQueryResponseByType[TRequestType]> {
    const reqBody: IndexerQueryRequestBody = {
      [requestType]: params,
    };
    const response = await this.axiosInstance.post<
      IndexerServerQueryResponseByType[TRequestType]
    >(url, reqBody);

    this.checkResponseStatus(response);

    return response.data;
  }

  protected async sign<T extends SignableRequestType>(
    requestType: T,
    verifyingContract: string,
    chainId: number,
    params: SignableRequestTypeToParams[T],
  ) {
    const walletClient =
      this.opts.linkedSignerWalletClient ?? this.opts.walletClient;

    if (!walletClient) {
      throw new WalletNotProvidedError();
    }

    return getSignedTransactionRequest({
      chainId,
      requestParams: params,
      requestType,
      walletClient,
      verifyingContract,
    });
  }

  private checkResponseStatus(response: AxiosResponse) {
    if (isIndexerServerFailureResponse(response.data)) {
      throw new IndexerServerFailureError(response.data, response.status);
    }
    if (response.status !== 200 || !response.data) {
      throw Error(
        `Unexpected response from server: ${response.status} ${response.statusText}`,
      );
    }
  }
}
