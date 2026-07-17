import { Hex } from 'viem';

/**
 * A subaccount's claimed identity on the Mobile Identity API.
 */
export interface MobileIdentity {
  subaccount: Hex;
  username: string;
  displayName: string;
  privateMode: boolean;
}

/**
 * A subaccount's public profile, as returned by an unsigned profile lookup.
 */
export interface MobilePublicProfile {
  subaccount: Hex;
  username: string;
  displayName: string;
}

/**
 * Result of a username availability check.
 */
export interface MobileUsernameAvailability {
  username: string;
  available: boolean;
}

/**
 * Common params for signed requests that authenticate as a given subaccount.
 */
export interface MobileSignedRequestParams {
  subaccountOwner: string;
  subaccountName: string;
  chainId: number;
  verifyingAddr: string;
}

/**
 * Params for {@link MobileClient.getUsernameAvailability}.
 */
export interface GetMobileUsernameAvailabilityParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.getPublicProfile}.
 */
export interface GetMobilePublicProfileParams {
  username: string;
}

/**
 * Params for {@link MobileClient.getSelfIdentity}.
 */
export type GetMobileSelfIdentityParams = MobileSignedRequestParams;

/**
 * Params for {@link MobileClient.claimUsername}.
 */
export interface ClaimMobileUsernameParams extends MobileSignedRequestParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.updateUsername}.
 */
export interface UpdateMobileUsernameParams extends MobileSignedRequestParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.setPrivateMode}.
 */
export interface SetMobilePrivateModeParams extends MobileSignedRequestParams {
  privateMode: boolean;
}
