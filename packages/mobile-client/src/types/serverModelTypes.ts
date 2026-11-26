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
 * Where a Creator Rate comes from: an active operator assignment, or the service-wide default.
 */
export type MobileCreatorRateSource = 'assigned' | 'default';

/**
 * Platform of a device registered for push notifications.
 */
export type MobileNotificationPlatform = 'ios' | 'android';

/** Notification types whose v2 payloads and routes this SDK can decode. */
export const MOBILE_NOTIFICATION_TYPE_IDS = [
  'new_follower',
  'followed_you_back',
  'order_fill',
  'order_update',
  'liquidation',
  'near_liquidation',
  'trader_opened',
  'trader_closed',
  'position_milestone',
  'market_movement',
  'market_daily_move',
  'market_large_trade',
  'notable_trader',
  'trader_streak',
  'account_drama',
  'weekly_digest',
  'deposit_completed',
  'campaign_announcement',
  'tip_received',
  'tip_liked',
  'tip_replied',
  'feed_liked',
  'feed_replied',
] as const;

/** Notification types supported by the v2 payload protocol and this SDK's decoder. */
export type MobileNotificationTypeId =
  (typeof MOBILE_NOTIFICATION_TYPE_IDS)[number];

/** Tip receipt and engagement notifications with server-rendered title and body. */
export type MobileTipAndFeedNotificationTypeId = Extract<
  MobileNotificationTypeId,
  'tip_received' | 'tip_liked' | 'tip_replied' | 'feed_liked' | 'feed_replied'
>;

/**
 * Named navigation destinations supported by notification payloads.
 */
export type MobileNotificationRouteName = MobileServerNotificationRoute['name'];

/** Position milestone options supported by notification settings. */
export const MOBILE_NOTIFICATION_POSITION_THRESHOLDS = [10, 25, 50] as const;

/** Minimum trade-size options, in whole USD, supported by notification settings. */
export const MOBILE_NOTIFICATION_MIN_TRADE_SIZES_USD = [
  0, 100, 1000, 10000,
] as const;

/** Supported notification position milestone threshold. */
export type MobileNotificationPositionThreshold =
  (typeof MOBILE_NOTIFICATION_POSITION_THRESHOLDS)[number];

/** Supported notification minimum trade size, in whole USD. */
export type MobileNotificationMinTradeSizeUsd =
  (typeof MOBILE_NOTIFICATION_MIN_TRADE_SIZES_USD)[number];

/** Supported product analytics interaction. */
export type MobileProductEventName =
  | 'notif_opened'
  | 'market_viewed'
  | 'chart_opened'
  | 'search';

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

/**
 * Stored push-device metadata shared by registration requests and token ownership responses.
 */
export interface MobileServerNotificationDeviceMetadata {
  /** Device operating system. */
  platform: MobileNotificationPlatform;
  /** Locale tag, or null when absent; at most 35 UTF-8 bytes. */
  locale: string | null;
  /** App version, or null when absent; at most 64 UTF-8 bytes. */
  app_version: string | null;
}

/**
 * Device capabilities shared by v2 registration and v1/v2 registration queries.
 */
export interface MobileServerNotificationCapabilities {
  /** Exactly one supported payload version. */
  payload_versions: [1] | [2];
  /** Supported subset of the registered notification types. */
  type_ids: MobileNotificationTypeId[];
  /** Supported subset of the named destinations. */
  routes: MobileNotificationRouteName[];
}

/**
 * Server-side wallet settings; the original nine fields are required on replacement.
 */
export interface MobileServerNotificationSettings {
  /** Own position milestones and the initial weekly digest. */
  my_positions: boolean;
  /** One to three unique values; the minimum selects the starting milestone tier. */
  position_thresholds: MobileNotificationPositionThreshold[];
  /** Combined order fill/update switch; does not control liquidation notifications. */
  my_orders: boolean;
  /** Ordinary followed-trader notifications; enabled bells override this switch. */
  following_trades: boolean;
  /** Notifications about posts by followed traders. */
  following_posts: boolean;
  /** Minimum trade size for trade notifications, in whole USD. */
  min_trade_size_usd: MobileNotificationMinTradeSizeUsd;
  /** New followers and follow-backs. */
  new_followers: boolean;
  /** Maps to the legacy announcement preference. */
  announcements: boolean;
  /** Opt-in trader streak and account drama discovery notifications. */
  discovery: boolean;
  /** Like/reply preference; omission on v2 writes preserves the saved value, defaulting to true. */
  likes_and_replies?: boolean;
}

/**
 * Server-side allowlisted destination; notification data must never be interpreted as an arbitrary URL.
 */
export type MobileServerNotificationRoute =
  | {
      /** Public profile destination. */
      name: 'profile';
      /** Profile subaccount as bytes32. */
      subaccount: Hex;
    }
  | {
      /** Market destination. */
      name: 'market';
      /** Positive product ID. */
      product_id: number;
    }
  | {
      /** Own portfolio destination. */
      name: 'portfolio';
    }
  | {
      /** Private receipt destination, loaded through signed tip_detail. */
      name: 'tip';
      /** Payment record UUID. */
      tip_id: string;
    }
  | {
      /** Public Tip thread, optionally anchored to a reply. */
      name: 'tip_thread';
      /** Payment record UUID. */
      tip_id: string;
      /** Public Feed UUID of the Tip, also used as its standalone thread root. */
      feed_item_id: string;
      /** Original post root; null for a standalone Tip. */
      origin_post_id: string | null;
      /** Target reply UUID; null when opening the Tip itself. */
      reply_item_id: string | null;
    }
  | {
      /** Ordinary Feed thread, optionally anchored to a reply. */
      name: 'feed_thread';
      /** Public Feed UUID of the thread root. */
      root_item_id: string;
      /** Target reply UUID; null when opening the root itself. */
      reply_item_id: string | null;
    };

/** Shared v2 notification metadata; older notifications may omit rendered text. */
interface MobileServerNotificationPayloadV2Base {
  /** Payload protocol version. */
  payload_version: 2;
  /** Logical notification UUID, used for click deduplication. */
  notification_id: string;
  /** Intended wallet; private navigation must wait for this wallet to connect. */
  recipient_wallet: Hex;
  /** Supported template version. */
  template_version: 1;
  /** Server-rendered title when supplied by the notification type. */
  title?: string;
  /** Server-rendered body when supplied by the notification type. */
  body?: string;
}

/** V2 push/Inbox data, with type-specific Tip and Feed destinations and rendered text. */
export type MobileServerNotificationPayloadV2 =
  MobileServerNotificationPayloadV2Base &
    (
      | {
          /** Existing notification types retain their original destinations. */
          type_id: Exclude<
            MobileNotificationTypeId,
            MobileTipAndFeedNotificationTypeId
          >;
          /** Existing named destination and its parameters. */
          route: Extract<
            MobileServerNotificationRoute,
            { name: 'profile' | 'market' | 'portfolio' }
          >;
        }
      | ({
          /** Text shared by Inbox and device push. */
          title: string;
          /** Text shared by Inbox and device push. */
          body: string;
        } & (
          | {
              /** Confirmed receipt delivered to the recipient wallet. */
              type_id: 'tip_received';
              /** Signed Tip detail destination. */
              route: Extract<MobileServerNotificationRoute, { name: 'tip' }>;
            }
          | {
              /** Like or reply on a public Tip. */
              type_id: 'tip_liked' | 'tip_replied';
              /** Public Tip thread destination. */
              route: Extract<
                MobileServerNotificationRoute,
                { name: 'tip_thread' }
              >;
            }
          | {
              /** Like on a Feed object, including a reply beneath a Tip. */
              type_id: 'feed_liked';
              /** Tip replies use tip_thread; ordinary Feed objects use feed_thread. */
              route: Extract<
                MobileServerNotificationRoute,
                { name: 'tip_thread' | 'feed_thread' }
              >;
            }
          | {
              /** Reply on an ordinary Feed thread. */
              type_id: 'feed_replied';
              /** Ordinary Feed thread destination. */
              route: Extract<
                MobileServerNotificationRoute,
                { name: 'feed_thread' }
              >;
            }
        ))
    );

/**
 * Server-side accepted logical notification with first-seen state; does not prove device delivery.
 */
export interface MobileServerNotificationInboxItem {
  /** Logical notification UUID. */
  notification_id: string;
  /** Registered notification type. */
  type_id: MobileNotificationTypeId;
  /** Navigation data, including rendered title/body for Tip and Feed notifications. */
  data: MobileServerNotificationPayloadV2;
  /** Intent acceptance time in milliseconds. */
  created_at: number;
  /** First acknowledgement in UTC milliseconds; null is unread, omission means unavailable read state. */
  seen_at?: number | null;
  /** Backend-computed trade attribution. */
  trade_within_24h: boolean;
}

/**
 * Server-side product analytics event; unused nullable fields must be explicitly null.
 */
export interface MobileServerProductEvent {
  /** Stable event UUID; reuse across retries. */
  client_event_id: string;
  /** Supported interaction; notif_opened is not a read-state mutation. */
  event_name: MobileProductEventName;
  /** Required for notif_opened and owned by the signing wallet; otherwise null. */
  notification_id: string | null;
  /** Actual event time in milliseconds, within the past 7 days or next 5 minutes. */
  occurred_at: number;
  /** Required for market_viewed/chart_opened; otherwise null. */
  product_id: number | null;
  /** Required for search, nonblank and at most 80 Unicode characters; otherwise null. */
  query: string | null;
}

/** Every {@link MobileSocialFeedType} for runtime validation, filters, and UI enumeration. */
export const MOBILE_SOCIAL_FEED_TYPES = [
  'open',
  'close',
  'size_change',
  'thoughts',
  'analysis',
  'comments',
] as const;

/** Legacy content filters accepted by all six social feed lists. Empty or omitted means all. */
export type MobileSocialFeedType = (typeof MOBILE_SOCIAL_FEED_TYPES)[number];

/** Filters for For You and Friends sessions with public Tips enabled. */
export const MOBILE_SOCIAL_FEED_TIP_ENABLED_TYPES = [
  ...MOBILE_SOCIAL_FEED_TYPES,
  'tips',
] as const;

/** Content filters for Tip-enabled For You and Friends sessions, including the legacy filters. */
export type MobileSocialFeedTipEnabledType =
  (typeof MOBILE_SOCIAL_FEED_TIP_ENABLED_TYPES)[number];

/** Every {@link MobileSocialFeedMarketCategory} for feed filters and runtime validation. */
export const MOBILE_SOCIAL_FEED_MARKET_CATEGORIES = [
  'crypto',
  'finance',
] as const;

/** Market category used by the social feed. */
export type MobileSocialFeedMarketCategory =
  (typeof MOBILE_SOCIAL_FEED_MARKET_CATEGORIES)[number];

/** Every {@link MobileSocialFeedTraderBadgeCode} an author can receive. */
export const MOBILE_SOCIAL_FEED_TRADER_BADGE_CODES = [
  'shark',
  'whale',
] as const;

/** Qualification tier for an account-level PnL badge. */
export type MobileSocialFeedTraderBadgeCode =
  (typeof MOBILE_SOCIAL_FEED_TRADER_BADGE_CODES)[number];

/** Every {@link MobileSocialFeedCohortStatus} a qualification snapshot can report. */
export const MOBILE_SOCIAL_FEED_COHORT_STATUSES = ['ready', 'stale'] as const;

/** Availability of the current or last successful qualification snapshot. */
export type MobileSocialFeedCohortStatus =
  (typeof MOBILE_SOCIAL_FEED_COHORT_STATUSES)[number];

/** Every {@link MobileSocialFeedTraderDataStatus}, including unavailable qualification data. */
export const MOBILE_SOCIAL_FEED_TRADER_DATA_STATUSES = [
  ...MOBILE_SOCIAL_FEED_COHORT_STATUSES,
  'unavailable',
] as const;

/** Availability of an author's qualification data. */
export type MobileSocialFeedTraderDataStatus =
  (typeof MOBILE_SOCIAL_FEED_TRADER_DATA_STATUSES)[number];

/** Every {@link MobileSocialFeedSourceCategory} the authoritative market source can report. */
export const MOBILE_SOCIAL_FEED_SOURCE_CATEGORIES = [
  'crypto',
  'stocks',
  'forex',
  'commodities',
] as const;

/** Category from the authoritative market source. */
export type MobileSocialFeedSourceCategory =
  (typeof MOBILE_SOCIAL_FEED_SOURCE_CATEGORIES)[number];

/** Every {@link MobileSocialFeedPnlBasis} used to account for position PnL. */
export const MOBILE_SOCIAL_FEED_PNL_BASES = [
  'unrealized_excl_fees_funding',
  'realized_incl_fees_funding',
] as const;

/** Accounting basis used for position PnL. */
export type MobileSocialFeedPnlBasis =
  (typeof MOBILE_SOCIAL_FEED_PNL_BASES)[number];

/** Every {@link MobileSocialFeedPnlMode} for current or closed position PnL. */
export const MOBILE_SOCIAL_FEED_PNL_MODES = ['live', 'frozen'] as const;

/** Whether position PnL is live or frozen at close. */
export type MobileSocialFeedPnlMode =
  (typeof MOBILE_SOCIAL_FEED_PNL_MODES)[number];

/** Every {@link MobileSocialFeedPnlQuality} a position can report. */
export const MOBILE_SOCIAL_FEED_PNL_QUALITIES = [
  'ready',
  'pending',
  'unavailable',
] as const;

/** Completeness of position PnL accounting. */
export type MobileSocialFeedPnlQuality =
  (typeof MOBILE_SOCIAL_FEED_PNL_QUALITIES)[number];

/** Every {@link MobileSocialFeedPositionDisplayBasis} for position size and entry price. */
export const MOBILE_SOCIAL_FEED_POSITION_DISPLAY_BASES = [
  'current_position',
  'closing_snapshot',
] as const;

/** Source of the displayed position size and entry price. */
export type MobileSocialFeedPositionDisplayBasis =
  (typeof MOBILE_SOCIAL_FEED_POSITION_DISPLAY_BASES)[number];

/** Every {@link MobileSocialFeedPositionState} in a position lifecycle. */
export const MOBILE_SOCIAL_FEED_POSITION_STATES = ['open', 'closed'] as const;

/** Current state of a position lifecycle. */
export type MobileSocialFeedPositionState =
  (typeof MOBILE_SOCIAL_FEED_POSITION_STATES)[number];

/** Every {@link MobileSocialFeedHistoryQuality} for the available position history. */
export const MOBILE_SOCIAL_FEED_HISTORY_QUALITIES = [
  'complete',
  'partial',
] as const;

/** Completeness of the available position history. */
export type MobileSocialFeedHistoryQuality =
  (typeof MOBILE_SOCIAL_FEED_HISTORY_QUALITIES)[number];

/** Every {@link MobileSocialFeedTradeSizeChangeAction} represented by a size-change row. */
export const MOBILE_SOCIAL_FEED_TRADE_SIZE_CHANGE_ACTIONS = [
  'increased',
  'reduced',
] as const;

/** Trading action represented by an ordinary size-change row. */
export type MobileSocialFeedTradeSizeChangeAction =
  (typeof MOBILE_SOCIAL_FEED_TRADE_SIZE_CHANGE_ACTIONS)[number];

/** Every {@link MobileSocialFeedTradeCardAction} represented by an automatic trade card. */
export const MOBILE_SOCIAL_FEED_TRADE_CARD_ACTIONS = [
  'opened',
  'closed',
  ...MOBILE_SOCIAL_FEED_TRADE_SIZE_CHANGE_ACTIONS,
] as const;

/** Trading action represented by an automatic trade card. */
export type MobileSocialFeedTradeCardAction =
  (typeof MOBILE_SOCIAL_FEED_TRADE_CARD_ACTIONS)[number];

/** Every {@link MobileSocialFeedReadSessionMode} supported by public reading sessions. */
export const MOBILE_SOCIAL_FEED_READ_SESSION_MODES = [
  'feed',
  'item',
  'position',
] as const;

/** Whether a reading session was created for a list or a direct item. */
export type MobileSocialFeedReadSessionMode =
  (typeof MOBILE_SOCIAL_FEED_READ_SESSION_MODES)[number];

/** Every {@link MobileSocialFeedTargetType} accepted by feed updates. */
export const MOBILE_SOCIAL_FEED_TARGET_TYPES = ['item', 'position'] as const;

/** Kind of feed update target. */
export type MobileSocialFeedTargetType =
  (typeof MOBILE_SOCIAL_FEED_TARGET_TYPES)[number];

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

/** Accounting bases for the USDT0 ROI denominator. */
export const MOBILE_SOCIAL_FEED_ROI_BASIS_TYPES = [
  'cross_initial_margin',
  'isolated_net_margin_transferred',
  'lifecycle_cross_initial_margin',
  'lifecycle_isolated_net_margin_transferred',
  'unknown',
] as const;

/** Accounting basis of a position's ROI denominator. */
export type MobileSocialFeedRoiBasisType =
  (typeof MOBILE_SOCIAL_FEED_ROI_BASIS_TYPES)[number];

/** Availability states of the ROI denominator. */
export const MOBILE_SOCIAL_FEED_ROI_BASIS_QUALITIES = [
  'ready',
  'pending',
  'unavailable',
  'not_applicable',
] as const;

/** Quality of the ROI denominator, independent of PnL quality. */
export type MobileSocialFeedRoiBasisQuality =
  (typeof MOBILE_SOCIAL_FEED_ROI_BASIS_QUALITIES)[number];

/** ROI denominator with its accounting basis and independent observation time. */
export interface MobileServerSocialFeedRoiBasis {
  /** USDT0 denominator in x18 units, not a percentage; null means unknown. */
  amount_x18: string | null;
  /** Margin accounting used to derive the denominator. */
  basis: MobileSocialFeedRoiBasisType;
  /** Source timestamp in Unix milliseconds, or null when unknown. */
  as_of_ms: number | null;
  /** Availability of the denominator. */
  quality: MobileSocialFeedRoiBasisQuality;
}

/** Complete mutable position fields delivered together at one version. */
export interface MobileServerSocialFeedPositionPatch {
  /** Returned by position_history and feed_updates; omitted by other reads and writes. */
  roi_basis?: MobileServerSocialFeedRoiBasis;
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
  /** Whether tipping is available; clients must also exclude the current wallet's own items. */
  can_tip?: boolean;
}

/** Comment preview metadata for a social trade card. */
export interface MobileServerSocialFeedCommentPreview {
  /** Most recent readable replies. */
  items: MobileServerSocialFeedReply[];
  /** Comment count. */
  total_count: number;
  /** Opens the first complete group page in the same snapshot; do not prepend preview items. */
  next_cursor: string | null;
}

/** Uploaded feed image metadata; bytes are fetched separately with the reading session. */
export interface MobileServerSocialFeedUploadedImage {
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
  thumbnail: MobileServerSocialFeedImageThumbnail;
}

/** Caller-provided dimensions of the exact external image URL being published. */
export interface MobileServerSocialFeedExternalImageDimensions {
  /** Width in pixels; an integer from 1 through 4,294,967,295. */
  width: number;
  /** Height in pixels; an integer from 1 through 4,294,967,295. */
  height: number;
}

/** External image loaded directly from its URL without Mobile session headers. */
export interface MobileServerSocialFeedExternalImage {
  /** Original HTTP/HTTPS URL; no upload metadata or thumbnail is provided. */
  url: string;
  /** Caller-provided width in pixels; omitted with height when unknown. */
  width?: number;
  /** Caller-provided height in pixels; omitted with width when unknown. */
  height?: number;
}

/** Uploaded image metadata or an external URL; uploaded images precede external images. */
export type MobileServerSocialFeedImage =
  | MobileServerSocialFeedUploadedImage
  | MobileServerSocialFeedExternalImage;

/** Thumbnail metadata for an uploaded feed image. */
export interface MobileServerSocialFeedImageThumbnail {
  /** Backend path for the thumbnail bytes. */
  url: string;
  /** Thumbnail width in pixels. */
  width: number;
  /** Thumbnail height in pixels. */
  height: number;
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
  /** Public Tip total in USDT0 x18 units when enabled; never null. "0" means none, omission hides it. */
  public_tip_total_x18?: string;
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
  | MobileServerSocialFeedReply
  | MobileServerSocialFeedTip;

/** Public, verified-credit Tip, independent of any market or linked position. */
export interface MobileServerSocialFeedTip extends Omit<
  MobileServerSocialFeedItemBase,
  'has_analysis' | 'drawing' | 'market'
> {
  /** Public Tip discriminant. */
  kind: 'tip';
  /** Tips do not carry authored analysis. */
  has_analysis: false;
  /** Tips do not carry a drawing. */
  drawing: null;
  /** Tips do not belong to a market. */
  market: null;
  /** Payment record UUID, distinct from this item's public id. */
  tip_id: string;
  /** Sending participant; also represented by author. */
  sender: MobileServerTipParticipant;
  /** Receiving participant. */
  recipient: MobileServerTipParticipant;
  /** Cash asset product ID. */
  product_id: 0;
  /** Verified net recipient amount in integer x18 units. */
  net_amount_x18: string;
  /** Only public Tips produce a public Feed item. */
  visibility: 'public';
  /** Original message, or null. */
  note: string | null;
  /** Background identifier fixed at admission. */
  background_id: string;
  /** Opaque background version fixed at admission. */
  background_version: string;
  /** Saved original-post UUID, or null for a profile Tip. */
  origin_post_id: string | null;
  /** Current original-post readability, or null when no reference exists. */
  origin_availability: MobileTipOriginAvailability | null;
  /** Readable original-post summary, or null. */
  original: MobileServerSocialFeedCompactCard | null;
  /** Original admission time in UTC milliseconds. */
  submitted_at_ms: number;
  /** Verified recipient credit time in UTC milliseconds. */
  credited_at_ms: number;
  /** This Tip item's own interaction state. */
  interaction: MobileServerSocialFeedInteraction;
  /** Readable replies to this Tip. */
  comment_preview: MobileServerSocialFeedCommentPreview;
}

/** Idle-renewed social feed reading session. Credentials and cursors must be returned unchanged. */
export interface MobileServerSocialFeedReadSession {
  /** Session identifier. */
  session_id: string;
  /** Feed, item, or full position history session. */
  mode: MobileSocialFeedReadSessionMode;
  /** Current idle expiration in Unix milliseconds; legitimate session requests renew it. */
  expires_at_ms: number;
  /** Initial update baseline, distinct from the page cursor. */
  update_cursor: string | null;
  /** Credential for this reading session. Do not log or cache publicly. */
  viewer_token: string;
}

/** Mutable item fields. On reset, an omitted public_tip_total_x18 clears its prior display value. */
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
  /** Updated capability object; never null. Omission leaves the existing flags unchanged. */
  capabilities?: MobileServerSocialFeedCapabilities;
  /** Updated USDT0 x18 total; never null. "0" means none; omission clears it when reset is true. */
  public_tip_total_x18?: string;
  /** Updated Tip sender profile; retain the full item's payment identifiers and amount. */
  sender?: MobileServerTipParticipant;
  /** Updated Tip recipient profile. */
  recipient?: MobileServerTipParticipant;
  /** Saved original-post UUID for a Tip, or null when no reference exists. */
  origin_post_id?: string | null;
  /** Current original-post readability, or null when no reference exists. */
  origin_availability?: MobileTipOriginAvailability | null;
  /** Updated original-post summary for a Tip; null clears an unreadable or absent reference. */
  original?: MobileServerSocialFeedCompactCard | null;
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

/** Outcome of one order digest in an `attribute_orders` request. */
export type MobileOrderAttributionStatus =
  | 'accepted'
  | 'duplicate'
  | 'rejected';

/**
 * Why an order digest was rejected. `conflict` means the order is already attributed to a different item; the
 * first attribution stays. A market mismatch is not a reason here: the backend finds it later from the fills.
 */
export type MobileOrderAttributionRejectReason =
  | 'unknown_item'
  | 'not_attributable'
  | 'own_content'
  | 'conflict';

/** Every {@link MobileSocialFeedAttachmentStatus} a reply can report. */
export const MOBILE_SOCIAL_FEED_ATTACHMENT_STATUSES = [
  'none',
  'visible',
  'unavailable',
] as const;

/** Readable state of a reply's position attachment. */
export type MobileSocialFeedAttachmentStatus =
  (typeof MOBILE_SOCIAL_FEED_ATTACHMENT_STATUSES)[number];

/** Every {@link MobileSocialFeedChartInterval} accepted by social feed charts. */
export const MOBILE_SOCIAL_FEED_CHART_INTERVALS = [
  '1m',
  '5m',
  '15m',
  '1h',
  '4h',
  '1d',
] as const;

/** Supported chart candle intervals. */
export type MobileSocialFeedChartInterval =
  (typeof MOBILE_SOCIAL_FEED_CHART_INTERVALS)[number];

/** Every {@link MobileSocialFeedAction}, including liquidations without a trade card. */
export const MOBILE_SOCIAL_FEED_ACTIONS = [
  ...MOBILE_SOCIAL_FEED_TRADE_CARD_ACTIONS,
  'liquidated',
] as const;

/** Position lifecycle action. */
export type MobileSocialFeedAction =
  (typeof MOBILE_SOCIAL_FEED_ACTIONS)[number];

/** Every {@link MobileSocialFeedPositionResolution} a position command can return. */
export const MOBILE_SOCIAL_FEED_POSITION_RESOLUTIONS = [
  'resolved',
  'choose_position',
  'no_open_position',
  'unknown_market',
] as const;

/** Result of resolving a position command. */
export type MobileSocialFeedPositionResolution =
  (typeof MOBILE_SOCIAL_FEED_POSITION_RESOLUTIONS)[number];

/** Every {@link MobileSocialFeedTradingResolution} a viewing account can report. */
export const MOBILE_SOCIAL_FEED_TRADING_RESOLUTIONS = [
  'no_viewing_account',
  'none',
  'unique',
  'choose_position',
  'unavailable',
] as const;

/** Resolution of a viewing account's trading targets. */
export type MobileSocialFeedTradingResolution =
  (typeof MOBILE_SOCIAL_FEED_TRADING_RESOLUTIONS)[number];

/** Every {@link MobileSocialFeedActionPriceBasis} used by a historical action marker. */
export const MOBILE_SOCIAL_FEED_ACTION_PRICE_BASES = [
  'execution',
  'liquidation_oracle',
] as const;

/** Price source for a historical action marker. */
export type MobileSocialFeedActionPriceBasis =
  (typeof MOBILE_SOCIAL_FEED_ACTION_PRICE_BASES)[number];

/** Every {@link MobileSocialFeedChartDataQuality} a readable chart can report. */
export const MOBILE_SOCIAL_FEED_CHART_DATA_QUALITIES = [
  'ready',
  'partial',
] as const;

/** Chart source completeness; wholly unavailable sources fail the request. */
export type MobileSocialFeedChartDataQuality =
  (typeof MOBILE_SOCIAL_FEED_CHART_DATA_QUALITIES)[number];

/** Every {@link MobileSocialFeedActionResolution} for an order's action segments. */
export const MOBILE_SOCIAL_FEED_ACTION_RESOLUTIONS = [
  'ready',
  'pending',
] as const;

/** Projection state of an order's authoritative action segments. */
export type MobileSocialFeedActionResolution =
  (typeof MOBILE_SOCIAL_FEED_ACTION_RESOLUTIONS)[number];

/** Every {@link MobileSocialFeedPositionResolutionReason} for an empty command result. */
export const MOBILE_SOCIAL_FEED_POSITION_RESOLUTION_REASONS = [
  'no_open_position',
  'unknown_market',
] as const;

/** Explanation for an empty position command result. */
export type MobileSocialFeedPositionResolutionReason =
  (typeof MOBILE_SOCIAL_FEED_POSITION_RESOLUTION_REASONS)[number];

/** Every {@link MobileSocialFeedActionUnavailableReason} that prevents publication. */
export const MOBILE_SOCIAL_FEED_ACTION_UNAVAILABLE_REASONS = [
  'position_closed',
  'already_published',
  'unavailable',
] as const;

/** Reason an action cannot be published. */
export type MobileSocialFeedActionUnavailableReason =
  (typeof MOBILE_SOCIAL_FEED_ACTION_UNAVAILABLE_REASONS)[number];

/** Every {@link MobileSocialFeedLiquidationPriceQuality}, including inapplicable estimates. */
export const MOBILE_SOCIAL_FEED_LIQUIDATION_PRICE_QUALITIES = [
  ...MOBILE_SOCIAL_FEED_PNL_QUALITIES,
  'not_applicable',
] as const;

/** Availability of an estimated liquidation price. */
export type MobileSocialFeedLiquidationPriceQuality =
  (typeof MOBILE_SOCIAL_FEED_LIQUIDATION_PRICE_QUALITIES)[number];

/** Every {@link MobileSocialFeedPresenceState} an individual page can report. */
export const MOBILE_SOCIAL_FEED_PRESENCE_STATES = [
  'watching',
  'heartbeat',
  'left',
] as const;

/** Presence lifecycle reported by an individual page. */
export type MobileSocialFeedPresenceState =
  (typeof MOBILE_SOCIAL_FEED_PRESENCE_STATES)[number];

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

/** Nonrecursive root-item preview carried by replies; Tip roots have a null position. */
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
export interface MobileServerSocialFeedReply extends Omit<
  MobileServerSocialFeedItemBase,
  'market'
> {
  /** Reply discriminant. */
  kind: 'reply';
  /** Root market metadata; null for replies beneath a public Tip. */
  market: MobileServerSocialFeedMarket | null;
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

/** Top-level comment and all readable descendants from the same thread snapshot. */
export interface MobileServerSocialFeedCommentGroup extends MobileServerSocialFeedReply {
  /** Flat descendants in creation-time, depth, then UUID order; empty when none. */
  replies: MobileServerSocialFeedReply[];
}

/** Public Tip and its complete readable descendants within an original-post thread. */
export interface MobileServerSocialFeedTipCommentGroup extends MobileServerSocialFeedTip {
  /** Flat descendants in server order; groups never split across pages. */
  replies: MobileServerSocialFeedReply[];
}

/** Top-level Reply or Tip carrying its complete flat replies array, without an outer wrapper. */
export type MobileServerSocialFeedThreadGroup =
  | MobileServerSocialFeedCommentGroup
  | MobileServerSocialFeedTipCommentGroup;

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

/** Accounting bases for historical position funding. */
export const MOBILE_SOCIAL_FEED_FUNDING_BASES = [
  'remaining_position',
  'lifecycle_cumulative',
  'unknown',
] as const;

/** Funding covers the remaining open position or the closed lifecycle. */
export type MobileSocialFeedFundingBasis =
  (typeof MOBILE_SOCIAL_FEED_FUNDING_BASES)[number];

/** Additional history metrics; unavailable values are not zero. */
export interface MobileServerSocialFeedHistoryMetrics {
  /** Archive's average exit price in x18. Null for open, pre-rollout or unpriced positions. Older servers omit it. */
  average_exit_price_x18?: string | null;
  /** Estimated liquidation price in x18, independent of event Oracle and execution prices. */
  estimated_liquidation_price_x18: string | null;
  /** Availability of the estimated price. */
  liquidation_price_quality: MobileSocialFeedLiquidationPriceQuality;
  /** Source time in milliseconds. */
  liquidation_price_as_of_ms: number | null;
  /** Signed funding in x18: remaining position while open, lifecycle cumulative when closed. */
  funding_pnl_x18: string | null;
  /** Accounting scope of the funding amount. */
  funding_basis: MobileSocialFeedFundingBasis;
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

/** Publication choices for a Tip; private Tips still have participant receipts and history. */
export const MOBILE_TIP_VISIBILITIES = ['public', 'private'] as const;

/** Publication choice carried by the signed Tip request. */
export type MobileTipVisibility = (typeof MOBILE_TIP_VISIBILITIES)[number];

/** Business states of a durable Tip, independent of its HTTP success envelope. */
export const MOBILE_TIP_STATUSES = [
  'submitting',
  'reconciling',
  'sending',
  'credited',
  'failed',
  'review_required',
] as const;

/** Current business state of a durable Tip. */
export type MobileTipStatus = (typeof MOBILE_TIP_STATUSES)[number];

/** Gateway dispatch outcomes preserved in a Tip submission result. */
export const MOBILE_TIP_GATEWAY_STATUSES = [
  'accepted',
  'rejected',
  'not_submitted',
  'unknown',
] as const;

/** Gateway outcome independent of whether the Tip has sufficient evidence to permit another dispatch. */
export type MobileTipGatewayStatus =
  (typeof MOBILE_TIP_GATEWAY_STATUSES)[number];

/**
 * Owner-signed WithdrawCollateralV2 in the exact Engine wire format. Unlike other Mobile fields, productId
 * and sendTo retain Engine's camelCase spelling. Preserve these original strings for recovery replays.
 */
export interface MobileServerTipWithdrawal {
  /** Full bytes32 funding identity, matching the outer Mobile sender. */
  sender: Hex;
  /** Cash asset product ID; the current cash flow uses product 0. */
  productId: number;
  /** Net withdrawal amount as a decimal integer in native product units. */
  amount: string;
  /** Engine wallet transaction nonce as an exact decimal string. */
  nonce: string;
  /** Registered recipient DDA, preserving the exact owner-signed address spelling. */
  sendTo: Hex;
  /** Reserved uint128 as a decimal string; the current flow requires zero. */
  appendix: string;
}

/** Wire-format Gateway outcome included alongside durable Tip business state. */
export interface MobileServerTipGatewayResult {
  /** Explicit execute or locally observed dispatch outcome. */
  status: MobileTipGatewayStatus;
  /** Engine error code for a rejected attempt; otherwise null. */
  error_code: number | null;
  /** Engine error name for a rejected attempt; otherwise null. */
  error_name: string | null;
}

/** Indexer collateral-history directions accepted by Tip attribution queries. */
export const MOBILE_TIP_COLLATERAL_DIRECTIONS = [
  'deposit',
  'withdrawal',
] as const;

/** Direction of the exact Indexer collateral submission being annotated. */
export type MobileTipCollateralDirection =
  (typeof MOBILE_TIP_COLLATERAL_DIRECTIONS)[number];

/** Verification states for one collateral attribution. */
export const MOBILE_TIP_MAPPING_STATES = [
  'pending',
  'complete',
  'review_required',
] as const;

/** Whether the service has finalized the submission's attribution. */
export type MobileTipMappingState = (typeof MOBILE_TIP_MAPPING_STATES)[number];

/** Attribution categories reported for collateral submissions. */
export const MOBILE_TIP_COLLATERAL_CLASSIFICATIONS = [
  'pending',
  'ordinary',
  'split',
  'tip_only',
] as const;

/** Final or provisional ordinary-versus-Tip attribution of one submission. */
export type MobileTipCollateralClassification =
  (typeof MOBILE_TIP_COLLATERAL_CLASSIFICATIONS)[number];

/** Wire-format attribution for one exact Indexer collateral submission. */
export interface MobileServerTipCollateralMapping {
  /** Exact bytes32 source identity. */
  subaccount: Hex;
  /** Source asset product ID. */
  product_id: number;
  /** Source collateral direction. */
  direction: MobileTipCollateralDirection;
  /** Exact unsigned 64-bit Indexer submission index. */
  submission_idx: string;
  /** Verification state independent of any already known amounts. */
  mapping_state: MobileTipMappingState;
  /** Attribution category; pending does not imply a known zero Tip amount. */
  classification: MobileTipCollateralClassification;
  /** Verified deposit principal in x18 units; null when unknown or for withdrawals. */
  deposit_total_x18: string | null;
  /** Tip contribution in x18 units, or null while unknown. */
  tip_total_x18: string | null;
  /** Verified ordinary remainder in x18 units; null when unknown or for withdrawals. */
  ordinary_amount_x18: string | null;
}

/** Participant perspectives returned by authenticated Tip reads. */
export const MOBILE_TIP_ROLES = ['sender', 'recipient'] as const;

/** Participant perspective, which controls access to private execution and read state. */
export type MobileTipRole = (typeof MOBILE_TIP_ROLES)[number];

/** Wallet activity directions supported by participant Tip history. */
export const MOBILE_TIPS_HISTORY_DIRECTIONS = [
  'all',
  'sent',
  'received',
] as const;

/** Filter for outgoing Tips, verified incoming Tips, or both. */
export type MobileTipsHistoryDirection =
  (typeof MOBILE_TIPS_HISTORY_DIRECTIONS)[number];

/** Readability states for an existing original-post reference. */
export const MOBILE_TIP_ORIGIN_AVAILABILITIES = [
  'available',
  'unavailable',
] as const;

/** Readability of an existing original-post reference. */
export type MobileTipOriginAvailability =
  (typeof MOBILE_TIP_ORIGIN_AVAILABILITIES)[number];

/** Bases for the sender's displayed fee and total. */
export const MOBILE_TIP_FEE_BASES = [
  'execution_cap',
  'actual',
  'not_executed',
] as const;

/** Whether displayed costs use a confirmed cap, verified execution, or a known non-execution. */
export type MobileTipFeeBasis = (typeof MOBILE_TIP_FEE_BASES)[number];

/** Required identity and nullable public profile fields for one Tip participant. */
export interface MobileServerTipParticipant {
  /** Full bytes32 participant subaccount. */
  subaccount: Hex;
  /** Public display name, or null when no profile name is available. */
  display_name: string | null;
  /** Public avatar URL, or null when no avatar is available. */
  avatar_url: string | null;
}

/** Sender-only fee breakdown in integer x18 units. */
export interface MobileServerTipSenderCost {
  /** Highest execution fee explicitly approved by the sender. */
  max_fee_x18: string;
  /** Verified execution fee, or null until known. */
  actual_fee_x18: string | null;
  /** Verified net amount plus execution fee, or null until known. */
  actual_total_x18: string | null;
  /** Fee shown using the specified basis; zero for known non-execution. */
  display_fee_x18: string;
  /** Total shown using the specified basis; zero for known non-execution. */
  display_total_x18: string;
  /** not_executed requires confirmed non-execution after termination, with all actual/display amounts zero. */
  fee_basis: MobileTipFeeBasis;
}

/** Participant history fields; the fee breakdown is available only from detail. */
export interface MobileServerTipHistoryCommon {
  /** Payment record UUID. */
  tip_id: string;
  /** Current business state, retaining verified credit history through review. */
  tip_status: MobileTipStatus;
  /** Sending participant. */
  sender: MobileServerTipParticipant;
  /** Receiving participant. */
  recipient: MobileServerTipParticipant;
  /** Source asset product ID. */
  product_id: number;
  /** Net payment amount in integer x18 units. */
  net_amount_x18: string;
  /** Public Feed publication preference. */
  visibility: MobileTipVisibility;
  /** Unmodified message, or null. */
  note: string | null;
  /** Original admission time in UTC milliseconds. */
  submitted_at_ms: number;
  /** Verified recipient credit time in UTC milliseconds, or null. */
  credited_at_ms: number | null;
  /** Exact withdrawal submission index, or null. */
  withdrawal_submission_idx: string | null;
  /** Exact recipient deposit submission index, or null. */
  deposit_submission_idx: string | null;
}

/** Tip detail shared by the sender and the recipient. */
export interface MobileServerTipDetailCommon extends MobileServerTipHistoryCommon {
  /** Exact optimistic-concurrency version as a decimal integer string. */
  version: string;
  /** Catalog background identifier fixed when Mobile admitted the Tip. */
  background_id: string;
  /** Opaque catalog version fixed at admission. */
  background_version: string;
  /** Saved original-post UUID, or null for a profile Tip. */
  origin_post_id: string | null;
  /** Current original-post readability, or null when no reference exists. */
  origin_availability: MobileTipOriginAvailability | null;
  /** Public Feed item UUID while readable, otherwise null. */
  feed_item_id: string | null;
}

/** Sender detail, including private execution facts and no recipient read state. */
export interface MobileServerSenderTipDetail extends MobileServerTipDetailCommon {
  /** Sender perspective. */
  role: 'sender';
  /** Sender-only fee breakdown. */
  sender_cost: MobileServerTipSenderCost;
  /** Latest Gateway outcome, independent of verified recipient credit. */
  gateway: MobileServerTipGatewayResult;
  /** Open-ended processing reason, or null when none is recorded. */
  processing_reason: string | null;
}

/** Recipient detail, available after verified credit and excluding sender execution facts. */
export interface MobileServerRecipientTipDetail extends MobileServerTipDetailCommon {
  /** Recipient perspective. */
  role: 'recipient';
  /** First explicit acknowledgment time in UTC milliseconds, or null while unread. */
  seen_at: number | null;
}

/** Authenticated detail whose role determines its private fields. */
export type MobileServerTipDetail =
  | MobileServerSenderTipDetail
  | MobileServerRecipientTipDetail;

/** Outgoing history row without recipient read state. */
export interface MobileServerSenderTipHistoryRow extends MobileServerTipHistoryCommon {
  /** Sender perspective. */
  role: 'sender';
}

/** Verified incoming history row with its first explicit acknowledgment time. */
export interface MobileServerRecipientTipHistoryRow extends MobileServerTipHistoryCommon {
  /** Recipient perspective. */
  role: 'recipient';
  /** First acknowledgment in UTC milliseconds, or null while unread. */
  seen_at: number | null;
}

/** Role-specific row returned by participant Tip history. */
export type MobileServerTipHistoryRow =
  | MobileServerSenderTipHistoryRow
  | MobileServerRecipientTipHistoryRow;

/** Unread receipt card for a verified incoming Tip, including credit later placed under review. */
export interface MobileServerReceivedTipCard {
  /** Payment record UUID. */
  tip_id: string;
  /** Sending participant. */
  sender: MobileServerTipParticipant;
  /** Verified net payment amount in integer x18 units. */
  net_amount_x18: string;
  /** Unmodified message, or null. */
  note: string | null;
  /** Catalog background identifier fixed at admission. */
  background_id: string;
  /** Opaque catalog version fixed at admission. */
  background_version: string;
  /** Verified credit time in UTC milliseconds. */
  credited_at_ms: number;
  /** Always null; reading or preloading a receipt does not acknowledge it. */
  seen_at: null;
}
