import {
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
  MobileClaimUsernameParams,
  MobileFeedPage,
  MobileIdentity,
  MobileNotificationPreferences,
  MobilePublicProfile,
  MobileRegisteredDevice,
  MobileRegisterExpoTokenParams,
  MobileSetPrivateModeParams,
  MobileSignedRequestParams,
  MobileUnregisterExpoTokenParams,
  MobileUpdateNotificationPreferencesParams,
  MobileUpdateUsernameParams,
  MobileUsernameAvailability,
} from './types/clientTypes';
import { MobileServerFailureError } from './types/MobileServerFailureError';
import {
  MobileServerPublicQueryRequestByType,
  MobileServerPublicQueryRequestType,
  MobileServerSuccessResponse,
} from './types/serverBaseTypes';
import { MobileServerExecuteResult } from './types/serverExecuteTypes';
import {
  MobileServerFeedRequest,
  MobileServerProfileRequest,
  MobileServerPublicQuerySuccessResponse,
  MobileServerSignedQueryRequestType,
  MobileServerSignedQuerySuccessResponse,
  MobileServerUsernameAvailabilityRequest,
} from './types/serverQueryTypes';
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
 * Client for the Nado mobile service API: username claims, public profile lookups, privacy settings, and
 * push notification device/preference management.
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
    const body: MobileServerUsernameAvailabilityRequest = {
      type: 'username_availability',
      display_name: params.displayName,
    };
    const data = await this.publicQuery(body);
    return { username: data.username, available: data.available };
  }

  /**
   * Looks up a subaccount's public profile by username.
   *
   * @throws {MobileServerFailureError} With error code `PROFILE_NOT_FOUND` if no identity has claimed the
   * username or it is invalid. Private Mode does not hide the profile itself, only the account's activity.
   */
  async getPublicProfile(
    params: GetMobilePublicProfileParams,
  ): Promise<MobilePublicProfile> {
    const body: MobileServerProfileRequest = {
      type: 'profile',
      username: params.username,
    };
    const data = await this.publicQuery(body);
    return mapMobilePublicProfile(data.profile);
  }

  /**
   * Fetches a page of the global trade feed: public, named, perpetual trades, newest first, optionally
   * filtered by a whole-dollar minimum notional (omitted means unfiltered). The feed is best-effort rather
   * than authoritative history, and pagination is live (not snapshot), so deduplicate pages by
   * {@link MobileFeedTrade.orderDigest}.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_FEED_FILTER` if `minimumNotional` or
   * `limit` is outside its allowed domain (fix the request; do not retry unchanged), or
   * `INVALID_FEED_CURSOR` if the cursor is malformed or was issued for a different `minimumNotional`
   * (discard the cursor and restart from the first page).
   */
  async getFeed(params: GetMobileFeedParams = {}): Promise<MobileFeedPage> {
    const body: MobileServerFeedRequest = {
      type: 'feed',
      minimum_notional: params.minimumNotional,
      limit: params.limit,
      cursor: params.cursor,
    };
    const data = await this.publicQuery(body);
    return mapMobileFeedPage(data);
  }

  /*
  Signed queries
   */

  /**
   * Fetches the caller's own identity for a subaccount. Returns `null` if the subaccount has not claimed a
   * username yet — this is normal data, not an error.
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
   * Fetches a wallet's push notification preferences. Falls back to the backend's defaults if the wallet has
   * never updated its preferences.
   */
  async getNotificationPreferences(
    params: GetMobileNotificationPreferencesParams,
  ): Promise<MobileNotificationPreferences> {
    const signedRequest = await this.getSignedRequest(
      'notification_preferences',
      params,
      {},
    );
    const data = await this.query<'notification_preferences'>(signedRequest);
    return mapMobileNotificationPreferences(data.preferences);
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
   * Claims a username for a subaccount, derived from the given display name.
   */
  async claimUsername(
    params: MobileClaimUsernameParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'claim_username',
      params,
      {
        display_name: params.displayName,
      },
    );
    return this.execute(signedRequest);
  }

  /**
   * Updates the display name for a subaccount's already-claimed identity.
   */
  async updateUsername(
    params: MobileUpdateUsernameParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'update_username',
      params,
      { display_name: params.displayName },
    );
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
   * Unregisters an Expo push token for the wallet. Idempotent — unregistering an unknown token succeeds.
   */
  async unregisterExpoToken(
    params: MobileUnregisterExpoTokenParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'unregister_expo_token',
      params,
      { expo_token: params.expoToken },
    );
    return this.execute(signedRequest);
  }

  /**
   * Replaces the wallet's push notification preferences. The backend requires `schemaVersion` of 1, exactly
   * one entry per known category, and empty `scopes` on every entry.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_PREFERENCES` if those rules are violated.
   */
  async updateNotificationPreferences(
    params: MobileUpdateNotificationPreferencesParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'update_preferences',
      params,
      {
        preferences: mapMobileNotificationPreferencesToServer(
          params.preferences,
        ),
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
