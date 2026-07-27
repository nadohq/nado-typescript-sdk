import { MobileServerSuccessResponse } from './serverBaseTypes';
import {
  MobileServerFeedTrade,
  MobileServerIdentity,
  MobileServerNotificationPreferences,
  MobileServerProfile,
  MobileServerRegisteredDevice,
} from './serverModelTypes';
import {
  MobileServerPublicQueryRequestByType,
  MobileServerPublicQueryRequestType,
  MobileServerSignedQueryRequestType,
} from './serverRequestTypes';

/**
 * Unsigned `public_query` request body: a `type` discriminant flattened with its params.
 */
export type MobileServerPublicQueryRequest<
  T extends MobileServerPublicQueryRequestType =
    MobileServerPublicQueryRequestType,
> = {
  [K in MobileServerPublicQueryRequestType]: {
    type: K;
  } & MobileServerPublicQueryRequestByType[K];
}[T];

/**
 * Payload of the `username_availability` public query success response.
 */
export interface MobileServerUsernameAvailabilityResponse {
  username: string;
  available: boolean;
}

/**
 * Payload of the `profile` public query success response.
 */
export interface MobileServerProfileResponse {
  profile: MobileServerProfile;
}

/**
 * Payload of the `feed` public query success response.
 */
export interface MobileServerFeedResponse {
  trades: MobileServerFeedTrade[];
  /**
   * `null` when there was no additional candidate at query time; a page may contain fewer than `limit` trades
   * (or none) with a non-null cursor because invalid enrichment rows are omitted and pagination is live
   * rather than snapshot.
   */
  next_cursor: string | null;
}

/**
 * Payload of the signed `self_identity` query success response. A `null` identity means the subaccount has
 * not claimed a username yet — this is normal data, not an error.
 */
export interface MobileServerSelfIdentityResponse {
  identity: MobileServerIdentity | null;
}

/**
 * Payload of the signed `notification_preferences` query success response.
 */
export interface MobileServerNotificationPreferencesResponse {
  preferences: MobileServerNotificationPreferences;
}

/**
 * Payload of the signed `registered_devices` query success response.
 */
export interface MobileServerRegisteredDevicesResponse {
  devices: MobileServerRegisteredDevice[];
}

/**
 * Success payloads for each unsigned `public_query`, keyed by request `type`. Counterpart to
 * {@link MobileServerPublicQueryRequestByType} so a query's request params and response share one lookup,
 * matching engine's `EngineServerQueryResponseByType`. Holds the unwrapped payload; the envelope is applied
 * by {@link MobileServerPublicQuerySuccessResponse}.
 */
export interface MobileServerPublicQueryResponseByType {
  username_availability: MobileServerUsernameAvailabilityResponse;
  profile: MobileServerProfileResponse;
  feed: MobileServerFeedResponse;
}

/**
 * Success payloads for each signed `query`, keyed by request `type`. Counterpart to
 * {@link MobileServerSignedQueryRequestByType} so a signed query's request params and response share one
 * lookup, matching the public route. Holds the unwrapped payload; the envelope is applied by
 * {@link MobileServerSignedQuerySuccessResponse}.
 */
export interface MobileServerSignedQueryResponseByType {
  self_identity: MobileServerSelfIdentityResponse;
  notification_preferences: MobileServerNotificationPreferencesResponse;
  registered_devices: MobileServerRegisteredDevicesResponse;
}

/**
 * Full success response for an unsigned `public_query`: the {@link MobileServerSuccessResponse} envelope with
 * the query's payload inlined alongside `status`. Derived from {@link MobileServerPublicQueryResponseByType},
 * mirroring engine's `EngineServerQuerySuccessResponse` (inlined here instead of nested under `data`).
 */
export type MobileServerPublicQuerySuccessResponse<
  T extends MobileServerPublicQueryRequestType =
    MobileServerPublicQueryRequestType,
> = MobileServerSuccessResponse & MobileServerPublicQueryResponseByType[T];

/**
 * Full success response for a signed `query`: the {@link MobileServerSuccessResponse} envelope with the
 * query's payload inlined alongside `status`. Derived from {@link MobileServerSignedQueryResponseByType}.
 */
export type MobileServerSignedQuerySuccessResponse<
  T extends MobileServerSignedQueryRequestType =
    MobileServerSignedQueryRequestType,
> = MobileServerSuccessResponse & MobileServerSignedQueryResponseByType[T];
