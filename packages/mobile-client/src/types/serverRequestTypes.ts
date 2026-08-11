import { Hex } from 'viem';
import { MobileSignedInner } from '../signing/types';
import { MobileServerNotificationPreferences } from './serverModelTypes';

/**
 * Params for each unsigned `public_query`, keyed by request `type`.
 */
export interface MobileServerPublicQueryRequestByType {
  username_availability: { display_name: string };
  profile: { subaccount: Hex };
  feed: {
    /**
     * Minimum notional as a whole-dollar JSON integer (NOT an x18 string), at least $1,000. Omitted or
     * `null` means unfiltered.
     */
    minimum_notional?: number;
    /** Page size, 1–50; the backend defaults to `MOBILE_FEED_MAX_PAGE_SIZE` (50) when omitted. */
    limit?: number;
    /**
     * Opaque keyset cursor from a prior page's `next_cursor`. Bound to the exact `minimum_notional` it was
     * issued for (including the unfiltered state) — reusing it with a different filter fails.
     */
    cursor?: string;
  };
  notification_preferences: { expo_token: string };
  registered_wallet: { expo_token: string };
}

/**
 * Discriminant `type` values for unsigned `public_query` requests.
 */
export type MobileServerPublicQueryRequestType =
  keyof MobileServerPublicQueryRequestByType;

/**
 * Params for each unsigned `public_execute`, keyed by request `type`. Possession of an active Expo push token
 * authorizes these notification-only mutations: the backend resolves the token's owning wallet and mutates
 * its state, so no signature, sender, or nonce is sent. Ordering is the backend's last-write-wins commit
 * order, so callers must serialize their own writes.
 */
export interface MobileServerPublicExecuteRequestByType {
  unregister_expo_token: { expo_token: string };
  update_preferences: {
    expo_token: string;
    preferences: MobileServerNotificationPreferences;
  };
}

/**
 * Discriminant `type` values for unsigned `public_execute` requests.
 */
export type MobileServerPublicExecuteRequestType =
  keyof MobileServerPublicExecuteRequestByType;

/**
 * Params for each signed `query`, keyed by request `type`. These queries identify the caller through the
 * signed envelope (`sender`) and take no further params, so every entry is empty — the signed counterpart to
 * {@link MobileServerPublicQueryRequestByType}, kept so both query routes expose one params lookup keyed by
 * type (matching engine's `EngineServerQueryRequestByType`, which likewise uses `Record<string, never>` for
 * param-less queries).
 */
export interface MobileServerSignedQueryRequestByType {
  self_identity: Record<string, never>;
}

/**
 * Discriminant `type` values for signed `query` requests: the read-only subset of {@link MobileSignedInner}
 * tags, keyed the same way as {@link MobileServerPublicQueryRequestType}.
 */
export type MobileServerSignedQueryRequestType =
  keyof MobileServerSignedQueryRequestByType;

/**
 * Discriminant `type` values for signed `execute` requests: the write subset of {@link MobileSignedInner}
 * tags, derived as everything that is not a signed query so the two routes cannot overlap or drift.
 */
export type MobileServerExecuteRequestType = Exclude<
  MobileSignedInner['type'],
  MobileServerSignedQueryRequestType
>;

/**
 * Wire `request_type` the backend echoes on failure envelopes, prefixed by the route that produced it:
 * `public_query_*` for unsigned queries, `public_execute_*` for unsigned writes, `query_*` for signed
 * queries, and `execute_*` for signed writes (e.g. `execute_set_username`).
 */
export type MobileServerRequestType =
  | `public_query_${MobileServerPublicQueryRequestType}`
  | `public_execute_${MobileServerPublicExecuteRequestType}`
  | `query_${MobileServerSignedQueryRequestType}`
  | `execute_${MobileServerExecuteRequestType}`;
