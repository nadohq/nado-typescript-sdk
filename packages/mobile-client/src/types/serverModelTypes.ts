import { BalanceSide } from '@nadohq/shared';
import { Hex } from 'viem';

/**
 * Platform of a device registered for push notifications.
 */
export type MobileNotificationPlatform = 'ios' | 'android';

/**
 * Category of push notification.
 */
export type MobileNotificationCategory =
  | 'order_fill'
  | 'order_update'
  | 'liquidation'
  | 'funding'
  | 'product_listing'
  | 'announcement';

/**
 * Server-side identity summary (snake_case): the read-time identity fields the backend attaches to a
 * subaccount wherever it surfaces one alongside other data. Name fields are `null` until the subaccount
 * claims a username, and a rename shows up on the next read without any change to the surrounding record.
 */
export interface MobileServerIdentitySummary {
  subaccount: Hex;
  username: string | null;
  display_name: string | null;
  /** Reserved for a future avatar source; `null` until one is implemented. */
  avatar_url: string | null;
}

/**
 * Server-side follow summary (snake_case), nested in a `profiles` entry when the `follow_summary` include is
 * requested. `is_following` is the direct `view_as -> this profile` relationship; every `followed_by` entry
 * satisfies both `view_as -> entry` and `entry -> this profile`, so each one is already familiar to the
 * viewer and carries no `is_following` of its own.
 */
export interface MobileServerFollowSummary {
  is_following: boolean;
  /** Exact size of the two-edge intersection, independent of how many previews came back. */
  followed_by_count: number;
  /** Capped at `MOBILE_FOLLOWED_BY_PREVIEW_LIMIT` (2) by the backend; not client-configurable. */
  followed_by: MobileServerIdentitySummary[];
}

/**
 * Server-side public profile shape (snake_case), shared by the singular `profile` and batched `profiles`
 * queries. Name fields are `null` until the subaccount claims a username; a subaccount with no identity row
 * still yields an entry, with `null` names and `private_mode: false`.
 *
 * The three optional fields are omitted from the wire entirely unless the matching `profiles` include asked
 * for them, which is why they are optional rather than nullable — absent means "not requested", not "none".
 * The singular `profile` query never returns any of them.
 */
export interface MobileServerProfile {
  subaccount: Hex;
  username: string | null;
  display_name: string | null;
  private_mode: boolean;
  /**
   * Exact count at query time — the backend counts rather than reading a cached counter. Unnamed and private
   * accounts are included: Private Mode hides activity, not relationships. Requires `follow_counts`.
   */
  follower_count?: number;
  following_count?: number;
  /** Requires the `follow_summary` include, and is relative to that include's `view_as`. */
  follow_summary?: MobileServerFollowSummary;
}

/**
 * Server-side row of a Followers or Following page (snake_case).
 */
export interface MobileServerFollowListAccount {
  identity: MobileServerIdentitySummary;
  /**
   * The `view_as` Viewer's relationship to this account, not the listed relationship that put it in the
   * page, so it is `false` on the Viewer's own row. Omitted entirely when the request named no `view_as`,
   * rather than being sent as a misleading `false`.
   */
  is_following?: boolean;
  /** The listed account's own follower count, exact at query time. */
  follower_count: number;
}

/**
 * Direction of the position a feed trade resulted in — for `closed`, the direction that was closed. This is
 * NOT the execution buy/sell side, which the feed does not expose. Aliases {@link BalanceSide} so the feed's
 * direction values stay in lockstep with the rest of the SDK.
 */
export type MobileFeedTradePositionDirection = BalanceSide;

/**
 * Every {@link MobileFeedTradePositionDirection} the feed can report, for callers that need the values at
 * runtime (validation, filters, UI enumeration).
 */
export const MOBILE_FEED_TRADE_POSITION_DIRECTIONS = [
  'long',
  'short',
] as const satisfies readonly MobileFeedTradePositionDirection[];

/**
 * Every {@link MobileFeedTradePositionEffect} the feed can report, for callers that need the values at
 * runtime (validation, filters, UI enumeration).
 */
export const MOBILE_FEED_TRADE_POSITION_EFFECTS = [
  'opened',
  'increased',
  'reduced',
  'closed',
  'flipped',
] as const;

/**
 * How a feed trade changed the trader's position in the product.
 */
export type MobileFeedTradePositionEffect =
  (typeof MOBILE_FEED_TRADE_POSITION_EFFECTS)[number];

/**
 * Position change of a feed trade. Both keys are single words, so the wire and client shapes are identical
 * and this type is shared by {@link MobileServerFeedTrade} and the client-side `MobileFeedTrade`.
 */
export interface MobileFeedTradePosition {
  direction: MobileFeedTradePositionDirection;
  effect: MobileFeedTradePositionEffect;
}

/**
 * Every {@link MobileFeedMarginMode} the feed can report, for callers that need the values at runtime
 * (validation, filters, UI enumeration).
 */
export const MOBILE_FEED_MARGIN_MODES = ['cross', 'isolated'] as const;

/**
 * Margin mode a feed trade was executed under. Shared by the wire and client margin shapes.
 */
export type MobileFeedMarginMode = (typeof MOBILE_FEED_MARGIN_MODES)[number];

/**
 * Server-side margin of a feed trade. Branch on `mode` — do not infer isolated state from leverage presence:
 * `estimated_leverage` (a rounded whole-number estimate, not exact submitted leverage) is omitted on `cross`,
 * and also omitted inside `isolated` when no estimate is available.
 */
export interface MobileServerFeedMargin {
  mode: MobileFeedMarginMode;
  estimated_leverage?: number;
}

/**
 * Server-side feed trade shape (snake_case): one row per order digest, enriched at read time with the
 * trader's current identity. Amounts are display-oriented human-unit JSON numbers — do not use them for
 * accounting, order construction, or exact threshold decisions.
 */
export interface MobileServerFeedTrade extends MobileServerIdentitySummary {
  /** Order digest this row is keyed by; the stable id clients use to reconcile live pagination. */
  order_digest: Hex;
  product_id: number;
  /** Executed quantity in human units. */
  quantity: number;
  /** Trade notional in whole-dollar human units. */
  notional: number;
  /** Average execution price in human units. */
  average_price: number;
  margin: MobileServerFeedMargin;
  position: MobileFeedTradePosition;
  /** Realized PnL of the trade in human units; can be negative. */
  realized_pnl: number;
  /** Fill time as JavaScript-safe integer Unix milliseconds. */
  filled_at_ms: number;
}

/**
 * Server-side scope limiting a notification category preference. Scopes are rejected by the backend for the
 * MVP (`scopes` must be empty) but are part of the wire format.
 */
export type MobileServerNotificationPreferenceScope =
  | { type: 'subaccount'; subaccount: Hex }
  | { type: 'product'; product_id: number };

/**
 * Server-side per-category notification preference (snake_case).
 */
export interface MobileServerNotificationCategoryPreference {
  category: MobileNotificationCategory;
  enabled: boolean;
  scopes: MobileServerNotificationPreferenceScope[];
}

/**
 * Server-side notification preferences shape (snake_case), used in both the `update_preferences` public
 * execute and the `notification_preferences` public query response.
 */
export interface MobileServerNotificationPreferences {
  /** Only `1` is accepted by the backend for the MVP. */
  schema_version: 1;
  categories: MobileServerNotificationCategoryPreference[];
}
