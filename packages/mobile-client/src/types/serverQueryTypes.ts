import {
  MobileServerPublicQueryParamsByType,
  MobileServerPublicQueryType,
  MobileServerSuccessResponse,
} from './serverBaseTypes';
import {
  MobileServerIdentity,
  MobileServerNotificationPreferences,
  MobileServerProfile,
  MobileServerRegisteredDevice,
} from './serverModelTypes';

/**
 * Unsigned `public_query` request body: a `type` discriminant flattened with its params.
 */
export type MobileServerPublicQueryRequest<
  T extends MobileServerPublicQueryType = MobileServerPublicQueryType,
> = {
  [K in MobileServerPublicQueryType]: {
    type: K;
  } & MobileServerPublicQueryParamsByType[K];
}[T];

/**
 * Request body for the `username_availability` public query.
 */
export type MobileServerUsernameAvailabilityRequest =
  MobileServerPublicQueryRequest<'username_availability'>;

/**
 * Request body for the `profile` public query.
 */
export type MobileServerProfileRequest =
  MobileServerPublicQueryRequest<'profile'>;

/**
 * Successful response for the `username_availability` public query.
 */
export type MobileServerUsernameAvailabilityResponse =
  MobileServerSuccessResponse<{
    username: string;
    available: boolean;
  }>;

/**
 * Successful response for the `profile` public query.
 */
export type MobileServerProfileResponse = MobileServerSuccessResponse<{
  profile: MobileServerProfile;
}>;

/**
 * Successful response for the signed `self_identity` query. A `null` identity means the subaccount has not
 * claimed a username yet — this is normal data, not an error.
 */
export type MobileServerSelfIdentityResponse = MobileServerSuccessResponse<{
  identity: MobileServerIdentity | null;
}>;

/**
 * Successful response for the signed `notification_preferences` query.
 */
export type MobileServerNotificationPreferencesResponse =
  MobileServerSuccessResponse<{
    preferences: MobileServerNotificationPreferences;
  }>;

/**
 * Successful response for the signed `registered_devices` query.
 */
export type MobileServerRegisteredDevicesResponse =
  MobileServerSuccessResponse<{
    devices: MobileServerRegisteredDevice[];
  }>;
