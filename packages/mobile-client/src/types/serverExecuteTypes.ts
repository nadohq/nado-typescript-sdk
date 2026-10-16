import { Hex } from 'viem';
import {
  MobileServerFailureResponse,
  MobileServerSuccessResponse,
} from './serverBaseTypes';
import {
  MobileServerExecuteRequestType,
  MobileServerPublicExecuteRequestByType,
  MobileServerPublicExecuteRequestType,
} from './serverRequestTypes';

/**
 * Unsigned `public_execute` request body: a `type` discriminant flattened with its params, mirroring
 * {@link MobileServerPublicQueryRequest}.
 */
export type MobileServerPublicExecuteRequest<
  T extends MobileServerPublicExecuteRequestType =
    MobileServerPublicExecuteRequestType,
> = {
  [K in MobileServerPublicExecuteRequestType]: {
    type: K;
  } & MobileServerPublicExecuteRequestByType[K];
}[T];

/**
 * Payload the `set_follow` execute returns alongside the success envelope. The mutation and the count commit
 * in one database transaction, so these are the authoritative post-mutation values — prefer them over
 * re-reading, and note that overlapping toggles for the same pair can respond out of arrival order.
 */
export interface MobileServerFollowMutationResponse {
  is_following: boolean;
  /** The *target's* follower count after the mutation, not the sender's. */
  follower_count: number;
}

/**
 * One target's post-commit state in a `set_follow_batch` response.
 */
export interface MobileServerFollowBatchResultItem {
  /** The requested target, as lowercase hex. */
  subaccount: Hex;
  is_following: boolean;
  /** The *target's* follower count after the batch, not the sender's. */
  follower_count: number;
}

/**
 * Payload the `set_follow_batch` execute returns alongside the success envelope: one result per target, in
 * request order. Every write and count runs in one database transaction, so the batch either fully applies or
 * changes nothing, and these values are authoritative post-commit state.
 */
export interface MobileServerFollowBatchResponse {
  results: MobileServerFollowBatchResultItem[];
}

/**
 * Payload of an execute route that returns nothing beyond the success discriminant. Spelled `Record<never,
 * never>` rather than `Record<string, never>` because the latter's index signature would collapse `status` to
 * `never` when intersected with the success envelope.
 */
export type MobileServerEmptyExecuteResponse = Record<never, never>;

/**
 * Temporary upload grant returned by `create_avatar_upload`; publishing requires a subsequent `set_avatar`.
 */
export interface MobileServerAvatarUploadResponse {
  /** Server-owned staging object key. */
  upload_key: string;
  /** Short-lived signed PUT URL. */
  upload_url: string;
  /** Headers required by the signed PUT. */
  headers: Record<string, string>;
  /** Upload URL lifetime in seconds from issuance. */
  expires_in_seconds: number;
}

/**
 * Success payloads for each signed `execute`, keyed by request `type`. Most execute routes carry no payload
 * beyond the success discriminant and so map to an empty object; `set_follow` and `set_follow_batch` return
 * their post-commit relationship state, and `create_avatar_upload` returns a temporary upload grant.
 */
export interface MobileServerExecuteResponseByType {
  /** Bio writes return only the success envelope. */
  set_bio: MobileServerEmptyExecuteResponse;
  /** Avatar writes return only the success envelope. */
  set_avatar: MobileServerEmptyExecuteResponse;
  /** Temporary upload grant; publishing requires a subsequent set_avatar call. */
  create_avatar_upload: MobileServerAvatarUploadResponse;
  set_username: MobileServerEmptyExecuteResponse;
  set_private_mode: MobileServerEmptyExecuteResponse;
  register_expo_token: MobileServerEmptyExecuteResponse;
  set_follow: MobileServerFollowMutationResponse;
  set_follow_batch: MobileServerFollowBatchResponse;
}

/**
 * Full success response for a signed `execute`: the {@link MobileServerSuccessResponse} envelope with the
 * route's payload inlined alongside `status`, matching how the query routes inline theirs.
 */
export type MobileServerExecuteSuccessResponse<
  T extends MobileServerExecuteRequestType = MobileServerExecuteRequestType,
> = MobileServerSuccessResponse & MobileServerExecuteResponseByType[T];

/**
 * Discriminated `execute` result union used at the transport boundary, before the envelope is narrowed.
 */
export type MobileServerExecuteResult =
  | MobileServerSuccessResponse
  | MobileServerFailureResponse;
