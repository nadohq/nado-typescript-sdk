import { Hex } from 'viem';

/**
 * A subaccount's claimed identity on the Mobile Identity API.
 */
export interface Identity {
  subaccount: Hex;
  username: string;
  displayName: string;
  privateMode: boolean;
}

/**
 * A subaccount's public profile, as returned by an unsigned profile lookup.
 */
export interface PublicProfile {
  subaccount: Hex;
  username: string;
  displayName: string;
}

/**
 * Result of a username availability check.
 */
export interface UsernameAvailability {
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
export interface GetUsernameAvailabilityParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.getPublicProfile}.
 */
export interface GetPublicProfileParams {
  username: string;
}

/**
 * Params for {@link MobileClient.getSelfIdentity}.
 */
export type GetSelfIdentityParams = MobileSignedRequestParams;

/**
 * Params for {@link MobileClient.claimUsername}.
 */
export interface ClaimUsernameParams extends MobileSignedRequestParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.updateUsername}.
 */
export interface UpdateUsernameParams extends MobileSignedRequestParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.setPrivateMode}.
 */
export interface SetPrivateModeParams extends MobileSignedRequestParams {
  privateMode: boolean;
}
