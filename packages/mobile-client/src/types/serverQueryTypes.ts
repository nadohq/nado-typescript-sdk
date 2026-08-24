import { Hex } from 'viem';
import { MobileServerSuccessResponse } from './serverBaseTypes';
import {
  MobileNotificationPlatform,
  MobileServerFeedTrade,
  MobileServerFollowListAccount,
  MobileServerNotificationPreferences,
  MobileServerProfile,
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
 * Payload of the `profiles` public query success response. One entry per requested subaccount, in the exact
 * order they were requested, so callers can correlate positionally as well as by `subaccount`.
 */
export interface MobileServerProfilesResponse {
  profiles: MobileServerProfile[];
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
 * Payload of the `notification_preferences` public query success response.
 */
export interface MobileServerNotificationPreferencesResponse {
  preferences: MobileServerNotificationPreferences;
}

/**
 * Payload of the `registered_wallet` public query success response. Inlined into the envelope rather than
 * nested under a key, matching the backend's `RegisteredWalletResponse`.
 */
export interface MobileServerRegisteredWalletResponse {
  wallet: Hex;
  platform: MobileNotificationPlatform;
  locale: string | null;
  app_version: string | null;
  token_fingerprint_prefix: string;
  last_seen_at: number;
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
  profiles: MobileServerProfilesResponse;
  feed: MobileServerFeedResponse;
  notification_preferences: MobileServerNotificationPreferencesResponse;
  registered_wallet: MobileServerRegisteredWalletResponse;
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
 * Payload of the `followers` and `following` signed query success responses. Both list directions share one
 * shape; only the relationship that selected the rows differs.
 */
export interface MobileServerFollowListResponse {
  accounts: MobileServerFollowListAccount[];
  /** `null` means the list is complete. */
  next_cursor: string | null;
}

/**
 * Success payloads for each signed `query`, keyed by request `type` — the signed counterpart to
 * {@link MobileServerPublicQueryResponseByType}.
 */
export interface MobileServerSignedQueryResponseByType {
  followers: MobileServerFollowListResponse;
  following: MobileServerFollowListResponse;
}

/**
 * Full success response for a signed `query`: the {@link MobileServerSuccessResponse} envelope with the
 * query's payload inlined alongside `status`.
 */
export type MobileServerSignedQuerySuccessResponse<
  T extends MobileServerSignedQueryRequestType =
    MobileServerSignedQueryRequestType,
> = MobileServerSuccessResponse & MobileServerSignedQueryResponseByType[T];
