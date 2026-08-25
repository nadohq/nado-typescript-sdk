import {
  getNadoClientTypeHeaders,
  subaccountToHex,
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  mapMobileFeedPage,
  mapMobileFollowListPage,
  mapMobileFollowMutationResult,
  mapMobileNotificationPreferences,
  mapMobileNotificationPreferencesToServer,
  mapMobileProfilesIncludeToServer,
  mapMobilePublicProfile,
  mapMobileRegisteredWallet,
} from './dataMappers';
import {
  buildSignedMobileRequest,
  MobileSignedInner,
  MobileSignedInnerByType,
  MobileSignedInnerParams,
  MobileSignedRequest,
} from './signing';
import {
  GetMobileFeedParams,
  GetMobileFollowersParams,
  GetMobileFollowingParams,
  GetMobileFollowListParams,
  GetMobileNotificationPreferencesParams,
  GetMobileProfilesParams,
  GetMobileRegisteredWalletParams,
  GetMobileUsernameAvailabilityParams,
  MobileFeedPage,
  MobileFollowListPage,
  MobileFollowMutationResult,
  MobileNotificationPreferences,
  MobilePublicProfile,
  MobileRegisteredWallet,
  MobileRegisterExpoTokenParams,
  MobileSetFollowParams,
  MobileSetPrivateModeParams,
  MobileSetUsernameParams,
  MobileSignedRequestParams,
  MobileUnregisterExpoTokenParams,
  MobileUpdateNotificationPreferencesParams,
  MobileUsernameAvailability,
} from './types/clientTypes';
import { MobileServerFailureError } from './types/MobileServerFailureError';
import { MobileServerSuccessResponse } from './types/serverBaseTypes';
import {
  MobileServerExecuteResult,
  MobileServerExecuteSuccessResponse,
  MobileServerPublicExecuteRequest,
} from './types/serverExecuteTypes';
import {
  MobileServerPublicQueryRequest,
  MobileServerPublicQuerySuccessResponse,
} from './types/serverQueryTypes';
import {
  MobileServerExecuteRequestType,
  MobileServerFollowListRequest,
  MobileServerPublicQueryRequestByType,
  MobileServerPublicQueryRequestType,
} from './types/serverRequestTypes';
import {
  isMobileServerFailureResponse,
  isMobileServerSuccessResponse,
} from './utils/serverResponseGuards';

/**
 * Options for constructing a {@link MobileClient}.
 */
export interface MobileClientOpts {
  /**
   * Base URL of the mobile service API, e.g. {@link MOBILE_CLIENT_ENDPOINTS}.
   */
  url: string;
  /**
   * Wallet client used to sign requests.
   */
  walletClient?: WalletClientWithAccount;
  /**
   * If provided, this signer is used instead of `walletClient` for all signed requests.
   */
  linkedSignerWalletClient?: WalletClientWithAccount;
  /**
   * If provided, identifies the calling client, sent as a header with every request.
   */
  clientType?: string;
}

/**
 * Client for the Nado mobile service API: usernames, public profile lookups, the global trade feed, the
 * follower/following graph, privacy settings, and push notification device/preference management.
 */
export class MobileClient {
  readonly opts: MobileClientOpts;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: MobileClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      withCredentials: true,
      // We have custom logic to validate response status and create an appropriate error
      validateStatus: () => true,
      headers: getNadoClientTypeHeaders(opts.clientType),
    });
  }

  /**
   * Sets the linked signer for requests
   *
   * @param linkedSignerWalletClient The linkedSigner to use for all signatures. Set to null to revert to the chain signer
   */
  public setLinkedSigner(
    linkedSignerWalletClient: WalletClientWithAccount | null,
  ) {
    this.opts.linkedSignerWalletClient = linkedSignerWalletClient ?? undefined;
  }

  /*
  Public queries
   */

  /**
   * Checks whether a username derived from the given display name is available to claim.
   */
  async getUsernameAvailability(
    params: GetMobileUsernameAvailabilityParams,
  ): Promise<MobileUsernameAvailability> {
    const body: MobileServerPublicQueryRequest<'username_availability'> = {
      type: 'username_availability',
      display_name: params.displayName,
    };
    const data = await this.publicQuery(body);
    return { username: data.username, available: data.available };
  }

  /**
   * Looks up public profiles, optionally with follower totals and a follow summary. Returns one profile per
   * requested subaccount, in the requested order, so callers can correlate positionally. Every non-isolated
   * subaccount resolves, with `username` and `displayName` `null` until a username is claimed. Private Mode
   * does not hide the profile itself, only the account's activity.
   *
   * This is the only profile route, so use it for a single subaccount too. It is unsigned, which means
   * `include.followSummary.viewAs` is an unauthenticated claim.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_PROFILES_REQUEST` if `subaccounts` is empty,
   * holds duplicates, or exceeds `MOBILE_PROFILES_MAX_BATCH_SIZE` (25), or `PROFILE_NOT_FOUND` if any
   * requested subaccount — or the follow summary's `viewAs` — is in the engine-created isolated namespace.
   * One isolated member fails the whole batch rather than being omitted.
   */
  async getProfiles(
    params: GetMobileProfilesParams,
  ): Promise<MobilePublicProfile[]> {
    const body: MobileServerPublicQueryRequest<'profiles'> = {
      type: 'profiles',
      subaccounts: params.subaccounts.map(subaccountToHex),
      include: params.include
        ? mapMobileProfilesIncludeToServer(params.include)
        : undefined,
    };
    const data = await this.publicQuery(body);
    return data.profiles.map(mapMobilePublicProfile);
  }

  /**
   * Fetches a page of the accounts that follow the given Profile.
   *
   * Ordering depends on `viewAs`. With it, accounts the Viewer already follows come first, unfamiliar
   * accounts second, and every row carries an `isFollowing`. Without it, the page is ordered by the listed
   * relationship alone and no row carries an `isFollowing`. In both cases the newest listed relationship
   * comes first within a group, with a bytes32 tie-break. The grouping is evaluated per request against the
   * live graph, so following an account from inside the list moves it between groups on the next page —
   * deduplicate by subaccount and do not re-sort locally.
   *
   * @throws {MobileServerFailureError} With error code `PROFILE_NOT_FOUND` if the viewed Profile or `viewAs`
   * is isolated, `INVALID_FOLLOW_CURSOR` if the cursor is malformed or was issued for a different `viewAs`,
   * Profile, or list direction (discard it and restart from the first page), or `INVALID_FOLLOW_LIMIT` if
   * `limit` is outside 1–50.
   */
  async getFollowers(
    params: GetMobileFollowersParams,
  ): Promise<MobileFollowListPage> {
    const data = await this.publicQuery(
      this.getFollowListRequest('followers', params),
    );
    return mapMobileFollowListPage(data);
  }

  /**
   * Fetches a page of the accounts the given Profile follows. Ordering, cursor rules, and errors match
   * {@link MobileClient.getFollowers}. When `viewAs` reads its own Following list every row is familiar, so
   * every `isFollowing` is `true`.
   */
  async getFollowing(
    params: GetMobileFollowingParams,
  ): Promise<MobileFollowListPage> {
    const data = await this.publicQuery(
      this.getFollowListRequest('following', params),
    );
    return mapMobileFollowListPage(data);
  }

  /**
   * Fetches a page of the global trade feed: public perpetual trades, newest first, optionally filtered by a
   * whole-dollar minimum notional (omitted means unfiltered). Trades by subaccounts that have not claimed a
   * username are included with `null` name fields; only private accounts are filtered out. The feed is
   * best-effort rather than authoritative history, and pagination is live (not snapshot), so deduplicate pages
   * by {@link MobileFeedTrade.orderDigest}.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_FEED_FILTER` if `minimumNotional` or
   * `limit` is outside its allowed domain (fix the request; do not retry unchanged), or
   * `INVALID_FEED_CURSOR` if the cursor is malformed or was issued for a different `minimumNotional`
   * (discard the cursor and restart from the first page).
   */
  async getFeed(params: GetMobileFeedParams = {}): Promise<MobileFeedPage> {
    const body: MobileServerPublicQueryRequest<'feed'> = {
      type: 'feed',
      minimum_notional: params.minimumNotional,
      limit: params.limit,
      cursor: params.cursor,
    };
    const data = await this.publicQuery(body);
    return mapMobileFeedPage(data);
  }

  /**
   * Fetches the push notification preferences of the wallet that owns the given Expo push token. Unsigned —
   * the token identifies the wallet on its own. Falls back to the backend's defaults if the wallet has never
   * updated its preferences.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is malformed, or is
   * not currently registered to a wallet.
   */
  async getNotificationPreferences(
    params: GetMobileNotificationPreferencesParams,
  ): Promise<MobileNotificationPreferences> {
    const body: MobileServerPublicQueryRequest<'notification_preferences'> = {
      type: 'notification_preferences',
      expo_token: params.expoToken,
    };
    const data = await this.publicQuery(body);
    return mapMobileNotificationPreferences(data.preferences);
  }

  /**
   * Resolves the wallet that an Expo push token is currently registered to, along with the redacted metadata
   * of the device that registered it. Unsigned — the token identifies the wallet on its own. Use it to check
   * whether a locally held token is still active and which wallet currently owns it, since registering the
   * same token under another wallet transfers ownership.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is malformed, or is
   * not currently registered to a wallet — including a token that was unregistered. The backend does not
   * distinguish those cases.
   */
  async getRegisteredWallet(
    params: GetMobileRegisteredWalletParams,
  ): Promise<MobileRegisteredWallet> {
    const body: MobileServerPublicQueryRequest<'registered_wallet'> = {
      type: 'registered_wallet',
      expo_token: params.expoToken,
    };
    const data = await this.publicQuery(body);
    return mapMobileRegisteredWallet(data);
  }

  /*
  Public executes
   */

  /**
   * Unregisters an Expo push token, stopping delivery to that device. Unsigned, so it still works at logout
   * when a wallet signature may no longer be obtainable. Idempotent: unregistering an inactive or unknown
   * well-formed token succeeds.
   *
   * A registration that commits after this call re-activates the token, so stop or await any in-flight
   * {@link MobileClient.registerExpoToken} before unregistering.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is malformed.
   */
  async unregisterExpoToken(
    params: MobileUnregisterExpoTokenParams,
  ): Promise<MobileServerSuccessResponse> {
    const body: MobileServerPublicExecuteRequest<'unregister_expo_token'> = {
      type: 'unregister_expo_token',
      expo_token: params.expoToken,
    };
    return this.publicExecute(body);
  }

  /**
   * Replaces the push notification preferences of the wallet that owns the given Expo push token. Possession
   * of an active token is the credential rather than a signature, so anyone holding the token can overwrite
   * that wallet's preferences. The backend requires `schemaVersion` of 1, exactly one entry per known
   * category, and empty `scopes` on every entry.
   *
   * Writes are last-write-wins on commit order rather than ordered by a client nonce, so callers must
   * serialize their own preference writes.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_PREFERENCES` if those rules are violated, or
   * `INVALID_EXPO_TOKEN` if the token is malformed or is not currently registered to a wallet.
   */
  async updateNotificationPreferences(
    params: MobileUpdateNotificationPreferencesParams,
  ): Promise<MobileServerSuccessResponse> {
    const body: MobileServerPublicExecuteRequest<'update_preferences'> = {
      type: 'update_preferences',
      expo_token: params.expoToken,
      preferences: mapMobileNotificationPreferencesToServer(params.preferences),
    };
    return this.publicExecute(body);
  }

  /*
  Signed executes
   */

  /**
   * Sets a subaccount's username, derived from the given display name. Upserts: the same call claims a first
   * username and renames an existing one, so callers never need to read the current identity first.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_DISPLAY_NAME` if the display name violates
   * `MOBILE_DISPLAY_NAME_PATTERN`, `USERNAME_UNAVAILABLE` if the derived username is reserved or already
   * taken by another subaccount, `INVALID_IDENTITY_TARGET` if the sender is in the engine-created isolated
   * namespace, or `STALE_IDENTITY_UPDATE` if another identity write for this subaccount committed with a
   * later nonce (re-read the identity before retrying).
   */
  async setUsername(
    params: MobileSetUsernameParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest('set_username', params, {
      display_name: params.displayName,
    });
    return this.execute(signedRequest);
  }

  /**
   * Sets whether a subaccount's profile is private.
   */
  async setPrivateMode(
    params: MobileSetPrivateModeParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'set_private_mode',
      params,
      { private_mode: params.privateMode },
    );
    return this.execute(signedRequest);
  }

  /**
   * Registers an Expo push token for the wallet, transferring active ownership of the token if another
   * wallet had registered it. Idempotent per `(wallet, token)`.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is not a valid Expo
   * push token, or `INVALID_DEVICE_METADATA` if `locale` (max 35 chars) or `appVersion` (max 64 chars) is
   * too long.
   */
  async registerExpoToken(
    params: MobileRegisterExpoTokenParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'register_expo_token',
      params,
      {
        expo_token: params.expoToken,
        platform: params.platform,
        locale: params.locale ?? null,
        app_version: params.appVersion ?? null,
      },
    );
    return this.execute(signedRequest);
  }

  /**
   * Sets whether the signing subaccount follows a Profile. Both directions are idempotent: following again
   * keeps the original relationship creation time, so it does not move the account in recency order, and
   * unfollowing a relationship that does not exist succeeds with `isFollowing: false`. Unfollowing deletes
   * the relationship rather than deactivating it, so a later follow gets a new creation time and moves the
   * account to the front of recency order.
   *
   * Only `isFollowing: true` is checked against the canonical Query DB subaccount index, so unfollowing still
   * works while that index lags.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_FOLLOW_TARGET` if the target is the sender or
   * either party is isolated, `FOLLOWER_NOT_ELIGIBLE` if the sender is not yet in the canonical Query DB
   * subaccount index, or `FOLLOWING_NOT_FOUND` if the target is not. Both index errors are transient for an
   * account that is being recorded, so they are retryable after catch-up — unlike `INVALID_FOLLOW_TARGET`.
   */
  async setFollow(
    params: MobileSetFollowParams,
  ): Promise<MobileFollowMutationResult> {
    const signedRequest = await this.getSignedRequest('set_follow', params, {
      subaccount: subaccountToHex(params.target),
      is_following: params.isFollowing,
    });
    const data = await this.execute(signedRequest);
    return mapMobileFollowMutationResult(data);
  }

  /*
  Base Fns
   */

  // Both list directions take identical params and differ only in the `type` they dispatch on.
  private getFollowListRequest<T extends 'followers' | 'following'>(
    type: T,
    params: GetMobileFollowListParams,
  ): { type: T } & MobileServerFollowListRequest {
    return {
      type,
      subaccount: subaccountToHex(params.target),
      view_as: params.viewAs ? subaccountToHex(params.viewAs) : undefined,
      cursor: params.cursor,
      limit: params.limit,
    };
  }

  // Returns the request narrowed to `type` so `execute` can infer its response from the request it is given,
  // instead of being told the type a second time at the call site.
  protected async getSignedRequest<T extends MobileSignedInner['type']>(
    type: T,
    params: MobileSignedRequestParams,
    innerParams: MobileSignedInnerParams<T>,
  ): Promise<MobileSignedRequest<MobileSignedInnerByType<T>>> {
    // Use the linked signer if provided, otherwise use the default signer provided to the client
    const walletClient =
      this.opts.linkedSignerWalletClient ?? this.opts.walletClient;

    if (walletClient == null) {
      throw new WalletNotProvidedError();
    }

    const inner = {
      type,
      ...innerParams,
    } as unknown as MobileSignedInnerByType<T>;
    return buildSignedMobileRequest({ ...params, walletClient, inner });
  }

  // Spelled out as an intersection rather than `MobileServerPublicQueryRequest<T>`: the latter is an indexed
  // access on a mapped type, which is not an inference site, so `T` would always widen to the full union.
  protected async publicQuery<T extends MobileServerPublicQueryRequestType>(
    body: { type: T } & MobileServerPublicQueryRequestByType[T],
  ): Promise<MobileServerPublicQuerySuccessResponse<T>> {
    const response = await this.axiosInstance.post<unknown>(
      `${this.opts.url}/mobile/public_query`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus throws on failure responses so the cast to the success response is acceptable here
    return response.data as MobileServerPublicQuerySuccessResponse<T>;
  }

  protected async publicExecute(
    body: MobileServerPublicExecuteRequest,
  ): Promise<MobileServerSuccessResponse> {
    const response = await this.axiosInstance.post<MobileServerExecuteResult>(
      `${this.opts.url}/mobile/public_execute`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus catches the failure result and throws the error, so the cast to the success response is acceptable here
    return response.data as MobileServerSuccessResponse;
  }

  // `T` is inferred from the body's `type` rather than declared by the caller, for the same reason
  // `publicQuery` spells its body out as an intersection: an indexed access is not an inference site.
  protected async execute<T extends MobileServerExecuteRequestType>(
    body: MobileSignedRequest & { type: T },
  ): Promise<MobileServerExecuteSuccessResponse<T>> {
    const response = await this.axiosInstance.post<MobileServerExecuteResult>(
      `${this.opts.url}/mobile/execute`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus catches the failure result and throws the error, so the cast to the success response is acceptable here
    return response.data as MobileServerExecuteSuccessResponse<T>;
  }

  /**
   * Validates the HTTP status before interpreting the body. Unlike the engine, the mobile backend returns
   * failure envelopes with non-2xx statuses (e.g. 404 for `PROFILE_NOT_FOUND`), so a non-2xx response with a
   * failure envelope still throws the typed error; anything else is a transport-level error.
   */
  private checkResponseStatus(response: AxiosResponse<unknown>) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }
    if (isMobileServerFailureResponse(response.data)) {
      throw new MobileServerFailureError(response.data, response.status);
    }
    throw new Error(
      `Unexpected response from mobile service: ${response.status} ${response.statusText}. Data: ${JSON.stringify(response.data)}`,
    );
  }

  private checkServerStatus(response: AxiosResponse<unknown>) {
    const { data } = response;

    if (isMobileServerFailureResponse(data)) {
      throw new MobileServerFailureError(data, response.status);
    }
    if (!isMobileServerSuccessResponse(data)) {
      throw new Error(
        `Unexpected response from mobile service: missing success envelope. Data: ${JSON.stringify(data)}`,
      );
    }
  }
}
