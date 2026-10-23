import { Hex } from 'viem';
import {
  MobileServerFailureResponse,
  MobileServerSuccessResponse,
} from './serverBaseTypes';
import {
  MobileServerSocialFeedAuthor,
  MobileServerSocialFeedDrawing,
  MobileServerSocialFeedImage,
  MobileServerSocialFeedItem,
  MobileServerSocialFeedReply,
} from './serverModelTypes';
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
 * Success payloads for each signed `execute`, keyed by request `type`. Mutations return either the success
 * envelope alone or authoritative post-commit state; avatar upload creation returns a temporary grant.
 */
/** Ready image returned by a direct multipart upload. */
export interface MobileServerSocialFeedImageUploadResponse {
  /** Ready image metadata, including original and thumbnail paths. */
  image: MobileServerSocialFeedImage;
}

export interface MobileServerExecuteResponseByType {
  /** Published or idempotently recovered item. */
  create_feed_post: MobileServerSocialFeedPostResponse;
  /** Atomically published reply and updated count. */
  create_feed_comment: MobileServerSocialFeedCommentResponse;
  /** Direct post-image upload; the image is ready immediately. */
  create_feed_post_image_uploads: MobileServerSocialFeedImageUploadResponse;
  /** Direct comment-image upload; the image is ready immediately. */
  create_feed_comment_image_uploads: MobileServerSocialFeedImageUploadResponse;
  /** First attached drawing. */
  create_feed_chart_drawing: MobileServerSocialFeedDrawingMutationResponse;
  /** Replaced or idempotently recovered drawing. */
  update_feed_chart_drawing: MobileServerSocialFeedDrawingMutationResponse;
  /** Post-mutation like state. */
  set_feed_like: MobileServerSocialFeedLikeResponse;
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

/** Atomic publication success; unlike feed_item, this does not issue a read session. */
export interface MobileServerSocialFeedPostResponse {
  /** Published item. */
  item: MobileServerSocialFeedItem;
}

/** Atomic reply publication and authoritative root count. */
export interface MobileServerSocialFeedCommentResponse {
  /** Published reply. */
  comment: MobileServerSocialFeedReply;
  /** Post-commit root count. */
  root_comment_count: number;
}

/** Successful drawing mutation always returns a saved drawing. */
export interface MobileServerSocialFeedDrawingMutationResponse {
  /** Parent UUID. */
  item_id: string;
  /** Display version. */
  item_version: string;
  /** Saved parsed drawing. */
  drawing: MobileServerSocialFeedDrawing;
}

/** Authoritative like state after the mutation. */
export interface MobileServerSocialFeedLikeResponse {
  /** Item UUID. */
  item_id: string;
  /** Applied relationship state. */
  is_liked: boolean;
  /** Post-mutation count. */
  like_count: number;
  /** Display version. */
  version: string;
}

/** Exposure counts deduplicated by browsing credential, item, and UTC day. */
export interface MobileServerSocialFeedViewsResponse {
  /** Newly counted items. */
  accepted_item_ids: string[];
  /** Already counted items. */
  duplicate_item_ids: string[];
}

/** Page lease result; this response does not carry as_of_ms. */
export interface MobileServerSocialFeedPresenceResponse {
  /** Active visitor count. */
  watcher_count: number;
  /** Self-reported public account previews. */
  watcher_preview: MobileServerSocialFeedAuthor[];
  /** Recommended heartbeat interval. */
  heartbeat_interval_seconds: number;
  /** Lease lifetime, bounded by the reading session. */
  expires_in_seconds: number;
}

/** Response payloads for unsigned writes. */
export interface MobileServerPublicExecuteResponseByType {
  /** Token removal returns only the success envelope. */
  unregister_expo_token: MobileServerEmptyExecuteResponse;
  /** Preference updates return only the success envelope. */
  update_preferences: MobileServerEmptyExecuteResponse;
  /** Exposure deduplication result. */
  record_feed_views: MobileServerSocialFeedViewsResponse;
  /** Page lease result. */
  position_presence: MobileServerSocialFeedPresenceResponse;
}

/** Full success response for an unsigned write. */
export type MobileServerPublicExecuteSuccessResponse<
  T extends MobileServerPublicExecuteRequestType =
    MobileServerPublicExecuteRequestType,
> = MobileServerSuccessResponse & MobileServerPublicExecuteResponseByType[T];
