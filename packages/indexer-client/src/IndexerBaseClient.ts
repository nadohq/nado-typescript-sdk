import {
  EIP712LeaderboardAuthenticationParams,
  EIP712LeaderboardAuthenticationValues,
  getDefaultRecvTime,
  getNadoEIP712Values,
  getSignedTransactionRequest,
  SignableRequestType,
  SignableRequestTypeToParams,
  SignedTx,
  subaccountFromHex,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/contracts';
import {
  getValidatedHex,
  mapValues,
  nowInSeconds,
  removeDecimals,
  toBigDecimal,
  toBigInt,
  toIntegerString,
  WalletNotProvidedError,
} from '@nadohq/utils';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  mapIndexerCandlesticks,
  mapIndexerEvent,
  mapIndexerEventWithTx,
  mapIndexerFundingRate,
  mapIndexerLeaderboardContest,
  mapIndexerLeaderboardPosition,
  mapIndexerLeaderboardRegistration,
  mapIndexerMakerStatistics,
  mapIndexerMarketSnapshot,
  mapIndexerMatchEventBalances,
  mapIndexerOrder,
  mapIndexerPerpPrices,
  mapIndexerProductPayment,
  mapIndexerServerProduct,
  mapIndexerNlpSnapshot,
  mapSnapshotsIntervalToServerParams,
} from './dataMappers';
import {
  GetIndexerBacklogResponse,
  GetIndexerCandlesticksParams,
  GetIndexerCandlesticksResponse,
  GetIndexerEdgeCandlesticksParams,
  GetIndexerEdgeCandlesticksResponse,
  GetIndexerEdgeMarketSnapshotResponse,
  GetIndexerEdgeMarketSnapshotsParams,
  GetIndexerEventsParams,
  GetIndexerEventsResponse,
  GetIndexerFastWithdrawalSignatureParams,
  GetIndexerFastWithdrawalSignatureResponse,
  GetIndexerFundingRateParams,
  GetIndexerFundingRateResponse,
  GetIndexerInterestFundingPaymentsParams,
  GetIndexerInterestFundingPaymentsResponse,
  GetIndexerLeaderboardContestsParams,
  GetIndexerLeaderboardContestsResponse,
  GetIndexerLeaderboardParams,
  GetIndexerLeaderboardParticipantParams,
  GetIndexerLeaderboardParticipantResponse,
  GetIndexerLeaderboardRegistrationParams,
  GetIndexerLeaderboardRegistrationResponse,
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
  GetIndexerOraclePricesParams,
  GetIndexerOraclePricesResponse,
  GetIndexerOrdersParams,
  GetIndexerOrdersResponse,
  GetIndexerPerpPricesParams,
  GetIndexerPerpPricesResponse,
  GetIndexerProductSnapshotsParams,
  GetIndexerProductSnapshotsResponse,
  GetIndexerQuotePriceResponse,
  GetIndexerReferralCodeParams,
  GetIndexerReferralCodeResponse,
  GetIndexerNlpSnapshotsParams,
  GetIndexerNlpSnapshotsResponse,
  IndexerEventWithTx,
  IndexerMatchEvent,
  IndexerOraclePrice,
  IndexerServerEventsParams,
  IndexerServerQueryRequestByType,
  IndexerServerQueryRequestType,
  IndexerServerQueryResponseByType,
  IndexerSnapshotBalance,
  IndexerSubaccountSnapshot,
  ListIndexerSubaccountsParams,
  ListIndexerSubaccountsResponse,
  UpdateIndexerLeaderboardRegistrationParams,
  UpdateIndexerLeaderboardRegistrationResponse,
} from './types';

export interface IndexerClientOpts {
  // Server URLs
  url: string;
  v2Url?: string;
  // Wallet Client for EIP712 signing
  walletClient?: WalletClientWithAccount;
}

type IndexerQueryRequestBody = Partial<IndexerServerQueryRequestByType>;

/**
 * Base client for all indexer requests
 */
export class IndexerBaseClient {
  readonly opts: IndexerClientOpts;
  readonly v2Url: string;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: IndexerClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      withCredentials: true,
    });
    this.v2Url = opts.v2Url ? opts.v2Url : opts.url.replace('v1', 'v2');
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
            timestamp: toBigDecimal(timestamp),
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
        updateTime: toBigDecimal(price.update_time),
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
      subaccount: params.subaccount
        ? subaccountToHex({
            subaccountOwner: params.subaccount.subaccountOwner,
            subaccountName: params.subaccount.subaccountName,
          })
        : undefined,
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
      subaccount: params.subaccount
        ? subaccountToHex({
            subaccountOwner: params.subaccount.subaccountOwner,
            subaccountName: params.subaccount.subaccountName,
          })
        : undefined,
      product_ids: params.productIds,
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
      subaccount: params.subaccount
        ? subaccountToHex({
            subaccountOwner: params.subaccount.subaccountOwner,
            subaccountName: params.subaccount.subaccountName,
          })
        : undefined,
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
        totalFee: toBigDecimal(matchEvent.fee),
        sequencerFee: toBigDecimal(matchEvent.sequencer_fee),
        baseFilled: toBigDecimal(matchEvent.base_filled),
        quoteFilled: toBigDecimal(matchEvent.quote_filled),
        cumulativeFee: toBigDecimal(matchEvent.cumulative_fee),
        cumulativeBaseFilled: toBigDecimal(matchEvent.cumulative_base_filled),
        cumulativeQuoteFilled: toBigDecimal(matchEvent.cumulative_quote_filled),
        digest: matchEvent.digest,
        order: matchEvent.order,
        submissionIndex: matchEvent.submission_idx,
        timestamp: toBigDecimal(timestamp),
        preEventTrackedVars: {
          netEntryUnrealized: toBigDecimal(matchEvent.net_entry_unrealized),
          netEntryCumulative: toBigDecimal(matchEvent.net_entry_cumulative),
        },
        preBalances: mapIndexerMatchEventBalances(matchEvent.pre_balance),
        postBalances,
        tx,
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
   * Gets quote (USDC) price in terms of USD
   */
  async getQuotePrice(): Promise<GetIndexerQuotePriceResponse> {
    const baseResponse = await this.query('usdc_price', {});
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
      totalTxLimit: toBigDecimal(baseResponse.total_tx_limit),
      remainingTxs: toBigDecimal(baseResponse.remaining_tx),
      signer: baseResponse.signer,
      waitTimeUntilNextTx: toBigDecimal(baseResponse.wait_time),
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
      rewardCoefficient: toBigDecimal(baseResponse.reward_coefficient),
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
    const baseResponse = await this.query('leaderboard', {
      contest_id: params.contestId,
      rank_type: params.rankType,
      start: params.startCursor,
      limit: params.limit,
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
    const baseResponse = await this.query('leaderboard_rank', {
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
   * Attempts to update a user's registration to the provided `contestId`. This requires signing.
   * @param params
   */
  async updateLeaderboardRegistration(
    params: UpdateIndexerLeaderboardRegistrationParams,
  ): Promise<UpdateIndexerLeaderboardRegistrationResponse> {
    const signatureParams: EIP712LeaderboardAuthenticationParams = {
      // Default to 90 seconds from now if no recvTime is provided
      expiration: toIntegerString(params.recvTime ?? getDefaultRecvTime()),
      subaccountName: params.subaccountName,
      subaccountOwner: params.subaccountOwner,
    };

    const tx = getNadoEIP712Values(
      'leaderboard_authentication',
      signatureParams,
    );
    const signature = await this.sign(
      'leaderboard_authentication',
      params.updateRegistration.verifyingAddr,
      params.updateRegistration.chainId,
      signatureParams,
    );

    const updateRegistrationTx: SignedTx<EIP712LeaderboardAuthenticationValues> =
      {
        tx,
        signature,
      };

    const baseResponse = await this.query('leaderboard_registration', {
      subaccount: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
      contest_id: params.contestId,
      update_registration: updateRegistrationTx,
    });
    return {
      registration: baseResponse.registration
        ? mapIndexerLeaderboardRegistration(baseResponse.registration)
        : null,
    };
  }

  /**
   * Retrieves the registration status for a leaderboard participant for provided `contestId`.
   * @param params
   */
  async getLeaderboardRegistration(
    params: GetIndexerLeaderboardRegistrationParams,
  ): Promise<GetIndexerLeaderboardRegistrationResponse> {
    const baseResponse = await this.query('leaderboard_registration', {
      subaccount: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
      contest_id: params.contestId,
      update_registration: null,
    });
    return {
      registration: baseResponse.registration
        ? mapIndexerLeaderboardRegistration(baseResponse.registration)
        : null,
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
    const baseResponse = await this.query('leaderboard_contests', {
      contest_ids: params.contestIds,
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

  async getSequencerBacklog(): Promise<GetIndexerBacklogResponse> {
    const baseResponse = await this.query('backlog', {});

    return {
      totalTxs: toBigDecimal(baseResponse.total_txs),
      totalSubmissions: toBigDecimal(baseResponse.total_submissions),
      backlogSize: toBigDecimal(baseResponse.backlog_size),
      updatedAt: toBigDecimal(baseResponse.updated_at),
      backlogEtaInSeconds: baseResponse.backlog_eta_in_seconds
        ? toBigDecimal(baseResponse.backlog_eta_in_seconds)
        : null,
      txsPerSecond: baseResponse.txs_per_second
        ? toBigDecimal(baseResponse.txs_per_second)
        : null,
    };
  }

  protected async query<TRequestType extends IndexerServerQueryRequestType>(
    requestType: TRequestType,
    params: IndexerServerQueryRequestByType[TRequestType],
  ): Promise<IndexerServerQueryResponseByType[TRequestType]> {
    const reqBody: IndexerQueryRequestBody = {
      [requestType]: params,
    };
    const response = await this.axiosInstance.post<
      IndexerServerQueryResponseByType[TRequestType]
    >(this.opts.url, reqBody);

    this.checkResponseStatus(response);

    return response.data;
  }

  protected async sign<T extends SignableRequestType>(
    requestType: T,
    verifyingContract: string,
    chainId: number,
    params: SignableRequestTypeToParams[T],
  ) {
    const walletClient = this.opts.walletClient;

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
    if (response.status !== 200 || !response.data) {
      throw Error(
        `Unexpected response from server: ${response.status} ${response.statusText}`,
      );
    }
  }
}
