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
 * Discriminant `type` values for signed `query` requests: the read-only subset of {@link MobileSignedInner}
 * tags. Unlike the public queries, these carry no separate params map — a signed request body *is* its inner
 * payload flattened with the envelope, so {@link MobileSignedInner} is the single source of truth for both
 * the fields and their significant order.
 */
export type MobileServerSignedQueryRequestType =
  | 'follow_summary'
  | 'followers'
  | 'following';

/**
 * Discriminant `type` values for signed `execute` requests: the write subset of {@link MobileSignedInner}
 * tags, i.e. everything that is not a signed query.
 */
export type MobileServerExecuteRequestType = Exclude<
  MobileSignedInner['type'],
  MobileServerSignedQueryRequestType
>;

/**
 * Wire `request_type` the backend echoes on failure envelopes, prefixed by the route that produced it:
 * `public_query_*` for unsigned queries, `public_execute_*` for unsigned writes, `execute_*` for signed
 * writes (e.g. `execute_set_username`), and `query_*` for signed reads (e.g. `query_followers`). The prefix
 * names the route, so it never carries the `mobile:` prefix that the EIP-712 method does.
 */
export type MobileServerRequestType =
  | `public_query_${MobileServerPublicQueryRequestType}`
  | `public_execute_${MobileServerPublicExecuteRequestType}`
  | `execute_${MobileServerExecuteRequestType}`
  | `query_${MobileServerSignedQueryRequestType}`;
