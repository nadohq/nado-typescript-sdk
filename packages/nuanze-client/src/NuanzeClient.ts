import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  mapNuanzeCollateralFlowSeriesResponse,
  mapNuanzeCollateralFlowSummaryResponse,
  mapNuanzeCollateralFlowsResponse,
  mapNuanzeFollowedLeaderboardResponse,
  mapNuanzeFundingRatesResponse,
  mapNuanzeLeaderboardResponse,
  mapNuanzeMarketByTickerResponse,
  mapNuanzeMarketCandlesResponse,
  mapNuanzeMarketPositioningResponse,
  mapNuanzeMarketPositionsResponse,
  mapNuanzeMarketTradesResponse,
  mapNuanzeMarketsResponse,
  mapNuanzeNewsResponse,
  mapNuanzePlatformSummaryResponse,
  mapNuanzeWalletPnlResponse,
  mapNuanzeWalletPnlSeriesResponse,
  mapNuanzeWalletPositionsResponse,
  mapNuanzeWalletSummaryResponse,
  mapNuanzeWalletTradesResponse,
} from './dataMappers';
import {
  GetNuanzeCollateralFlowSeriesParams,
  GetNuanzeCollateralFlowSeriesResponse,
  GetNuanzeCollateralFlowSummaryParams,
  GetNuanzeCollateralFlowSummaryResponse,
  GetNuanzeCollateralFlowsParams,
  GetNuanzeCollateralFlowsResponse,
  GetNuanzeFollowedLeaderboardParams,
  GetNuanzeFollowedLeaderboardResponse,
  GetNuanzeFundingRatesParams,
  GetNuanzeFundingRatesResponse,
  GetNuanzeLeaderboardParams,
  GetNuanzeLeaderboardResponse,
  GetNuanzeMarketByTickerParams,
  GetNuanzeMarketByTickerResponse,
  GetNuanzeMarketCandlesParams,
  GetNuanzeMarketCandlesResponse,
  GetNuanzeMarketPositioningParams,
  GetNuanzeMarketPositioningResponse,
  GetNuanzeMarketPositionsParams,
  GetNuanzeMarketPositionsResponse,
  GetNuanzeMarketTradesParams,
  GetNuanzeMarketTradesResponse,
  GetNuanzeMarketsParams,
  GetNuanzeMarketsResponse,
  GetNuanzeNewsParams,
  GetNuanzeNewsResponse,
  GetNuanzePlatformSummaryParams,
  GetNuanzePlatformSummaryResponse,
  GetNuanzeWalletPnlParams,
  GetNuanzeWalletPnlResponse,
  GetNuanzeWalletPnlSeriesParams,
  GetNuanzeWalletPnlSeriesResponse,
  GetNuanzeWalletPositionsParams,
  GetNuanzeWalletPositionsResponse,
  GetNuanzeWalletSummaryParams,
  GetNuanzeWalletSummaryResponse,
  GetNuanzeWalletTradesParams,
  GetNuanzeWalletTradesResponse,
} from './types/clientTypes';
import { NuanzeServerFailureError } from './types/NuanzeServerFailureError';
import { NuanzeServerMarketPositioningResponse } from './types/serverModelTypes';
import {
  NuanzeServerCollateralFlowSeriesResponse,
  NuanzeServerCollateralFlowSummaryResponse,
  NuanzeServerCollateralFlowsResponse,
  NuanzeServerFollowedLeaderboardResponse,
  NuanzeServerFundingRatesResponse,
  NuanzeServerLeaderboardResponse,
  NuanzeServerMarketByTickerResponse,
  NuanzeServerMarketCandlesResponse,
  NuanzeServerMarketPositionsResponse,
  NuanzeServerMarketTradesResponse,
  NuanzeServerMarketsResponse,
  NuanzeServerNewsResponse,
  NuanzeServerPlatformSummaryResponse,
  NuanzeServerWalletPnlResponse,
  NuanzeServerWalletPnlSeriesResponse,
  NuanzeServerWalletPositionsResponse,
  NuanzeServerWalletSummaryResponse,
  NuanzeServerWalletTradesResponse,
  isNuanzeServerFailureResponse,
} from './types/serverQueryTypes';

/**
 * Options for constructing a {@link NuanzeClient}.
 */
export interface NuanzeClientOpts {
  /**
   * Base URL of the Nuanze API, including the version segment, e.g. {@link NUANZE_CLIENT_ENDPOINTS}.
   */
  url: string;
}

/**
 * Client for the Nuanze public analytics API: markets, wallets, trades, candles, collateral flows,
 * and positioning.
 *
 * Read-only and credential-free, so unlike the other service clients it takes no wallet client or
 * linked signer. It also sends no `x-nado-client-type` header: Nuanze is a public API that does not
 * attribute traffic per client, and its `Access-Control-Allow-Headers` does not list the header, so
 * sending it would fail CORS preflight in the browser. Most operations are GET;
 * {@link NuanzeClient.getFollowedLeaderboard} is a non-mutating POST whose body carries a followed
 * set larger than a query string can reliably hold. The API meters a weighted token bucket per
 * client IP and reports its state in the `RateLimit-Limit`, `RateLimit-Remaining`, and
 * `RateLimit-Reset` response headers; add an interceptor on {@link axiosInstance} to observe them.
 */
export class NuanzeClient {
  readonly opts: NuanzeClientOpts;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: NuanzeClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      // Nuanze is public and answers every origin with `Access-Control-Allow-Origin: *`, which
      // browsers reject for credentialed requests.
      withCredentials: false,
      // We have custom logic to validate response status and create an appropriate error
      validateStatus: () => true,
      // Repeatable `productId` must serialize as `productId=1&productId=2` (OpenAPI explode).
      paramsSerializer: { indexes: null },
    });
  }

  /**
   * Lists published editorial stories, sorted by `publishedAt` descending then `id` descending.
   * The opaque cursor is exclusive and bound to normalized filters. Raw article ingestion, scoring,
   * queue, and newsdesk fields are excluded.
   *
   * @throws {NuanzeServerFailureError} With `BAD_REQUEST`, `INVALID_CURSOR`, or
   * `CURSOR_FILTER_MISMATCH` when filters or the cursor are invalid.
   */
  async getNews(
    params: GetNuanzeNewsParams = {},
  ): Promise<GetNuanzeNewsResponse> {
    return mapNuanzeNewsResponse(
      await this.getJson<NuanzeServerNewsResponse>('/news', params),
    );
  }

  /**
   * Gets the active market universe, ordered by `productId` ascending. Never truncated, so `count`
   * always equals the length of `markets`. Market metadata refreshes about every five minutes and
   * prices about every minute.
   *
   * @throws {NuanzeServerFailureError} With error code `BAD_REQUEST` if a filter value is not a
   * documented venue or tradability state.
   */
  async getMarkets(
    params: GetNuanzeMarketsParams = {},
  ): Promise<GetNuanzeMarketsResponse> {
    return mapNuanzeMarketsResponse(
      await this.getJson<NuanzeServerMarketsResponse>('/markets', params),
    );
  }

  /**
   * Resolves a market by ticker. Lookup is case-insensitive and accepts canonical tickers or
   * legacy source symbols. An explicit unavailable venue returns `MARKET_NOT_FOUND`. With no
   * venue, `strictVenue=true` returns `AMBIGUOUS_MARKET` for multi-venue assets; otherwise the
   * primary venue is used.
   *
   * @throws {NuanzeServerFailureError} With `AMBIGUOUS_MARKET`, `MARKET_SELECTOR_MISMATCH`, or
   * `BAD_REQUEST` on invalid selectors, and `MARKET_NOT_FOUND` when the ticker does not resolve.
   */
  async getMarketByTicker(
    params: GetNuanzeMarketByTickerParams,
  ): Promise<GetNuanzeMarketByTickerResponse> {
    const { ticker, ...query } = params;
    return mapNuanzeMarketByTickerResponse(
      await this.getJson<NuanzeServerMarketByTickerResponse>(
        `/markets/${encodeURIComponent(ticker)}`,
        query,
      ),
    );
  }

  /**
   * Lists the latest funding observation per active perpetual market, refreshed about every five
   * minutes.
   *
   * @throws {NuanzeServerFailureError} With `BAD_REQUEST` if a filter value is invalid.
   */
  async getFundingRates(
    params: GetNuanzeFundingRatesParams = {},
  ): Promise<GetNuanzeFundingRatesResponse> {
    return mapNuanzeFundingRatesResponse(
      await this.getJson<NuanzeServerFundingRatesResponse>(
        '/funding/rates',
        params,
      ),
    );
  }

  /**
   * Gets the account PnL leaderboard. Equity-basis account PnL includes realized and unrealized
   * movement plus funding and is not realized PnL. All-time analytics cost five rate-limit units.
   *
   * @throws {NuanzeServerFailureError} With `BAD_REQUEST` if a filter value is invalid.
   */
  async getLeaderboard(
    params: GetNuanzeLeaderboardParams = {},
  ): Promise<GetNuanzeLeaderboardResponse> {
    return mapNuanzeLeaderboardResponse(
      await this.getJson<NuanzeServerLeaderboardResponse>(
        '/leaderboard',
        params,
      ),
    );
  }

  /**
   * Gets platform activity summary from five-minute aggregates.
   *
   * @throws {NuanzeServerFailureError} With `BAD_REQUEST` if the window is not a documented value.
   */
  async getPlatformSummary(
    params: GetNuanzePlatformSummaryParams = {},
  ): Promise<GetNuanzePlatformSummaryResponse> {
    return mapNuanzePlatformSummaryResponse(
      await this.getJson<NuanzeServerPlatformSummaryResponse>(
        '/platform/summary',
        params,
      ),
    );
  }

  /**
   * Gets leaderboard stats for a set of followed subaccounts. POST rather than GET so the body can
   * carry up to 300 `subaccountHex` values. The response preserves request order. Subaccounts with
   * no data in the window are backfilled with `pnl: null`, `globalRank: null`, zero counts, and an
   * empty `productIds`. Costs five rate-limit units. The response is not cached.
   *
   * @throws {NuanzeServerFailureError} With `INVALID_SUBACCOUNT` if a hex is not 32-byte
   * 0x-prefixed, and `BAD_REQUEST` if the set is empty, exceeds 300, or `timeframe` is not a
   * documented value.
   */
  async getFollowedLeaderboard(
    params: GetNuanzeFollowedLeaderboardParams,
  ): Promise<GetNuanzeFollowedLeaderboardResponse> {
    return mapNuanzeFollowedLeaderboardResponse(
      await this.postJson<NuanzeServerFollowedLeaderboardResponse>(
        '/wallets/leaderboard',
        params,
      ),
    );
  }

  /**
   * Gets replica-backed wallet analytics. Without `subaccountName`, latest cumulative values are
   * selected per known subaccount and then summed. The response is a snapshot and does not claim
   * live health, withdrawable collateral, open-order, or signer state.
   *
   * @throws {NuanzeServerFailureError} With `INVALID_ADDRESS` or `BAD_REQUEST` on invalid input,
   * and `WALLET_NOT_FOUND` when the address has no wallet data.
   */
  async getWalletSummary(
    params: GetNuanzeWalletSummaryParams,
  ): Promise<GetNuanzeWalletSummaryResponse> {
    const { address, ...query } = params;
    return mapNuanzeWalletSummaryResponse(
      await this.getJson<NuanzeServerWalletSummaryResponse>(
        `/wallets/${encodeURIComponent(address)}`,
        query,
      ),
    );
  }

  /**
   * Lists at most 500 current replica position rows across all known subaccounts by default. Rows
   * remain per subaccount. Spot rows are excluded unless `includeSpot=true`. This is not an
   * execution-grade live feed.
   *
   * @throws {NuanzeServerFailureError} With `INVALID_ADDRESS` or `BAD_REQUEST` on invalid input,
   * and `WALLET_NOT_FOUND` when the address has no wallet data.
   */
  async getWalletPositions(
    params: GetNuanzeWalletPositionsParams,
  ): Promise<GetNuanzeWalletPositionsResponse> {
    const { address, ...query } = params;
    return mapNuanzeWalletPositionsResponse(
      await this.getJson<NuanzeServerWalletPositionsResponse>(
        `/wallets/${encodeURIComponent(address)}/positions`,
        query,
      ),
    );
  }

  /**
   * Lists market trades: one taker-side row per match, sorted by `matchedAt` then `id` descending.
   * The exclusive cursor is bound to operation and normalized filters. `from` is inclusive and
   * `to` exclusive. Wallet identity is absent.
   *
   * @throws {NuanzeServerFailureError} With `AMBIGUOUS_MARKET`, `MARKET_SELECTOR_MISMATCH`,
   * `INVALID_CURSOR`, `CURSOR_FILTER_MISMATCH`, `RANGE_TOO_LARGE`, or `BAD_REQUEST` on invalid
   * input, and `MARKET_NOT_FOUND` when the ticker does not resolve.
   */
  async getMarketTrades(
    params: GetNuanzeMarketTradesParams,
  ): Promise<GetNuanzeMarketTradesResponse> {
    const { ticker, ...query } = params;
    return mapNuanzeMarketTradesResponse(
      await this.getJson<NuanzeServerMarketTradesResponse>(
        `/markets/${encodeURIComponent(ticker)}/trades`,
        query,
      ),
    );
  }

  /**
   * Lists market candles. Source storage is 1h; 4h and 1d are UTC-aligned rollups and missing bars
   * are not interpolated. The newest `limit` matching bars are selected and returned
   * oldest-to-newest, at most 750, with no pagination. A current bucket has `complete=false`.
   *
   * @throws {NuanzeServerFailureError} With `UNSUPPORTED_INTERVAL`, `RANGE_TOO_LARGE`,
   * `AMBIGUOUS_MARKET`, `MARKET_SELECTOR_MISMATCH`, or `BAD_REQUEST` on invalid input, and
   * `MARKET_NOT_FOUND` when the ticker does not resolve.
   */
  async getMarketCandles(
    params: GetNuanzeMarketCandlesParams,
  ): Promise<GetNuanzeMarketCandlesResponse> {
    const { ticker, ...query } = params;
    return mapNuanzeMarketCandlesResponse(
      await this.getJson<NuanzeServerMarketCandlesResponse>(
        `/markets/${encodeURIComponent(ticker)}/candles`,
        query,
      ),
    );
  }

  /**
   * Lists wallet-owned maker and taker execution rows, sorted by `matchedAt` then `id` descending.
   * The cursor is exclusive and filter-bound. `from` is inclusive and `to` exclusive.
   *
   * @throws {NuanzeServerFailureError} With `INVALID_ADDRESS`, `INVALID_CURSOR`,
   * `CURSOR_FILTER_MISMATCH`, `RANGE_TOO_LARGE`, or `BAD_REQUEST` on invalid input, and
   * `WALLET_NOT_FOUND` when the address has no wallet data.
   */
  async getWalletTrades(
    params: GetNuanzeWalletTradesParams,
  ): Promise<GetNuanzeWalletTradesResponse> {
    const { address, ...query } = params;
    return mapNuanzeWalletTradesResponse(
      await this.getJson<NuanzeServerWalletTradesResponse>(
        `/wallets/${encodeURIComponent(address)}/trades`,
        query,
      ),
    );
  }

  /**
   * Gets wallet account PnL. 24h is rolling and uses hourly snapshots with a daily fallback
   * baseline. Longer windows use daily snapshots; `all` starts at earliest coverage. PnL includes
   * realized and unrealized movement plus funding.
   *
   * @throws {NuanzeServerFailureError} With `INVALID_ADDRESS` or `BAD_REQUEST` on invalid input,
   * and `WALLET_NOT_FOUND` when the address has no wallet data.
   */
  async getWalletPnl(
    params: GetNuanzeWalletPnlParams,
  ): Promise<GetNuanzeWalletPnlResponse> {
    const { address, ...query } = params;
    return mapNuanzeWalletPnlResponse(
      await this.getJson<NuanzeServerWalletPnlResponse>(
        `/wallets/${encodeURIComponent(address)}/pnl`,
        query,
      ),
    );
  }

  /**
   * Gets a wallet account series of at most 1,000 deterministically sampled points ordered by
   * timestamp. Series contain a boundary anchor and a carried-forward request-time tip; synthetic
   * points are identified. Latest buckets may be provisional.
   *
   * @throws {NuanzeServerFailureError} With `INVALID_ADDRESS` or `BAD_REQUEST` on invalid input,
   * and `WALLET_NOT_FOUND` when the address has no wallet data.
   */
  async getWalletPnlSeries(
    params: GetNuanzeWalletPnlSeriesParams,
  ): Promise<GetNuanzeWalletPnlSeriesResponse> {
    const { address, ...query } = params;
    return mapNuanzeWalletPnlSeriesResponse(
      await this.getJson<NuanzeServerWalletPnlSeriesResponse>(
        `/wallets/${encodeURIComponent(address)}/pnl/series`,
        query,
      ),
    );
  }

  /**
   * Lists public collateral events, sorted by timestamp then `id` descending. Repeated `productId`
   * uses OR semantics. `minUsd` excludes unvalued events; without it unvalued events remain.
   *
   * @throws {NuanzeServerFailureError} With `BAD_REQUEST`, `INVALID_CURSOR`, or
   * `CURSOR_FILTER_MISMATCH` when filters or the cursor are invalid.
   */
  async getCollateralFlows(
    params: GetNuanzeCollateralFlowsParams = {},
  ): Promise<GetNuanzeCollateralFlowsResponse> {
    return mapNuanzeCollateralFlowsResponse(
      await this.getJson<NuanzeServerCollateralFlowsResponse>('/flows', params),
    );
  }

  /**
   * Gets collateral flow aggregates: deposited, withdrawn, net, and gross, with valuation coverage
   * and a prior equal-window comparison. `all` has no prior window.
   *
   * @throws {NuanzeServerFailureError} With `BAD_REQUEST` if a filter value is invalid.
   */
  async getCollateralFlowSummary(
    params: GetNuanzeCollateralFlowSummaryParams = {},
  ): Promise<GetNuanzeCollateralFlowSummaryResponse> {
    return mapNuanzeCollateralFlowSummaryResponse(
      await this.getJson<NuanzeServerCollateralFlowSummaryResponse>(
        '/flows/summary',
        params,
      ),
    );
  }

  /**
   * Gets collateral flow series of at most 1,000 UTC buckets. Allowed timeframe/bucket pairs are
   * 24h/hour, 7d/hour or day (default hour), 30d/day, and all/day.
   *
   * @throws {NuanzeServerFailureError} With `UNSUPPORTED_BUCKET` or `BAD_REQUEST` when the pair or
   * filters are invalid.
   */
  async getCollateralFlowSeries(
    params: GetNuanzeCollateralFlowSeriesParams = {},
  ): Promise<GetNuanzeCollateralFlowSeriesResponse> {
    return mapNuanzeCollateralFlowSeriesResponse(
      await this.getJson<NuanzeServerCollateralFlowSeriesResponse>(
        '/flows/series',
        params,
      ),
    );
  }

  /**
   * Gets privacy-preserving aggregate positioning for an active perpetual. Cross and isolated legs
   * are summed within owner/subaccount/product before direction classification. Every cell requires
   * at least 20 distinct contributing owners. No identity, individual position, entry price, PnL,
   * margin, or leverage fields are returned. This operation costs five rate-limit units.
   *
   * @throws {NuanzeServerFailureError} With `AMBIGUOUS_MARKET`, `MARKET_SELECTOR_MISMATCH`, or
   * `BAD_REQUEST` on invalid input, and `MARKET_NOT_FOUND` when the ticker does not resolve to a
   * perp.
   */
  async getMarketPositioning(
    params: GetNuanzeMarketPositioningParams,
  ): Promise<GetNuanzeMarketPositioningResponse> {
    const { ticker, ...query } = params;
    return mapNuanzeMarketPositioningResponse(
      await this.getJson<NuanzeServerMarketPositioningResponse>(
        `/markets/${encodeURIComponent(ticker)}/positioning`,
        query,
      ),
    );
  }

  /**
   * Lists open perpetual position legs for the resolved market. Results default to absolute
   * notional descending and can be ordered by signed unrealized PnL or absolute base amount in
   * either direction. Spot markets are not supported. Legs below $10 absolute notional are excluded.
   * Wallet addresses and signed exact base amounts are returned.
   *
   * @throws {NuanzeServerFailureError} With `AMBIGUOUS_MARKET`, `MARKET_SELECTOR_MISMATCH`,
   * `INVALID_CURSOR`, `CURSOR_FILTER_MISMATCH`, or `BAD_REQUEST` on invalid input, and
   * `MARKET_NOT_FOUND` when the ticker does not resolve to a perp.
   */
  async getMarketPositions(
    params: GetNuanzeMarketPositionsParams,
  ): Promise<GetNuanzeMarketPositionsResponse> {
    const { ticker, ...query } = params;
    return mapNuanzeMarketPositionsResponse(
      await this.getJson<NuanzeServerMarketPositionsResponse>(
        `/markets/${encodeURIComponent(ticker)}/positions`,
        query,
      ),
    );
  }

  /**
   * Performs a GET against `{baseUrl}{path}` and classifies the status before returning the body.
   */
  private async getJson<T>(path: string, params?: object): Promise<T> {
    return this.requestJson<T>('GET', path, { params });
  }

  /**
   * Performs a POST against `{baseUrl}{path}` with a JSON body and classifies the status before
   * returning the response. Used only for the non-mutating followed-leaderboard operation.
   */
  private async postJson<T>(path: string, data: object): Promise<T> {
    return this.requestJson<T>('POST', path, { data });
  }

  private async requestJson<T>(
    method: 'GET' | 'POST',
    path: string,
    config: { params?: object; data?: object } = {},
  ): Promise<T> {
    const response = await this.axiosInstance.request<T>({
      method,
      url: `${this.opts.url}${path}`,
      ...config,
    });
    this.checkResponseStatus(response);
    return response.data;
  }

  /**
   * Validates the HTTP status before interpreting the body. Nuanze maps every domain failure onto a
   * non-2xx status carrying a failure envelope, so anything else is a transport-level error.
   */
  private checkResponseStatus(response: AxiosResponse<unknown>) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }
    if (isNuanzeServerFailureResponse(response.data)) {
      throw new NuanzeServerFailureError(response.data, response.status);
    }
    throw new Error(
      `Unexpected response from Nuanze: ${response.status} ${response.statusText}. Data: ${JSON.stringify(response.data)}`,
    );
  }
}
