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
 * Success payloads for each signed `execute`, keyed by request `type`. Most execute routes carry no payload
 * beyond the success discriminant and so map to an empty object; `set_follow` returns its post-commit
 * relationship state.
 */
export interface MobileServerExecuteResponseByType {
  set_username: MobileServerEmptyExecuteResponse;
  set_private_mode: MobileServerEmptyExecuteResponse;
  register_expo_token: MobileServerEmptyExecuteResponse;
  set_follow: MobileServerFollowMutationResponse;
}

/**
 * Payload of an execute route that returns nothing beyond the success discriminant. Spelled `Record<never,
 * never>` rather than `Record<string, never>` because the latter's index signature would collapse `status` to
 * `never` when intersected with the success envelope.
 */
export type MobileServerEmptyExecuteResponse = Record<never, never>;

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
