import {
  subaccountToHex,
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  mapMobileFeedPage,
  mapMobileIdentity,
  mapMobileNotificationPreferences,
  mapMobileNotificationPreferencesToServer,
  mapMobilePublicProfile,
  mapMobileRegisteredDevice,
} from './dataMappers';
import {
  buildSignedMobileRequest,
  MobileSignedInner,
  MobileSignedInnerParams,
  MobileSignedRequest,
} from './signing';
import {
  GetMobileFeedParams,
  GetMobileNotificationPreferencesParams,
  GetMobilePublicProfileParams,
  GetMobileRegisteredDevicesParams,
  GetMobileSelfIdentityParams,
  GetMobileUsernameAvailabilityParams,
  MobileFeedPage,
  MobileIdentity,
  MobileNotificationPreferences,
  MobilePublicProfile,
  MobileRegisteredDevice,
  MobileRegisterExpoTokenParams,
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
  MobileServerPublicExecuteRequest,
} from './types/serverExecuteTypes';
import {
  MobileServerPublicQueryRequest,
  MobileServerPublicQuerySuccessResponse,
  MobileServerSignedQuerySuccessResponse,
} from './types/serverQueryTypes';
import {
  MobileServerPublicQueryRequestByType,
  MobileServerPublicQueryRequestType,
  MobileServerSignedQueryRequestType,
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
}

/**
 * Client for the Nado mobile service API: usernames, public profile lookups, the global trade feed, privacy
 * settings, and push notification device/preference management.
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
   * Looks up a subaccount's public profile. Every non-isolated subaccount resolves, with `username` and
   * `displayName` `null` until a username is claimed. Private Mode does not hide the profile itself, only the
   * account's activity.
   *
   * @throws {MobileServerFailureError} With error code `PROFILE_NOT_FOUND` if the subaccount is in the
   * engine-created isolated namespace, which cannot own a profile.
   */
  async getPublicProfile(
    params: GetMobilePublicProfileParams,
  ): Promise<MobilePublicProfile> {
    const body: MobileServerPublicQueryRequest<'profile'> = {
      type: 'profile',
      subaccount: subaccountToHex(params),
    };
    const data = await this.publicQuery(body);
    return mapMobilePublicProfile(data.profile);
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
   * Fetches the push notification preferences of the wallet that owns the given Expo push token. Possession
   * of an active token is the credential, so no signature is required. Falls back to the backend's defaults
   * if the wallet has never updated its preferences.
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

  /*
  Public executes
   */

  /**
   * Unregisters an Expo push token, stopping delivery to that device. Possession of the token is the
   * credential, so no signature is required — which matters at logout, when a wallet signature may no longer
   * be obtainable. Idempotent: unregistering an inactive or unknown well-formed token succeeds.
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
   * of an active token is the credential, so no signature is required. The backend requires `schemaVersion`
   * of 1, exactly one entry per known category, and empty `scopes` on every entry.
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
  Signed queries
   */

  /**
   * Fetches the caller's own identity for a subaccount. Every non-isolated subaccount has an implicit
   * identity, so this resolves for any valid sender with `username` and `displayName` `null` until a username
   * is claimed.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_IDENTITY_TARGET` if the sender is in the
   * engine-created isolated namespace, which cannot own an identity.
   */
  async getSelfIdentity(
    params: GetMobileSelfIdentityParams,
  ): Promise<MobileIdentity | null> {
    const signedRequest = await this.getSignedRequest(
      'self_identity',
      params,
      {},
    );
    const data = await this.query<'self_identity'>(signedRequest);
    return data.identity ? mapMobileIdentity(data.identity) : null;
  }

  /**
   * Fetches the devices registered for push notifications for a wallet.
   */
  async getRegisteredDevices(
    params: GetMobileRegisteredDevicesParams,
  ): Promise<MobileRegisteredDevice[]> {
    const signedRequest = await this.getSignedRequest(
      'registered_devices',
      params,
      {},
    );
    const data = await this.query<'registered_devices'>(signedRequest);
    return data.devices.map(mapMobileRegisteredDevice);
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

  /*
  Base Fns
   */

  protected async getSignedRequest<T extends MobileSignedInner['type']>(
    type: T,
    params: MobileSignedRequestParams,
    innerParams: MobileSignedInnerParams<T>,
  ): Promise<MobileSignedRequest> {
    // Use the linked signer if provided, otherwise use the default signer provided to the client
    const walletClient =
      this.opts.linkedSignerWalletClient ?? this.opts.walletClient;

    if (walletClient == null) {
      throw new WalletNotProvidedError();
    }

    const inner = { type, ...innerParams } as MobileSignedInner;
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

  protected async query<T extends MobileServerSignedQueryRequestType>(
    body: MobileSignedRequest,
  ): Promise<MobileServerSignedQuerySuccessResponse<T>> {
    const response = await this.axiosInstance.post<unknown>(
      `${this.opts.url}/mobile/query`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus throws on failure responses so the cast to the success response is acceptable here
    return response.data as MobileServerSignedQuerySuccessResponse<T>;
  }

  protected async execute(
    body: MobileSignedRequest,
  ): Promise<MobileServerSuccessResponse> {
    const response = await this.axiosInstance.post<MobileServerExecuteResult>(
      `${this.opts.url}/mobile/execute`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus catches the failure result and throws the error, so the cast to the success response is acceptable here
    return response.data as MobileServerSuccessResponse;
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
