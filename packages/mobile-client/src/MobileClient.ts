import {
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { mapMobileIdentity, mapMobilePublicProfile } from './dataMappers';
import { stringifyMobileRequest } from './jsonSerializer';
import {
  buildSignedMobileRequest,
  MobileSignedInner,
  MobileSignedRequest,
} from './signing';
import {
  ClaimUsernameParams,
  GetPublicProfileParams,
  GetSelfIdentityParams,
  GetUsernameAvailabilityParams,
  Identity,
  MobileSignedRequestParams,
  PublicProfile,
  SetPrivateModeParams,
  UpdateUsernameParams,
  UsernameAvailability,
} from './types/clientTypes';
import { MobileServerFailureError } from './types/MobileServerFailureError';
import {
  isMobileServerFailureResponse,
  isMobileServerSuccessResponse,
  MobileServerExecuteResponse,
  MobileServerProfileRequest,
  MobileServerProfileResponse,
  MobileServerSelfIdentityResponse,
  MobileServerUsernameAvailabilityRequest,
  MobileServerUsernameAvailabilityResponse,
} from './types/serverTypes';

/**
 * Options for constructing a {@link MobileClient}.
 */
export interface MobileClientOpts {
  /**
   * Base URL of the Mobile Identity API, e.g. {@link MOBILE_CLIENT_ENDPOINTS}.
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
 * Client for the Nado Mobile Identity API: username claims, public profile lookups, and privacy settings.
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
    params: GetUsernameAvailabilityParams,
  ): Promise<UsernameAvailability> {
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
    params: GetPublicProfileParams,
  ): Promise<PublicProfile> {
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
    params: GetSelfIdentityParams,
  ): Promise<Identity | null> {
    const signedRequest = await this.buildSigned(params, {
      type: 'self_identity',
    });
    const data =
      await this.query<MobileServerSelfIdentityResponse>(signedRequest);
    return data.identity ? mapMobileIdentity(data.identity) : null;
  }

  /*
  Signed executes
   */

  /**
   * Claims a username for a subaccount, derived from the given display name.
   */
  async claimUsername(params: ClaimUsernameParams): Promise<void> {
    const signedRequest = await this.buildSigned(params, {
      type: 'claim_username',
      display_name: params.displayName,
    });
    await this.execute(signedRequest);
  }

  /**
   * Updates the display name for a subaccount's already-claimed identity.
   */
  async updateUsername(params: UpdateUsernameParams): Promise<void> {
    const signedRequest = await this.buildSigned(params, {
      type: 'update_username',
      display_name: params.displayName,
    });
    await this.execute(signedRequest);
  }

  /**
   * Sets whether a subaccount's profile is private.
   */
  async setPrivateMode(params: SetPrivateModeParams): Promise<void> {
    const signedRequest = await this.buildSigned(params, {
      type: 'set_private_mode',
      private_mode: params.privateMode,
    });
    await this.execute(signedRequest);
  }

  /*
  Base fns
   */

  private async buildSigned<T extends MobileSignedInner>(
    params: MobileSignedRequestParams,
    inner: T,
  ): Promise<MobileSignedRequest<T>> {
    // Use the linked signer if provided, otherwise use the default signer provided to the client
    const walletClient =
      this.opts.linkedSignerWalletClient ?? this.opts.walletClient;

    if (walletClient == null) {
      throw new WalletNotProvidedError();
    }

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
      stringifyMobileRequest(body),
      { headers: { 'Content-Type': 'application/json' } },
    );
    return this.extractSuccessData<TResponse>(response);
  }

  private async execute(
    body: MobileSignedRequest,
  ): Promise<MobileServerExecuteResponse> {
    const response = await this.axiosInstance.post<unknown>(
      `${this.opts.url}/mobile/execute`,
      stringifyMobileRequest(body),
      { headers: { 'Content-Type': 'application/json' } },
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
