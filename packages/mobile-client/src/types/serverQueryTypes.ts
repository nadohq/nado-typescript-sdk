import {
  MobileServerPublicQueryParamsByType,
  MobileServerPublicQueryType,
  MobileServerSuccessResponse,
} from './serverBaseTypes';
import {
  MobileServerFeedTrade,
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
 * Request body for the `feed` public query.
 */
export type MobileServerFeedRequest = MobileServerPublicQueryRequest<'feed'>;

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
 * Successful response for the `feed` public query. `next_cursor` is `null` when there was no additional
 * candidate at query time; a page may contain fewer than `limit` trades (or none) with a non-null cursor
 * because invalid enrichment rows are omitted and pagination is live rather than snapshot.
 */
export type MobileServerFeedResponse = MobileServerSuccessResponse<{
  trades: MobileServerFeedTrade[];
  next_cursor: string | null;
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

/**
 * Successful responses for each unsigned `public_query`, keyed by request `type`. Counterpart to
 * {@link MobileServerPublicQueryParamsByType} so a query's request params and response share one lookup,
 * matching the `*QueryResponseByType` convention used by the engine, indexer, and trigger clients.
 */
export interface MobileServerPublicQueryResponseByType {
  username_availability: MobileServerUsernameAvailabilityResponse;
  profile: MobileServerProfileResponse;
  feed: MobileServerFeedResponse;
}

/**
 * Successful responses for each signed `query`, keyed by request `type`. Signed queries carry no params
 * beyond the signed envelope, so this response lookup — not a params map — is the counterpart to
 * {@link MobileServerPublicQueryResponseByType} for the authenticated `query` route.
 */
export interface MobileServerSignedQueryResponseByType {
  self_identity: MobileServerSelfIdentityResponse;
  notification_preferences: MobileServerNotificationPreferencesResponse;
  registered_devices: MobileServerRegisteredDevicesResponse;
}

/**
 * Discriminant `type` values for signed `query` requests: the read-only subset of {@link MobileSignedInner}
 * tags, keyed the same way as {@link MobileServerPublicQueryType}.
 */
export type MobileServerSignedQueryType =
  keyof MobileServerSignedQueryResponseByType;
