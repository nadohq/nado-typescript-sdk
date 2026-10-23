import { BalanceSide } from '@nadohq/shared';
import { Hex } from 'viem';

/**
 * Server-side avatar selection, shared by request mapping and signing.
 */
export type MobileServerAvatarSelection =
  | {
      /** Shared catalogue selection. */
      type: 'preset';
      /** Stable catalogue ID. */
      id: string;
    }
  | {
      /** Uploaded image awaiting publication. */
      type: 'upload';
      /** Staging key returned by create_avatar_upload. */
      upload_key: string;
    };

/**
 * Server-owned avatar preset in catalogue order.
 */
export interface MobileServerAvatarPreset {
  /** Stable catalogue ID used when selecting this preset. */
  id: string;
  /** Public image URL. */
  avatar_url: string;
}

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
  /** Published avatar URL, or null when the account has no saved avatar. */
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
export interface MobileServerProfile extends MobileServerIdentitySummary {
  private_mode: boolean;
  /** Plain-text biography, or null when unset. */
  bio: string | null;
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
export type MobileSocialFeedMarketCategory = 'crypto' | 'finance';

/** Qualification tier for an account-level PnL badge. */
export type MobileSocialFeedTraderBadgeCode = 'shark' | 'whale';

/** Availability of the current or last successful qualification snapshot. */
export type MobileSocialFeedCohortStatus = 'ready' | 'stale';

/** Availability of an author's qualification data. */
export type MobileSocialFeedTraderDataStatus =
  | MobileSocialFeedCohortStatus
  | 'unavailable';

/** Category from the authoritative market source. */
export type MobileSocialFeedSourceCategory =
  | 'crypto'
  | 'stocks'
  | 'forex'
  | 'commodities';

/** Accounting basis used for position PnL. */
export type MobileSocialFeedPnlBasis =
  | 'unrealized_excl_fees_funding'
  | 'realized_incl_fees_funding';

/** Whether position PnL is live or frozen at close. */
export type MobileSocialFeedPnlMode = 'live' | 'frozen';

/** Completeness of position PnL accounting. */
export type MobileSocialFeedPnlQuality = 'ready' | 'pending' | 'unavailable';

/** Source of the displayed position size and entry price. */
export type MobileSocialFeedPositionDisplayBasis =
  | 'current_position'
  | 'closing_snapshot';

/** Current state of a position lifecycle. */
export type MobileSocialFeedPositionState = 'open' | 'closed';

/** Completeness of the available position history. */
export type MobileSocialFeedHistoryQuality = 'complete' | 'partial';

/** Trading action represented by an ordinary size-change row. */
export type MobileSocialFeedTradeSizeChangeAction = 'increased' | 'reduced';

/** Trading action represented by an automatic trade card. */
export type MobileSocialFeedTradeCardAction =
  | 'opened'
  | 'closed'
  | MobileSocialFeedTradeSizeChangeAction;

/** Whether a reading session was created for a list or a direct item. */
export type MobileSocialFeedReadSessionMode = 'feed' | 'item' | 'position';

/** Kind of feed update target. */
export type MobileSocialFeedTargetType = 'item' | 'position';

/** Official account-level 30-day PnL badge, independent of position PnL. */
export interface MobileServerSocialFeedTraderBadge {
  /** Qualification tier. */
  code: MobileSocialFeedTraderBadgeCode;
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
export interface MobileServerSocialFeedAuthor extends MobileServerIdentitySummary {
  /** Selected view_as account's follow state; null without a viewing account. */
  is_following: boolean | null;
  /** Null when no qualifying badge is available. */
  trader_badge: MobileServerSocialFeedTraderBadge | null;
  /** Stale means the last successful cohort is used after a refresh failure. */
  trader_data_status: MobileSocialFeedTraderDataStatus;
}

/** Market metadata from the service's authoritative market source. */
export interface MobileServerSocialFeedMarket {
  /** Market product ID. */
  product_id: number;
  /** Market symbol. */
  symbol: string;
  /** Logo URL when available. */
  logo_url: string | null;
  /** Social feed category when known. */
  category: MobileSocialFeedMarketCategory | null;
  /** Original market categories. */
  source_categories: MobileSocialFeedSourceCategory[];
}

/** Leverage display value; unknown isolated leverage differs from inapplicable cross leverage. */
export interface MobileSocialFeedLeverage {
  /** Rounded whole-number string, or null. Never an estimated replacement. */
  value: string | null;
  /** Cross margin uses not_applicable. */
  basis: 'effective' | 'unknown' | 'not_applicable';
}

/** Position PnL with explicit accounting basis and data quality. */
export interface MobileServerSocialFeedPnl {
  /** Signed x18 integer; null means unknown, not zero. */
  amount_x18: string | null;
  /** Open positions exclude fees/funding; closed results include them. */
  basis: MobileSocialFeedPnlBasis;
  /** Closed positions use frozen results. */
  mode: MobileSocialFeedPnlMode;
  /** Source timestamp in Unix milliseconds. */
  as_of_ms: number;
  /** Whether accounting is complete, pending, or unavailable. */
  quality: MobileSocialFeedPnlQuality;
}

/** Complete mutable position fields delivered together at one version. */
export interface MobileServerSocialFeedPositionPatch {
  /** Additional metrics for a position history session, when supplied. */
  current_position?: MobileServerSocialFeedHistoryMetrics;
  /** Position lifecycle UUID. */
  position_id: string;
  /** Positive integer string; compare as integers without Number conversion. */
  position_version: string;
  /** Position state timestamp in Unix milliseconds. */
  state_as_of_ms: number;
  /** Remaining average entry cost, frozen on close; x18 or null. */
  entry_price_x18: string | null;
  /** Basis of the displayed size and entry price. */
  display_basis: MobileSocialFeedPositionDisplayBasis;
  /** Closing snapshot reference time, or null. */
  snapshot_at_ms: number | null;
  /** Absolute quantity in x18 units. */
  quantity_x18: string;
  /** Notional value in x18 units. */
  notional_x18: string;
  /** Current lifecycle state. */
  state: MobileSocialFeedPositionState;
  /** Completeness of the available historical facts. */
  history_quality: MobileSocialFeedHistoryQuality;
  /** Margin mode. */
  margin_mode: MobileFeedMarginMode;
  /** Current or closing leverage. */
  leverage: MobileSocialFeedLeverage;
  /** Leverage reference time; null when unknown or inapplicable. */
  leverage_at_ms: number | null;
  /** Current remaining PnL or the closed lifecycle's net result. */
  pnl: MobileServerSocialFeedPnl;
}

/** Position displayed inside an automatic trade card. */
export interface MobileServerSocialFeedPositionCard extends MobileServerSocialFeedPositionPatch {
  /** Market product ID. */
  product_id: number;
  /** Market display metadata. */
  market: MobileServerSocialFeedMarket;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
}

/** Interaction counters and the viewing account's relationship state. */
export interface MobileServerSocialFeedInteraction {
  /** Number of likes. */
  like_count: number;
  /** Number of comments. */
  comment_count: number;
  /** Number of recorded views. */
  view_count: number;
  /** Null when no viewing account is selected. */
  liked_by_me: boolean | null;
}

/** Capability flags for a social feed item. */
export interface MobileServerSocialFeedCapabilities {
  /** Whether liking is available. */
  can_like: boolean;
  /** Whether commenting is available. */
  can_comment: boolean;
  /** Whether exposure recording is available. */
  can_record_view: boolean;
}

/** Comment preview metadata for a social trade card. */
export interface MobileServerSocialFeedCommentPreview {
  /** Most recent readable replies. */
  items: MobileServerSocialFeedReply[];
  /** Comment count. */
  total_count: number;
  /** Comment cursor, if available. */
  next_cursor: string | null;
}

/** Exposure requirements associated with a reading session. */
export interface MobileServerSocialFeedViewTracking {
  /**
   * Detail-visit exposure: report the primary detail target after it is shown in the foreground.
   * List visible-ratio / dwell thresholds are no longer used.
   */
  mode: 'detail_visit';
}

/** Uploaded feed image metadata; bytes are fetched separately with the reading session. */
export interface MobileServerSocialFeedImage {
  /** Image UUID. */
  image_id: string;
  /** Backend path for the original image bytes. */
  url: string;
  /** Display-orientation width in pixels. */
  width: number;
  /** Display-orientation height in pixels. */
  height: number;
  /** Detected content type. */
  content_type: 'image/jpeg' | 'image/png';
  /** Original file size in bytes. */
  byte_size: number;
  /** Always-present thumbnail (longest edge ≤ 512, never upscaled). */
  thumbnail: {
    /** Backend path for the thumbnail bytes. */
    url: string;
    /** Thumbnail width in pixels. */
    width: number;
    /** Thumbnail height in pixels. */
    height: number;
  };
}

/** Coverage of the candidate authors in a qualification snapshot. */
export interface MobileServerSocialFeedCohortCoverage {
  /** Coverage domain. */
  scope: 'eligible_content_candidates';
  /** Candidate author count. */
  total_authors: number;
  /** Authors queried for this snapshot. */
  queried_authors: number;
  /** A successful response requires complete coverage. */
  complete: true;
}

/** Shared qualification snapshot used for Top Traders eligibility and badges. */
export interface MobileServerSocialFeedCohort {
  /** Cohort UUID. */
  snapshot_id: string;
  /** Ready or the previous successful snapshot after a refresh failure. */
  status: MobileSocialFeedCohortStatus;
  /** Coverage of all eligible candidate authors. */
  coverage: MobileServerSocialFeedCohortCoverage;
}

/** Metadata shared by social feed content. */
export interface MobileServerSocialFeedItemBase {
  /** Item UUID. */
  id: string;
  /** Whether authored analysis exists. */
  has_analysis: boolean;
  /** Parsed drawing document, or null when no drawing is readable. */
  drawing: MobileServerSocialFeedDrawing | null;
  /** Author identity, badge, and follow perspective. */
  author: MobileServerSocialFeedAuthor;
  /** Creation time in Unix milliseconds. */
  created_at_ms: number;
  /** Sorting time in Unix milliseconds. */
  display_at_ms: number;
  /** Positive integer version string. */
  version: string;
  /** Market metadata. */
  market: MobileServerSocialFeedMarket;
  /** Server capability flags, subject to the corresponding write switches. */
  capabilities: MobileServerSocialFeedCapabilities;
}

/** Content shared by authored posts and trade cards. */
export interface MobileServerSocialFeedContentBase extends MobileServerSocialFeedItemBase {
  /** Bound images in display order; empty when none. */
  images: MobileServerSocialFeedImage[];
  /** Card text, empty for automatic cards. */
  text: string;
  /** Mentions in the original, unmodified text. */
  mentions: MobileSocialFeedMention[];
  /** Current or frozen position display. */
  position: MobileServerSocialFeedPositionCard;
  /** Interaction counters. */
  interaction: MobileServerSocialFeedInteraction;
  /** Readable comment preview. */
  comment_preview: MobileServerSocialFeedCommentPreview;
}

/** Trade card with optional authored text and analysis. */
export interface MobileServerSocialFeedTradeCard extends MobileServerSocialFeedContentBase {
  /** Card discriminant. */
  kind: 'trade_card';
  /** Trading action. */
  action: MobileSocialFeedTradeCardAction;
}

/** Fields shared by size-change and liquidation trade rows. */
export interface MobileServerSocialFeedTradeRowBase extends MobileServerSocialFeedItemBase {
  /** Row discriminant. */
  kind: 'trade_row';
  /** Associated lifecycle UUID. */
  position_id: string;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
  /** Historical margin mode. */
  margin_mode: MobileFeedMarginMode;
  /** Historical action leverage, not the position's current leverage. */
  leverage: MobileSocialFeedLeverage;
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
export type MobileServerSocialFeedTradeRow =
  MobileServerSocialFeedTradeRowBase &
    (
      | {
          /** Ordinary size-change action. */
          action: MobileSocialFeedTradeSizeChangeAction;
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

/** Discriminated social feed content. */
export type MobileServerSocialFeedItem =
  | MobileServerSocialFeedTradeCard
  | MobileServerSocialFeedTradeRow
  | MobileServerSocialFeedPost
  | MobileServerSocialFeedReply;

/** Idle-renewed social feed reading session. Credentials and cursors must be returned unchanged. */
export interface MobileServerSocialFeedReadSession {
  /** Session identifier. */
  session_id: string;
  /** Feed, item, or full position history session. */
  mode: MobileSocialFeedReadSessionMode;
  /** Current idle expiration in Unix milliseconds; legitimate session requests renew it. */
  expires_at_ms: number;
  /** Visibility requirements for explicit exposure reporting. */
  view_tracking: MobileServerSocialFeedViewTracking;
  /** Initial update baseline, distinct from the page cursor. */
  update_cursor: string | null;
  /** Credential for this reading session. Do not log or cache publicly. */
  viewer_token: string;
}

/** Item delta: omitted means unchanged; explicit null clears a prior value. */
export interface MobileServerSocialFeedItemPatch {
  /** Updated reply attachment; null clears it, omission leaves it unchanged. */
  attached_position?: MobileServerSocialFeedPositionCard | null;
  /** Updated reply attachment visibility. */
  attachment_status?: MobileSocialFeedAttachmentStatus;
  /** Current author identity, follow state, and qualification badge. */
  author: MobileServerSocialFeedAuthor;
  /** Target item UUID. */
  item_id: string;
  /** Positive integer version string. */
  version: string;
  /** Updated interaction counters. */
  interaction?: MobileServerSocialFeedInteraction;
  /** Updated display timestamp; does not reorder the current list. */
  display_at_ms: number;
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
  leverage?: MobileSocialFeedLeverage;
  /** Updated historical leverage reference time. */
  leverage_at_ms?: number | null;
}

/** A previously authorized target that can no longer be read; shared by wire and client responses. */
export interface MobileSocialFeedUnavailableTarget {
  /** Target kind. */
  type: MobileSocialFeedTargetType;
  /** Target UUID. */
  id: string;
  /** Uniform reason prevents leaking inaccessible content. */
  reason: 'unavailable';
}

/** Readable state of a reply's position attachment. */
export type MobileSocialFeedAttachmentStatus =
  | 'none'
  | 'visible'
  | 'unavailable';

/** Supported chart candle intervals. */
export type MobileSocialFeedChartInterval =
  | '1m'
  | '5m'
  | '15m'
  | '1h'
  | '4h'
  | '1d';

/** Position lifecycle action. */
export type MobileSocialFeedAction =
  | MobileSocialFeedTradeCardAction
  | 'liquidated';

/** Result of resolving a position command. */
export type MobileSocialFeedPositionResolution =
  | 'resolved'
  | 'choose_position'
  | 'no_open_position'
  | 'unknown_market';

/** Resolution of a viewing account's trading targets. */
export type MobileSocialFeedTradingResolution =
  | 'no_viewing_account'
  | 'none'
  | 'unique'
  | 'choose_position'
  | 'unavailable';

/** Price source for a historical action marker. */
export type MobileSocialFeedActionPriceBasis =
  | 'execution'
  | 'liquidation_oracle';

/** Chart source completeness; wholly unavailable sources fail the request. */
export type MobileSocialFeedChartDataQuality = 'ready' | 'partial';

/** Projection state of an order's authoritative action segments. */
export type MobileSocialFeedActionResolution = 'ready' | 'pending';

/** Explanation for an empty position command result. */
export type MobileSocialFeedPositionResolutionReason =
  | 'no_open_position'
  | 'unknown_market';

/** Reason an action cannot be published. */
export type MobileSocialFeedActionUnavailableReason =
  | 'position_closed'
  | 'already_published'
  | 'unavailable';

/** Availability of an estimated liquidation price. */
export type MobileSocialFeedLiquidationPriceQuality =
  | MobileSocialFeedPnlQuality
  | 'not_applicable';

/** Presence lifecycle reported by an individual page. */
export type MobileSocialFeedPresenceState = 'watching' | 'heartbeat' | 'left';

/** Mention offsets refer to Unicode code points in the original text, not UTF-16 indices. */
export interface MobileSocialFeedMention {
  /** Mentioned identity. */
  subaccount: Hex;
  /** Inclusive code point offset. */
  start: number;
  /** Exclusive code point offset. */
  end: number;
  /** Label matching the original text. */
  label: string;
}

/** Parsed drawing; data is opaque to the SDK and may legitimately be false or zero. */
export interface MobileServerSocialFeedDrawing {
  /** Already parsed drawing document; do not JSON.parse again. */
  data: unknown;
  /** Original creation time in milliseconds. */
  created_at_ms: number;
  /** Last update time in milliseconds. */
  updated_at_ms: number;
}

/** Nonrecursive root-post preview carried by replies. */
export interface MobileServerSocialFeedCompactCard {
  /** Root item UUID. */
  id: string;
  /** Root author. */
  author: MobileServerSocialFeedAuthor;
  /** Original text excerpt. */
  text_excerpt: string;
  /** Visible position summary, or null. */
  position: Pick<
    MobileServerSocialFeedPositionCard,
    'position_id' | 'market' | 'direction' | 'state' | 'notional_x18'
  > | null;
  /** Whether the root has published analysis. */
  has_analysis: boolean;
}

/** Authored position post, including text-only, drawing-only, and combined content. */
export interface MobileServerSocialFeedPost extends MobileServerSocialFeedContentBase {
  /** Post discriminant. */
  kind: 'post';
}

/** Reply with independently permissioned position attachment and nonrecursive root preview. */
export interface MobileServerSocialFeedReply extends MobileServerSocialFeedItemBase {
  /** Reply discriminant. */
  kind: 'reply';
  /** Bound images in display order; empty when none. */
  images: MobileServerSocialFeedImage[];
  /** Original text. */
  text: string;
  /** Mentions in the text. */
  mentions: MobileSocialFeedMention[];
  /** Actual root item UUID. */
  root_item_id: string;
  /** Omitted for a direct reply to the root. */
  reply_to_item_id?: string;
  /** Author being replied to, or null. */
  reply_to_author: MobileServerSocialFeedAuthor | null;
  /** Readable attachment; null when absent or unavailable. */
  attached_position: MobileServerSocialFeedPositionCard | null;
  /** Distinguishes an absent attachment from an unreadable one. */
  attachment_status: MobileSocialFeedAttachmentStatus;
  /** Root preview; does not register root exposure. */
  original: MobileServerSocialFeedCompactCard;
  /** Reply interaction state. */
  interaction: MobileServerSocialFeedInteraction;
}

/** Current eligibility hints; actual writes still recheck the signed author. */
export interface MobileServerSocialFeedPublishablePosition {
  /** Candidate position. */
  position: MobileServerSocialFeedPositionCard;
  /** Whether this account can publish. */
  can_publish: boolean;
  /** Whether this account can attach the position to a comment. */
  can_attach_to_comment: boolean;
  /** Whether this account can first add analysis. */
  can_draw_analysis: boolean;
  /** Unavailability explanation, or null. */
  unavailable_reason: string | null;
}

/** An authoritative lifecycle segment of an order. */
export interface MobileServerSocialFeedActionCandidate {
  /** Action UUID. */
  action_id: string;
  /** Lifecycle UUID. */
  position_id: string;
  /** Lifecycle action. */
  action: MobileSocialFeedAction;
  /** Current publishing eligibility, not proof of caller ownership. */
  can_publish: boolean;
  /** Publication restriction, or null when eligible. */
  unavailable_reason: MobileSocialFeedActionUnavailableReason | null;
}

/** Additional history metrics; unavailable values are not zero. */
export interface MobileServerSocialFeedHistoryMetrics {
  /** Estimated liquidation price in x18, independent of event Oracle and execution prices. */
  estimated_liquidation_price_x18: string | null;
  /** Availability of the estimated price. */
  liquidation_price_quality: MobileSocialFeedLiquidationPriceQuality;
  /** Source time in milliseconds. */
  liquidation_price_as_of_ms: number | null;
  /** Signed funding amount in x18. */
  funding_pnl_x18: string | null;
  /** Funding availability. */
  funding_quality: MobileSocialFeedPnlQuality;
  /** Funding source time in milliseconds. */
  funding_as_of_ms: number | null;
}

/** Full position card displayed above its historical timeline. */
export interface MobileServerSocialFeedPositionHistoryCard
  extends
    MobileServerSocialFeedPositionCard,
    MobileServerSocialFeedHistoryMetrics {}

/** Persisted action facts, independent of whether a feed item was published. */
export interface MobileServerSocialFeedPositionAction {
  /** Action UUID. */
  id: string;
  /** Lifecycle UUID. */
  position_id: string;
  /** Lifecycle action. */
  action: MobileSocialFeedAction;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
  /** Historical margin mode. */
  margin_mode: MobileFeedMarginMode;
  /** Quantity before the action, in x18. */
  quantity_before_x18: string;
  /** Quantity after the action, in x18. */
  quantity_after_x18: string;
  /** Executed quantity, in x18. */
  executed_quantity_x18: string;
  /** Actual executed notional in x18; may be unknown for liquidation. */
  executed_notional_x18: string | null;
  /** Actual execution price in x18. */
  average_price_x18: string | null;
  /** Entry price before the action, in x18. */
  entry_price_before_x18: string | null;
  /** Liquidation event Oracle price in x18. */
  liquidation_oracle_price_x18: string | null;
  /** Liquidation Oracle-based notional in x18. */
  liquidation_notional_x18: string | null;
  /** Signed realized trading PnL in x18, excluding ordinary fees and funding. */
  realized_pnl_delta_x18: string | null;
  /** Historical effective leverage. */
  leverage: MobileSocialFeedLeverage;
  /** Leverage source time in milliseconds. */
  leverage_at_ms: number | null;
  /** First event time in milliseconds. */
  first_event_at_ms: number;
  /** Last event time in milliseconds. */
  last_event_at_ms: number;
  /** Decimal-string version. */
  version: string;
}

/** Full published content appearing in a position timeline. */
export type MobileServerSocialFeedHistoryTake =
  | MobileServerSocialFeedTradeCard
  | MobileServerSocialFeedPost;

/** A historical action or authored take; preserve service ordering. */
export type MobileServerSocialFeedTimelineEntry =
  | {
      /** Action entry. */
      kind: 'action';
      /** Full action facts. */
      action: MobileServerSocialFeedPositionAction;
      /** Actually associated feed item, or null. */
      related_item_id: string | null;
      /** Full published trade card, or null. */
      related_take: MobileServerSocialFeedTradeCard | null;
    }
  | {
      /** Published take entry. */
      kind: 'take';
      /** Full published content. */
      item: MobileServerSocialFeedHistoryTake;
    };

/** Trusted trading target; this hint does not authorize trading. */
export interface MobileServerSocialFeedTradingTarget {
  /** Lifecycle UUID. */
  position_id: string;
  /** Parent identity. */
  identity_subaccount: Hex;
  /** Actual trading subaccount, possibly isolated. */
  trading_subaccount: Hex;
  /** Market product ID. */
  product_id: number;
  /** Margin mode. */
  margin_mode: MobileFeedMarginMode;
  /** Isolated name, or null for cross margin. */
  iso_subaccount_name: string | null;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
  /** Source time in milliseconds. */
  state_as_of_ms: number;
}

/** Viewing-account trading hints, not authenticated permissions. */
export interface MobileServerSocialFeedTradingContext {
  /** Market product ID. */
  product_id: number;
  /** Suggested trade direction. */
  suggested_direction: MobileFeedTradePositionDirection;
  /** Resolution of the viewing account's positions. */
  resolution: MobileSocialFeedTradingResolution;
  /** Trusted candidates. */
  candidates: MobileServerSocialFeedTradingTarget[];
  /** Unique candidate, or null. */
  viewer_position_id: string | null;
  /** Whether the selected account has a unique reducible position. */
  can_reduce: boolean;
}

/** Historical candle; volume is a quantity, not a price. */
export interface MobileServerSocialFeedCandle {
  /** Candle start time in milliseconds. */
  timestamp_ms: number;
  /** Open price in x18. */
  open_x18: string;
  /** High price in x18. */
  high_x18: string;
  /** Low price in x18. */
  low_x18: string;
  /** Close price in x18. */
  close_x18: string;
  /** Base asset volume in x18. */
  volume_x18: string;
}

/** Chart action marker with explicitly identified price basis. */
export interface MobileServerSocialFeedActionMarker {
  /** Action UUID. */
  action_id: string;
  /** Event time in milliseconds. */
  timestamp_ms: number;
  /** Price in x18; null does not remove the action. */
  price_x18: string | null;
  /** Lifecycle action. */
  action: MobileSocialFeedAction;
  /** Direction. */
  direction: MobileFeedTradePositionDirection;
  /** Never substitute actual execution for a liquidation Oracle. */
  price_basis: MobileSocialFeedActionPriceBasis;
}

/** Counts across the authorized position history. */
export interface MobileServerSocialFeedHistorySummary {
  /** Action count. */
  action_count: number;
  /** Published take count. */
  take_count: number;
}

/** Estimated liquidation price and its source time. */
export interface MobileServerSocialFeedEstimatedLiquidationLine {
  /** Estimated price in x18. */
  price_x18: string;
  /** Source time in milliseconds. */
  as_of_ms: number;
}

/** Half-open chart range, preserved across pages. */
export interface MobileServerSocialFeedChartRange {
  /** Inclusive start in milliseconds. */
  from_ms: number;
  /** Exclusive end in milliseconds. */
  to_ms: number;
}
