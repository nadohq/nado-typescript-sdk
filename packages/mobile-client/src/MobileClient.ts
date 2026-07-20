import {
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
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
  GetMobileNotificationPreferencesParams,
  GetMobilePublicProfileParams,
  GetMobileRegisteredDevicesParams,
  GetMobileSelfIdentityParams,
  GetMobileUsernameAvailabilityParams,
  MobileClaimUsernameParams,
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
  isMobileServerFailureResponse,
  isMobileServerSuccessResponse,
  MobileServerExecuteResponse,
  MobileServerNotificationPreferencesResponse,
  MobileServerProfileRequest,
  MobileServerProfileResponse,
  MobileServerRegisteredDevicesResponse,
  MobileServerSelfIdentityResponse,
  MobileServerUsernameAvailabilityRequest,
  MobileServerUsernameAvailabilityResponse,
} from './types/serverTypes';

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
 * Client for the Nado Mobile API: username claims, public profile lookups, privacy settings, and push
 * notification device/preference management.
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
    const data =
      await this.publicQuery<MobileServerUsernameAvailabilityResponse>(body);
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
    const data = await this.publicQuery<MobileServerProfileResponse>(body);
    return mapMobilePublicProfile(data.profile);
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
    const data =
      await this.query<MobileServerSelfIdentityResponse>(signedRequest);
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
    const data =
      await this.query<MobileServerNotificationPreferencesResponse>(
        signedRequest,
      );
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
    const data =
      await this.query<MobileServerRegisteredDevicesResponse>(signedRequest);
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
  ): Promise<MobileServerExecuteResponse> {
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
  ): Promise<MobileServerExecuteResponse> {
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
  ): Promise<MobileServerExecuteResponse> {
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
  ): Promise<MobileServerExecuteResponse> {
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
  ): Promise<MobileServerExecuteResponse> {
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
  ): Promise<MobileServerExecuteResponse> {
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
  Base fns
   */

  private async getSignedRequest<T extends MobileSignedInner['type']>(
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

  private async publicQuery<TResponse extends { status: 'success' }>(
    body: object,
  ): Promise<TResponse> {
    const response = await this.axiosInstance.post<unknown>(
      `${this.opts.url}/mobile/public_query`,
      body,
    );
    return this.extractSuccessData<TResponse>(response);
  }

  private async query<TResponse extends { status: 'success' }>(
    body: MobileSignedRequest,
  ): Promise<TResponse> {
    const response = await this.axiosInstance.post<unknown>(
      `${this.opts.url}/mobile/query`,
      body,
    );
    return this.extractSuccessData<TResponse>(response);
  }

  private async execute(
    body: MobileSignedRequest,
  ): Promise<MobileServerExecuteResponse> {
    const response = await this.axiosInstance.post<unknown>(
      `${this.opts.url}/mobile/execute`,
      body,
    );
    return this.extractSuccessData<MobileServerExecuteResponse>(response);
  }

  private extractSuccessData<TResponse extends { status: 'success' }>(
    response: AxiosResponse<unknown>,
  ): TResponse {
    const { data } = response;

    if (isMobileServerFailureResponse(data)) {
      throw new MobileServerFailureError(data, response.status);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Unexpected response from mobile service: ${response.status} ${response.statusText}. Data: ${JSON.stringify(data)}`,
      );
    }
    if (!isMobileServerSuccessResponse<TResponse>(data)) {
      throw new Error(
        `Unexpected response from mobile service: missing success envelope. Data: ${JSON.stringify(data)}`,
      );
    }

    return data;
  }
}
