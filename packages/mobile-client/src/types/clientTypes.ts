import { Hex } from 'viem';
import {
  MobileNotificationCategory,
  MobileNotificationPlatform,
} from './serverTypes';

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
 * Scope limiting a notification category preference. Scopes are part of the wire format but rejected by the
 * backend for the MVP — `scopes` must be empty.
 */
export type MobilePreferenceScope =
  | { type: 'subaccount'; subaccount: Hex }
  | { type: 'product'; productId: number };

/**
 * A per-category push notification preference.
 */
export interface MobileCategoryPreference {
  category: MobileNotificationCategory;
  enabled: boolean;
  scopes: MobilePreferenceScope[];
}

/**
 * A wallet's push notification preferences. The backend requires exactly one entry per known category and
 * `schemaVersion` of 1.
 */
export interface MobileNotificationPreferences {
  schemaVersion: number;
  categories: MobileCategoryPreference[];
}

/**
 * A device registered for push notifications.
 */
export interface MobileRegisteredDevice {
  platform: MobileNotificationPlatform;
  locale: string | null;
  appVersion: string | null;
  tokenFingerprintPrefix: string;
  /**
   * Unix timestamp (milliseconds) of the device's last registration refresh.
   */
  lastSeenAt: number;
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

/**
 * Params for {@link MobileClient.registerExpoToken}.
 */
export interface RegisterMobileExpoTokenParams extends MobileSignedRequestParams {
  /**
   * Expo push token, e.g. `ExponentPushToken[...]`.
   */
  expoToken: string;
  platform: MobileNotificationPlatform;
  /**
   * BCP-47 locale tag, max 35 chars.
   */
  locale?: string;
  /**
   * App version string, max 64 chars.
   */
  appVersion?: string;
}

/**
 * Params for {@link MobileClient.unregisterExpoToken}.
 */
export interface UnregisterMobileExpoTokenParams extends MobileSignedRequestParams {
  expoToken: string;
}

/**
 * Params for {@link MobileClient.updateNotificationPreferences}.
 */
export interface UpdateMobileNotificationPreferencesParams extends MobileSignedRequestParams {
  preferences: MobileNotificationPreferences;
}

/**
 * Params for {@link MobileClient.getNotificationPreferences}.
 */
export type GetMobileNotificationPreferencesParams = MobileSignedRequestParams;

/**
 * Params for {@link MobileClient.getRegisteredDevices}.
 */
export type GetMobileRegisteredDevicesParams = MobileSignedRequestParams;
