import { Hex } from 'viem';

/** Content filters accepted by the six F01 lists. Empty or omitted means all. */
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

/** Signed F01 query fields. Anonymous credentials never belong in these payloads. */
export interface MobileServerSocialFeedQueryRequestByType {
  /** Chronological recommendations with author/thread constraints. */
  for_you_feed: MobileServerCategorizedFeedParams;
  /** Chronological content by eligible Top Traders. */
  top_traders_feed: MobileServerCategorizedFeedParams;
  /** Content by authors followed by the authenticated sender. */
  friends_feed: MobileServerCategorizedFeedParams;
  /** Published content by the target identity. */
  profile_feed: MobileServerCategorizedFeedParams & {
    /** Target identity, encoded before filters. */
    subaccount: Hex;
  };
  /** Published content in one market; no category filter. */
  market_feed: MobileServerSocialFeedListParams & {
    /** Non-negative market ID, encoded before filters. */
    product_id: number;
  };
  /** Published content in one position lifecycle; no category filter. */
  position_feed: MobileServerSocialFeedListParams & {
    /** Canonical lowercase UUID, encoded before filters. */
    position_id: string;
  };
  /** A single item, optionally reusing an authorized reading session. */
  feed_item: {
    /** Canonical lowercase item UUID. */
    item_id: string;
    /** Preview size, 0–3; defaults to 3. */
    comment_preview_limit?: number;
    /** Omit to create an item session directly. */
    session_id?: string;
  };
  /** Batch updates restricted to the session's authorized viewport. */
  feed_updates: {
    /** Reading session returned by a list or item query. */
    session_id: string;
    /** Up to 50 distinct, previously delivered item UUIDs. */
    visible_item_ids: string[];
    /** Up to 20 distinct, authorized position UUIDs. */
    visible_position_ids: string[];
    /** Opaque server update baseline; omit when changing the viewport. */
    update_cursor?: string;
    /** Non-negative safe integer; increment when the visible set changes. */
    viewport_revision: number;
    /** Non-negative safe integer; increment for every poll. */
    request_seq: number;
  };
}

/** Signed F01 operation names. */
export type MobileServerSocialFeedQueryType =
  keyof MobileServerSocialFeedQueryRequestByType;

/** Public F01 queries exclude Friends and require an anonymous credential for updates. */
export type MobileServerPublicSocialFeedRequestByType = {
  [K in Exclude<
    MobileServerSocialFeedQueryType,
    'friends_feed'
  >]: MobileServerSocialFeedQueryRequestByType[K] &
    (K extends 'feed_updates'
      ? {
          /** Credential belonging to the anonymous session. */
          viewer_token: string;
        }
      : {
          /** Reuse the anonymous identity returned by an earlier read. */
          viewer_token?: string;
        });
};

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

/** Public author identity and authenticated follow perspective. */
export interface MobileServerFeedAuthor {
  /** Full identity subaccount. */
  subaccount: Hex;
  /** Null for an unclaimed identity. */
  username: string | null;
  /** Null for an unclaimed identity. */
  display_name: string | null;
  /** Avatar URL when available. */
  avatar_url: string | null;
  /** Null on public reads; signed reads reflect the sender's follow graph. */
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

/** Position displayed inside an F01 trade card. */
export interface MobileServerFeedPositionCard extends MobileServerFeedPositionPatch {
  /** Market product ID. */
  product_id: number;
  /** Market display metadata. */
  market: MobileServerFeedMarket;
  /** Position direction. */
  direction: 'long' | 'short';
}

/** Interaction counters; F01 does not yet enable interaction writes. */
export interface MobileServerFeedInteraction {
  /** Number of likes. */
  like_count: number;
  /** Number of comments. */
  comment_count: number;
  /** Number of recorded views. */
  view_count: number;
  /** Null for anonymous viewers. */
  liked_by_me: boolean | null;
}

/** Metadata shared by the automatic trade cards and rows available in F01. */
export interface MobileServerSocialFeedItemBase {
  /** Item UUID. */
  id: string;
  /** Whether authored analysis exists. */
  has_analysis: boolean;
  /** F01 does not return drawings. */
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
  /** Server capability flags; all false in F01. */
  capabilities: {
    /** Whether liking is available. */
    can_like: boolean;
    /** Whether commenting is available. */
    can_comment: boolean;
    /** Whether exposure recording is available. */
    can_record_view: boolean;
  };
}

/** Automatic trade card returned by F01. */
export interface MobileServerSocialTradeCard extends MobileServerSocialFeedItemBase {
  /** Card discriminant. */
  kind: 'trade_card';
  /** Trading action. */
  action: 'opened' | 'closed' | 'increased' | 'reduced';
  /** Card text, empty for automatic cards. */
  text: string;
  /** F01 automatic cards have no mentions. */
  mentions: never[];
  /** Current or frozen position display. */
  position: MobileServerFeedPositionCard;
  /** Interaction counters. */
  interaction: MobileServerFeedInteraction;
  /** F01 does not provide comment content. */
  comment_preview: {
    /** Empty in F01. */
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

/** F01 content union; posts, replies, drawings, and interaction writes are later phases. */
export type MobileServerSocialFeedItem =
  | MobileServerSocialTradeCard
  | MobileServerSocialTradeRow;

/** Fixed-duration F01 reading session. Credentials and cursors must be returned unchanged. */
export interface MobileServerFeedReadSession {
  /** Session identifier. */
  session_id: string;
  /** F01 supports feed and item sessions. */
  mode: 'feed' | 'item';
  /** Fixed expiration time in Unix milliseconds; pagination does not extend it. */
  expires_at_ms: number;
  /** Exposure metadata only; recording is not available in F01. */
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
  /** All authors have a qualifying badge from the cohort. */
  items: Array<
    MobileServerSocialFeedItem & {
      /** Qualified author. */
      author: MobileServerFeedAuthor & {
        /** Non-null qualifying badge. */
        trader_badge: MobileServerTraderBadge;
        /** Unavailable authors cannot qualify. */
        trader_data_status: 'ready' | 'stale';
      };
    }
  >;
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
  /** Response reference time in Unix milliseconds. */
  as_of_ms: number;
}

/** F01 response payloads, without the success envelope. */
export interface MobileServerSocialFeedQueryResponseByType {
  /** For You list. */
  for_you_feed: MobileServerRankedFeedPage;
  /** Top Traders list with qualification metadata. */
  top_traders_feed: MobileServerTopTradersFeedPage;
  /** Authenticated following list. */
  friends_feed: MobileServerRankedFeedPage;
  /** Author's published content. */
  profile_feed: MobileServerSocialFeedPage;
  /** Market's published content. */
  market_feed: MobileServerSocialFeedPage;
  /** Position's published content, not full position history. */
  position_feed: MobileServerSocialFeedPage;
  /** Single item and reading session. */
  feed_item: MobileServerSocialFeedItemResponse;
  /** Authorized viewport updates. */
  feed_updates: MobileServerFeedUpdatesResponse;
}
