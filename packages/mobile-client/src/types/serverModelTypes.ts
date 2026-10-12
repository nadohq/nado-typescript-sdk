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

/** Content filters accepted by the six social feed lists. Empty or omitted means all. */
export type MobileSocialFeedType =
  | 'open'
  | 'close'
  | 'size_change'
  | 'thoughts'
  | 'analysis'
  | 'comments';

/** Market category used by the social feed. */
export type MobileFeedMarketCategory = 'crypto' | 'finance';

/** Common list fields, in signed MessagePack order. */
export interface MobileServerSocialFeedListParams {
  /** OR-ed content filters; combined with other filters using AND. */
  feed_types?: MobileSocialFeedType[];
  /** Strict lower bound in whole dollars, 1 through Number.MAX_SAFE_INTEGER. */
  minimum_notional?: number;
  /** Page size, 1–50; defaults to 20. */
  limit?: number;
  /** Fixed 15-minute reading session; required with cursor. */
  session_id?: string;
  /** Opaque pagination cursor, distinct from update_cursor and watermark. */
  cursor?: string;
}

/** List fields for main feeds and author feeds. */
export interface MobileServerCategorizedFeedParams extends MobileServerSocialFeedListParams {
  /** Omit to read all market categories. Encoded before the common list fields. */
  market_category?: MobileFeedMarketCategory;
}

/** Official account-level 30-day PnL badge, independent of position PnL. */
export interface MobileServerTraderBadge {
  /** Qualification tier. */
  code: 'shark' | 'whale';
  /** Signed integer in x18 units. */
  pnl_x18: string;
  /** Stable compatibility identifier for the official Portfolio month result. */
  metric_key: 'account_pnl_30d_equity';
  /** PnL window label. */
  window: '30d';
  /** Official source timestamp in Unix milliseconds. */
  source_as_of_ms: number;
  /** Fetch completion timestamp in Unix milliseconds. */
  fetched_at_ms: number;
  /** Qualification snapshot UUID. */
  snapshot_id: string;
}

/** Public author identity and the selected viewing account's follow state. */
export interface MobileServerFeedAuthor {
  /** Full identity subaccount. */
  subaccount: Hex;
  /** Null for an unclaimed identity. */
  username: string | null;
  /** Null for an unclaimed identity. */
  display_name: string | null;
  /** Avatar URL when available. */
  avatar_url: string | null;
  /** Public view_as or signed sender's follow state; null without a viewing account. */
  is_following: boolean | null;
  /** Null when no qualifying badge is available. */
  trader_badge: MobileServerTraderBadge | null;
  /** Stale means the last successful cohort is used after a refresh failure. */
  trader_data_status: 'ready' | 'stale' | 'unavailable';
}

/** Market metadata from the service's authoritative market source. */
export interface MobileServerFeedMarket {
  /** Market product ID. */
  product_id: number;
  /** Market symbol. */
  symbol: string;
  /** Logo URL when available. */
  logo_url: string | null;
  /** Social feed category when known. */
  category: MobileFeedMarketCategory | null;
  /** Original market categories. */
  source_categories: Array<'crypto' | 'stocks' | 'forex' | 'commodities'>;
}

/** Leverage display value; unknown isolated leverage differs from inapplicable cross leverage. */
export interface MobileServerFeedLeverage {
  /** Rounded whole-number string, or null. Never an estimated replacement. */
  value: string | null;
  /** Cross margin uses not_applicable. */
  basis: 'effective' | 'unknown' | 'not_applicable';
}

/** Position PnL with explicit accounting basis and data quality. */
export interface MobileServerFeedPnl {
  /** Signed x18 integer; null means unknown, not zero. */
  amount_x18: string | null;
  /** Open positions exclude fees/funding; closed results include them. */
  basis: 'unrealized_excl_fees_funding' | 'realized_incl_fees_funding';
  /** Closed positions use frozen results. */
  mode: 'live' | 'frozen';
  /** Source timestamp in Unix milliseconds. */
  as_of_ms: number;
  /** Whether accounting is complete, pending, or unavailable. */
  quality: 'ready' | 'pending' | 'unavailable';
}

/** Complete mutable position fields delivered together at one version. */
export interface MobileServerFeedPositionPatch {
  /** Position lifecycle UUID. */
  position_id: string;
  /** Positive integer string; compare as integers without Number conversion. */
  position_version: string;
  /** Position state timestamp in Unix milliseconds. */
  state_as_of_ms: number;
  /** Remaining average entry cost, frozen on close; x18 or null. */
  entry_price_x18: string | null;
  /** Basis of the displayed size and entry price. */
  display_basis: 'current_position' | 'closing_snapshot';
  /** Closing snapshot reference time, or null. */
  snapshot_at_ms: number | null;
  /** Absolute quantity in x18 units. */
  quantity_x18: string;
  /** Notional value in x18 units. */
  notional_x18: string;
  /** Current lifecycle state. */
  state: 'open' | 'closed';
  /** Completeness of the available historical facts. */
  history_quality: 'complete' | 'partial';
  /** Margin mode. */
  margin_mode: 'cross' | 'isolated';
  /** Current or closing leverage. */
  leverage: MobileServerFeedLeverage;
  /** Leverage reference time; null when unknown or inapplicable. */
  leverage_at_ms: number | null;
  /** Current remaining PnL or the closed lifecycle's net result. */
  pnl: MobileServerFeedPnl;
}

/** Position displayed inside an automatic trade card. */
export interface MobileServerFeedPositionCard extends MobileServerFeedPositionPatch {
  /** Market product ID. */
  product_id: number;
  /** Market display metadata. */
  market: MobileServerFeedMarket;
  /** Position direction. */
  direction: 'long' | 'short';
}

/** Interaction counters; interaction writes are not currently available. */
export interface MobileServerFeedInteraction {
  /** Number of likes. */
  like_count: number;
  /** Number of comments. */
  comment_count: number;
  /** Number of recorded views. */
  view_count: number;
  /** Null while likes are unavailable, including with a viewing account or signature. */
  liked_by_me: boolean | null;
}

/** Metadata shared by the automatic trade cards and rows available from the social feed. */
export interface MobileServerSocialFeedItemBase {
  /** Item UUID. */
  id: string;
  /** Whether authored analysis exists. */
  has_analysis: boolean;
  /** Drawings are not currently available. */
  drawing: null;
  /** Author identity, badge, and follow perspective. */
  author: MobileServerFeedAuthor;
  /** Creation time in Unix milliseconds. */
  created_at_ms: number;
  /** Sorting time in Unix milliseconds. */
  display_at_ms: number;
  /** Positive integer version string. */
  version: string;
  /** Market metadata. */
  market: MobileServerFeedMarket;
  /** Server capability flags; currently all false. */
  capabilities: {
    /** Whether liking is available. */
    can_like: boolean;
    /** Whether commenting is available. */
    can_comment: boolean;
    /** Whether exposure recording is available. */
    can_record_view: boolean;
  };
}

/** Automatic trade card returned by the social feed. */
export interface MobileServerSocialTradeCard extends MobileServerSocialFeedItemBase {
  /** Card discriminant. */
  kind: 'trade_card';
  /** Trading action. */
  action: 'opened' | 'closed' | 'increased' | 'reduced';
  /** Card text, empty for automatic cards. */
  text: string;
  /** Automatic cards have no mentions. */
  mentions: never[];
  /** Current or frozen position display. */
  position: MobileServerFeedPositionCard;
  /** Interaction counters. */
  interaction: MobileServerFeedInteraction;
  /** Comment content is not currently available. */
  comment_preview: {
    /** Currently empty. */
    items: never[];
    /** Comment count. */
    total_count: number;
    /** Comment cursor, if available. */
    next_cursor: string | null;
  };
}

/** Fields shared by size-change and liquidation trade rows. */
export interface MobileServerSocialTradeRowBase extends MobileServerSocialFeedItemBase {
  /** Row discriminant. */
  kind: 'trade_row';
  /** Associated lifecycle UUID. */
  position_id: string;
  /** Position direction. */
  direction: 'long' | 'short';
  /** Historical margin mode. */
  margin_mode: 'cross' | 'isolated';
  /** Historical action leverage, not the position's current leverage. */
  leverage: MobileServerFeedLeverage;
  /** Historical leverage reference time. */
  leverage_at_ms: number | null;
  /** Number of aggregated trades. */
  trade_count: number;
  /** Absolute traded quantity in x18 units. */
  quantity_x18: string;
  /** Actual execution price in x18 units, never an Oracle substitution. */
  average_price_x18: string | null;
}

/** A size-change row or liquidation row with independently nullable financial facts. */
export type MobileServerSocialTradeRow = MobileServerSocialTradeRowBase &
  (
    | {
        /** Ordinary size-change action. */
        action: 'increased' | 'reduced';
        /** Executed notional in x18 units. */
        notional_x18: string;
      }
    | {
        /** Liquidation discriminant. */
        action: 'liquidated';
        /** Quantity times event Oracle; null if that Oracle is unknown. */
        notional_x18: string | null;
        /** Entry cost immediately before the event, in x18 units. */
        entry_price_x18: string | null;
        /** Event Oracle used for display and size filtering. */
        liquidation_oracle_price_x18: string | null;
        /** Actual execution price, independent of Oracle. */
        liquidation_execution_price_x18: string | null;
        /** Signed action PnL excluding ordinary fees/funding, or null. */
        realized_pnl_delta_x18: string | null;
      }
  );

/** Automatic feed content; excludes posts, replies, drawings, and interaction writes. */
export type MobileServerSocialFeedItem =
  | MobileServerSocialTradeCard
  | MobileServerSocialTradeRow;

/** Fixed-duration social feed reading session. Credentials and cursors must be returned unchanged. */
export interface MobileServerFeedReadSession {
  /** Session identifier. */
  session_id: string;
  /** Feed or direct item session. */
  mode: 'feed' | 'item';
  /** Fixed expiration time in Unix milliseconds; pagination does not extend it. */
  expires_at_ms: number;
  /** Exposure metadata only; recording is not available from the social feed. */
  view_tracking: {
    /** Required visible fraction. */
    min_visible_ratio: number;
    /** Required visible duration in milliseconds. */
    min_duration_ms: number;
  };
  /** Initial update baseline, distinct from the page cursor. */
  update_cursor: string | null;
  /** Returned only to the corresponding anonymous viewer. Do not log or cache publicly. */
  viewer_token?: string;
}

/** Fixed-window list response; an empty page can still have a next cursor. */
export interface MobileServerSocialFeedPage {
  /** Reading session and anonymous credential when applicable. */
  read_session: MobileServerFeedReadSession;
  /** Visible items in server order; deduplicate by ID without local reordering. */
  items: MobileServerSocialFeedItem[];
  /** Opaque cursor; null only when pagination is complete. */
  next_cursor: string | null;
  /** New-content baseline, not a pagination or update cursor. */
  watermark: string;
}

/** Main-feed page with its ordering version. */
export interface MobileServerRankedFeedPage extends MobileServerSocialFeedPage {
  /** Current ordering contract: chronological-v1. */
  ranking_version: string;
}

/** Top Traders page, with one shared qualification snapshot for eligibility and badges. */
export interface MobileServerTopTradersFeedPage extends MobileServerRankedFeedPage {
  /** Author eligibility snapshot. */
  cohort: {
    /** Cohort UUID. */
    snapshot_id: string;
    /** Ready or the previous successful snapshot after a refresh failure. */
    status: 'ready' | 'stale';
    /** Coverage of all eligible candidate authors. */
    coverage: {
      /** Coverage domain. */
      scope: 'eligible_content_candidates';
      /** Candidate author count. */
      total_authors: number;
      /** Authors queried for this snapshot. */
      queried_authors: number;
      /** A successful response requires complete coverage. */
      complete: true;
    };
  };
}

/** Item details with either a new item session or the reused authorized session. */
export interface MobileServerSocialFeedItemResponse {
  /** Full visible item. */
  item: MobileServerSocialFeedItem;
  /** Session authorized for subsequent updates. */
  read_session: MobileServerFeedReadSession;
}

/** Item delta: omitted means unchanged; explicit null clears a prior value. */
export interface MobileServerFeedItemPatch {
  /** Target item UUID. */
  item_id: string;
  /** Positive integer version string. */
  version: string;
  /** Updated interaction counters. */
  interaction?: MobileServerFeedInteraction;
  /** Updated display timestamp; does not reorder the current list. */
  display_at_ms?: number;
  /** Updated aggregate count. */
  trade_count?: number;
  /** Updated quantity in x18 units. */
  quantity_x18?: string;
  /** Updated notional; liquidation Oracle may be unknown. */
  notional_x18?: string | null;
  /** Updated actual execution price. */
  average_price_x18?: string | null;
  /** Historical liquidation entry cost. */
  entry_price_x18?: string | null;
  /** Updated liquidation Oracle. */
  liquidation_oracle_price_x18?: string | null;
  /** Updated actual liquidation execution price. */
  liquidation_execution_price_x18?: string | null;
  /** Updated signed action PnL. */
  realized_pnl_delta_x18?: string | null;
  /** Updated historical row leverage. */
  leverage?: MobileServerFeedLeverage;
  /** Updated historical leverage reference time. */
  leverage_at_ms?: number | null;
}

/** Batched viewport updates; apply only the current viewport's latest request sequence. */
export interface MobileServerFeedUpdatesResponse {
  /** Item deltas, independent of current-position patches. */
  item_patches: MobileServerFeedItemPatch[];
  /** Complete mutable position facts at one version. */
  position_patches: MobileServerFeedPositionPatch[];
  /** Previously authorized targets that can no longer be read. */
  unavailable_targets: Array<{
    /** Target kind. */
    type: 'item' | 'position';
    /** Target UUID. */
    id: string;
    /** Uniform reason prevents leaking inaccessible content. */
    reason: 'unavailable';
  }>;
  /** New-content hint; always zero for directly created item sessions. */
  new_items_count: number;
  /** Baseline to use for the next update call with the same viewport. */
  update_cursor: string;
  /** True means a full snapshot of applicable mutable fields was returned. */
  reset: boolean;
  /** Echoed viewport revision. */
  viewport_revision: number;
  /** Echoed request sequence. */
  request_seq: number;
}
