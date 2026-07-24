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
 * Server-side public profile shape (snake_case).
 */
export interface MobileServerProfile {
  subaccount: Hex;
  username: string;
  display_name: string;
}

/**
 * Server-side identity shape (snake_case) returned by the signed `self_identity` query.
 */
export interface MobileServerIdentity {
  subaccount: Hex;
  username: string;
  display_name: string;
  private_mode: boolean;
}

/**
 * Direction of the position a feed trade resulted in — for `closed`, the direction that was closed. This is
 * NOT the execution buy/sell side, which the feed does not expose. Aliases {@link BalanceSide} so the feed's
 * direction values stay in lockstep with the rest of the SDK.
 */
export type MobileFeedPositionDirection = BalanceSide;

/**
 * How a feed trade changed the trader's position in the product.
 */
export type MobileFeedPositionEffect =
  | 'opened'
  | 'increased'
  | 'reduced'
  | 'closed'
  | 'flipped';

/**
 * Position change of a feed trade. Both keys are single words, so the wire and client shapes are identical
 * and this type is shared by {@link MobileServerFeedTrade} and the client-side `MobileFeedTrade`.
 */
export interface MobileFeedPosition {
  direction: MobileFeedPositionDirection;
  effect: MobileFeedPositionEffect;
}

/**
 * Server-side margin of a feed trade, tagged on `mode`. Branch on `mode` — do not infer isolated state from
 * leverage presence: `estimated_leverage` (a rounded whole-number estimate, not exact submitted leverage) is
 * omitted inside `isolated` when no estimate is available and never appears on `cross`.
 */
export type MobileServerFeedMargin =
  | { mode: 'cross' }
  | { mode: 'isolated'; estimated_leverage?: number };

/**
 * Server-side feed trade shape (snake_case): one row per order digest, enriched at read time with the
 * trader's current identity. Amounts are display-oriented human-unit JSON numbers — do not use them for
 * accounting, order construction, or exact threshold decisions.
 */
export interface MobileServerFeedTrade {
  /** Order digest this row is keyed by; the stable id clients use to reconcile live pagination. */
  order_digest: Hex;
  subaccount: Hex;
  username: string;
  display_name: string;
  /** Reserved for a future avatar source; `null` until one is implemented. */
  avatar_url: string | null;
  product_id: number;
  /** Executed quantity in human units. */
  quantity: number;
  /** Trade notional in whole-dollar human units. */
  notional: number;
  /** Average execution price in human units. */
  average_price: number;
  margin: MobileServerFeedMargin;
  position: MobileFeedPosition;
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
 * Server-side notification preferences shape (snake_case), used in both the `update_preferences` execute and
 * the `notification_preferences` query response.
 */
export interface MobileServerNotificationPreferences {
  /** Only `1` is accepted by the backend for the MVP. */
  schema_version: 1;
  categories: MobileServerNotificationCategoryPreference[];
}

/**
 * Server-side registered push device shape (snake_case).
 */
export interface MobileServerRegisteredDevice {
  platform: MobileNotificationPlatform;
  locale: string | null;
  app_version: string | null;
  token_fingerprint_prefix: string;
  last_seen_at: number;
}
