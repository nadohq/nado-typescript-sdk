import { Subaccount } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { Hex } from 'viem';
import { MobileSignedRequestParams } from './clientTypes';
import {
  MobileFeedMarketCategory,
  MobileSocialFeedType,
} from './serverSocialFeedTypes';

/** Official account-level 30-day PnL badge, independent of position PnL. */
export interface MobileTraderBadge {
  /** Qualification tier. */
  code: 'shark' | 'whale';
  /** Signed integer in x18 units. */
  pnl: BigNumber;
  /** Stable compatibility identifier for the official Portfolio month result. */
  metricKey: 'account_pnl_30d_equity';
  /** PnL window label. */
  window: '30d';
  /** Official source timestamp in Unix milliseconds. */
  sourceAsOfMs: number;
  /** Fetch completion timestamp in Unix milliseconds. */
  fetchedAtMs: number;
  /** Qualification snapshot UUID. */
  snapshotId: string;
}

/** Public author identity and the selected viewing account's follow state. */
export interface MobileFeedAuthor {
  /** Full identity subaccount. */
  subaccount: Hex;
  /** Null for an unclaimed identity. */
  username: string | null;
  /** Null for an unclaimed identity. */
  displayName: string | null;
  /** Avatar URL when available. */
  avatarUrl: string | null;
  /** Public view_as or signed sender's follow state; null without a viewing account. */
  isFollowing: boolean | null;
  /** Null when no qualifying badge is available. */
  traderBadge: MobileTraderBadge | null;
  /** Stale means the last successful cohort is used after a refresh failure. */
  traderDataStatus: 'ready' | 'stale' | 'unavailable';
}

/** Market metadata from the service's authoritative market source. */
export interface MobileFeedMarket {
  /** Market product ID. */
  productId: number;
  /** Market symbol. */
  symbol: string;
  /** Logo URL when available. */
  logoUrl: string | null;
  /** Social feed category when known. */
  category: MobileFeedMarketCategory | null;
  /** Original market categories. */
  sourceCategories: Array<'crypto' | 'stocks' | 'forex' | 'commodities'>;
}

/** Leverage display value; unknown isolated leverage differs from inapplicable cross leverage. */
export interface MobileFeedLeverage {
  /** Rounded whole-number string, or null. Never an estimated replacement. */
  value: string | null;
  /** Cross margin uses not_applicable. */
  basis: 'effective' | 'unknown' | 'not_applicable';
}

/** Position PnL with explicit accounting basis and data quality. */
export interface MobileFeedPnl {
  /** Signed x18 integer; null means unknown, not zero. */
  amount: BigNumber | null;
  /** Open positions exclude fees/funding; closed results include them. */
  basis: 'unrealized_excl_fees_funding' | 'realized_incl_fees_funding';
  /** Closed positions use frozen results. */
  mode: 'live' | 'frozen';
  /** Source timestamp in Unix milliseconds. */
  asOfMs: number;
  /** Whether accounting is complete, pending, or unavailable. */
  quality: 'ready' | 'pending' | 'unavailable';
}

/** Complete mutable position fields delivered together at one version. */
export interface MobileFeedPositionPatch {
  /** Position lifecycle UUID. */
  positionId: string;
  /** Positive integer string; compare as integers without Number conversion. */
  positionVersion: string;
  /** Position state timestamp in Unix milliseconds. */
  stateAsOfMs: number;
  /** Remaining average entry price in decimal units, frozen on close; null if unknown. */
  entryPrice: BigNumber | null;
  /** Basis of the displayed size and entry price. */
  displayBasis: 'current_position' | 'closing_snapshot';
  /** Closing snapshot reference time, or null. */
  snapshotAtMs: number | null;
  /** Absolute quantity in x18 units. */
  quantity: BigNumber;
  /** Notional value in x18 units. */
  notional: BigNumber;
  /** Current lifecycle state. */
  state: 'open' | 'closed';
  /** Completeness of the available historical facts. */
  historyQuality: 'complete' | 'partial';
  /** Margin mode. */
  marginMode: 'cross' | 'isolated';
  /** Current or closing leverage. */
  leverage: MobileFeedLeverage;
  /** Leverage reference time; null when unknown or inapplicable. */
  leverageAtMs: number | null;
  /** Current remaining PnL or the closed lifecycle's net result. */
  pnl: MobileFeedPnl;
}

/** Position displayed inside an automatic trade card. */
export interface MobileFeedPositionCard extends MobileFeedPositionPatch {
  /** Market product ID. */
  productId: number;
  /** Market display metadata. */
  market: MobileFeedMarket;
  /** Position direction. */
  direction: 'long' | 'short';
}

/** Interaction counters; interaction writes are not currently available. */
export interface MobileFeedInteraction {
  /** Number of likes. */
  likeCount: number;
  /** Number of comments. */
  commentCount: number;
  /** Number of recorded views. */
  viewCount: number;
  /** Null while likes are unavailable, including with a viewing account or signature. */
  likedByMe: boolean | null;
}

/** Metadata shared by the automatic trade cards and rows available from the social feed. */
export interface MobileSocialFeedItemBase {
  /** Item UUID. */
  id: string;
  /** Whether authored analysis exists. */
  hasAnalysis: boolean;
  /** Drawings are not currently available. */
  drawing: null;
  /** Author identity, badge, and follow perspective. */
  author: MobileFeedAuthor;
  /** Creation time in Unix milliseconds. */
  createdAtMs: number;
  /** Sorting time in Unix milliseconds. */
  displayAtMs: number;
  /** Positive integer version string. */
  version: string;
  /** Market metadata. */
  market: MobileFeedMarket;
  /** Server capability flags; currently all false. */
  capabilities: {
    /** Whether liking is available. */
    canLike: boolean;
    /** Whether commenting is available. */
    canComment: boolean;
    /** Whether exposure recording is available. */
    canRecordView: boolean;
  };
}

/** Automatic trade card returned by the social feed. */
export interface MobileSocialTradeCard extends MobileSocialFeedItemBase {
  /** Card discriminant. */
  kind: 'trade_card';
  /** Trading action. */
  action: 'opened' | 'closed' | 'increased' | 'reduced';
  /** Card text, empty for automatic cards. */
  text: string;
  /** Automatic cards have no mentions. */
  mentions: never[];
  /** Current or frozen position display. */
  position: MobileFeedPositionCard;
  /** Interaction counters. */
  interaction: MobileFeedInteraction;
  /** Comment content is not currently available. */
  commentPreview: {
    /** Currently empty. */
    items: never[];
    /** Comment count. */
    totalCount: number;
    /** Comment cursor, if available. */
    nextCursor: string | null;
  };
}

/** Fields shared by size-change and liquidation trade rows. */
export interface MobileSocialTradeRowBase extends MobileSocialFeedItemBase {
  /** Row discriminant. */
  kind: 'trade_row';
  /** Associated lifecycle UUID. */
  positionId: string;
  /** Position direction. */
  direction: 'long' | 'short';
  /** Historical margin mode. */
  marginMode: 'cross' | 'isolated';
  /** Historical action leverage, not the position's current leverage. */
  leverage: MobileFeedLeverage;
  /** Historical leverage reference time. */
  leverageAtMs: number | null;
  /** Number of aggregated trades. */
  tradeCount: number;
  /** Absolute traded quantity in x18 units. */
  quantity: BigNumber;
  /** Actual execution price in decimal units, never an Oracle substitution. */
  averagePrice: BigNumber | null;
}

/** A size-change row or liquidation row with independently nullable financial facts. */
export type MobileSocialTradeRow = MobileSocialTradeRowBase &
  (
    | {
        /** Ordinary size-change action. */
        action: 'increased' | 'reduced';
        /** Executed notional in x18 units. */
        notional: BigNumber;
      }
    | {
        /** Liquidation discriminant. */
        action: 'liquidated';
        /** Quantity times event Oracle; null if that Oracle is unknown. */
        notional: BigNumber | null;
        /** Entry price immediately before the event, in decimal units. */
        entryPrice: BigNumber | null;
        /** Event Oracle price in decimal units, used for display and size filtering. */
        liquidationOraclePrice: BigNumber | null;
        /** Actual execution price in decimal units, independent of Oracle. */
        liquidationExecutionPrice: BigNumber | null;
        /** Signed action PnL excluding ordinary fees/funding, or null. */
        realizedPnlDelta: BigNumber | null;
      }
  );

/** Automatic feed content; excludes posts, replies, drawings, and interaction writes. */
export type MobileSocialFeedItem = MobileSocialTradeCard | MobileSocialTradeRow;

/** Fixed-duration social feed reading session. Credentials and cursors must be returned unchanged. */
export interface MobileFeedReadSession {
  /** Session identifier. */
  sessionId: string;
  /** Feed or direct item session. */
  mode: 'feed' | 'item';
  /** Fixed expiration time in Unix milliseconds; pagination does not extend it. */
  expiresAtMs: number;
  /** Exposure metadata only; recording is not available from the social feed. */
  viewTracking: {
    /** Required visible fraction. */
    minVisibleRatio: number;
    /** Required visible duration in milliseconds. */
    minDurationMs: number;
  };
  /** Initial update baseline, distinct from the page cursor. */
  updateCursor: string | null;
  /** Returned only to the corresponding anonymous viewer. Do not log or cache publicly. */
  viewerToken?: string;
}

/** Fixed-window list response; an empty page can still have a next cursor. */
export interface MobileSocialFeedPage {
  /** Reading session and anonymous credential when applicable. */
  readSession: MobileFeedReadSession;
  /** Visible items in server order; deduplicate by ID without local reordering. */
  items: MobileSocialFeedItem[];
  /** Opaque cursor; null only when pagination is complete. */
  nextCursor: string | null;
  /** New-content baseline, not a pagination or update cursor. */
  watermark: string;
}

/** Main-feed page with its ordering version. */
export interface MobileRankedFeedPage extends MobileSocialFeedPage {
  /** Current ordering contract: chronological-v1. */
  rankingVersion: string;
}

/** Top Traders page, with one shared qualification snapshot for eligibility and badges. */
export interface MobileTopTradersFeedPage extends MobileRankedFeedPage {
  /** All authors have a qualifying badge from the cohort. */
  items: Array<
    MobileSocialFeedItem & {
      /** Qualified author. */
      author: MobileFeedAuthor & {
        /** Non-null qualifying badge. */
        traderBadge: MobileTraderBadge;
        /** Unavailable authors cannot qualify. */
        traderDataStatus: 'ready' | 'stale';
      };
    }
  >;
  /** Author eligibility snapshot. */
  cohort: {
    /** Cohort UUID. */
    snapshotId: string;
    /** Ready or the previous successful snapshot after a refresh failure. */
    status: 'ready' | 'stale';
    /** Coverage of all eligible candidate authors. */
    coverage: {
      /** Coverage domain. */
      scope: 'eligible_content_candidates';
      /** Candidate author count. */
      totalAuthors: number;
      /** Authors queried for this snapshot. */
      queriedAuthors: number;
      /** A successful response requires complete coverage. */
      complete: true;
    };
  };
}

/** Item details with either a new item session or the reused authorized session. */
export interface MobileSocialFeedItemResponse {
  /** Full visible item. */
  item: MobileSocialFeedItem;
  /** Session authorized for subsequent updates. */
  readSession: MobileFeedReadSession;
}

/** Item delta: omitted means unchanged; explicit null clears a prior value. */
export interface MobileFeedItemPatch {
  /** Target item UUID. */
  itemId: string;
  /** Positive integer version string. */
  version: string;
  /** Updated interaction counters. */
  interaction?: MobileFeedInteraction;
  /** Updated display timestamp; does not reorder the current list. */
  displayAtMs?: number;
  /** Updated aggregate count. */
  tradeCount?: number;
  /** Updated quantity in x18 units. */
  quantity?: BigNumber;
  /** Updated notional; liquidation Oracle may be unknown. */
  notional?: BigNumber | null;
  /** Updated actual execution price in decimal units. */
  averagePrice?: BigNumber | null;
  /** Historical liquidation entry price in decimal units. */
  entryPrice?: BigNumber | null;
  /** Updated liquidation Oracle price in decimal units. */
  liquidationOraclePrice?: BigNumber | null;
  /** Updated actual liquidation execution price in decimal units. */
  liquidationExecutionPrice?: BigNumber | null;
  /** Updated signed action PnL. */
  realizedPnlDelta?: BigNumber | null;
  /** Updated historical row leverage. */
  leverage?: MobileFeedLeverage;
  /** Updated historical leverage reference time. */
  leverageAtMs?: number | null;
}

/** Batched viewport updates; apply only the current viewport's latest request sequence. */
export interface MobileFeedUpdates {
  /** Item deltas, independent of current-position patches. */
  itemPatches: MobileFeedItemPatch[];
  /** Complete mutable position facts at one version. */
  positionPatches: MobileFeedPositionPatch[];
  /** Previously authorized targets that can no longer be read. */
  unavailableTargets: Array<{
    /** Target kind. */
    type: 'item' | 'position';
    /** Target UUID. */
    id: string;
    /** Uniform reason prevents leaking inaccessible content. */
    reason: 'unavailable';
  }>;
  /** New-content hint; always zero for directly created item sessions. */
  newItemsCount: number;
  /** Baseline to use for the next update call with the same viewport. */
  updateCursor: string;
  /** True means a full snapshot of applicable mutable fields was returned. */
  reset: boolean;
  /** Echoed viewport revision. */
  viewportRevision: number;
  /** Echoed request sequence. */
  requestSeq: number;
  /** Response reference time in Unix milliseconds. */
  asOfMs: number;
}

/** Public browsing requires no wallet, identity registration, or one-click trading setup. */
export interface MobilePublicFeedReadAccess {
  /** Public routes never sign, even when the client has a wallet or linked signer. */
  auth?: never;
  /** Non-isolated identity subaccount used for public relationships, not private access. */
  viewAs?: Subaccount;
  /** Reuse the original browser credential for pagination and existing sessions. */
  viewerToken?: string;
}

/** Public browsing or an explicit signed read for private content; contexts cannot be mixed. */
export type MobileFeedReadAccess =
  | {
      /** Sign as this identity, using the client's linked signer or owner wallet. */
      auth: MobileSignedRequestParams;
      /** Signed reads use the verified sender as their viewing account. */
      viewAs?: never;
      /** Anonymous credentials are forbidden on signed queries. */
      viewerToken?: never;
    }
  | MobilePublicFeedReadAccess;

/** Filters and fixed-session pagination common to all six social feed lists. */
export interface MobileSocialFeedListParams {
  /** OR-ed content filters; empty or omitted means all. */
  feedTypes?: MobileSocialFeedType[];
  /** Strict minimum in whole dollars, including 500; omit for all sizes. */
  minimumNotional?: number;
  /** Page size, 1–50; server default is 20. */
  limit?: number;
  /** Required with cursor; reuse the original filters, target, viewAs, credential, and limit. */
  sessionId?: string;
  /** Opaque cursor returned by nextCursor. Never substitute an update cursor. */
  cursor?: string;
}

/** Public-only request for For You and Top Traders. */
export type GetMobileForYouFeedParams = MobileSocialFeedListParams &
  MobilePublicFeedReadAccess & {
    /** Omit to include all market categories. */
    marketCategory?: MobileFeedMarketCategory;
  };

/** Top Traders request; eligibility uses account PnL and results remain chronological. */
export type GetMobileTopTradersFeedParams = GetMobileForYouFeedParams;

/** Public content from the selected account's follow graph; no signature is required. */
export type GetMobileFriendsFeedParams = GetMobileForYouFeedParams & {
  /** Required on every request, including pagination; no existing identity row is needed. */
  viewAs: Subaccount;
};

/** Author list request; the target is distinct from the signing identity. */
export type GetMobileProfileFeedParams = MobileSocialFeedListParams &
  MobileFeedReadAccess & {
    /** Target author, independent of the public viewAs account. */
    subaccount: Subaccount;
    /** Omit to include all market categories. */
    marketCategory?: MobileFeedMarketCategory;
  };

/** Market list request; marketCategory is not accepted. */
export type GetMobileMarketFeedParams = MobileSocialFeedListParams &
  MobileFeedReadAccess & {
    /** Non-negative target product ID. */
    productId: number;
  };

/** Published content in a lifecycle, not the complete position history. */
export type GetMobilePositionFeedParams = MobileSocialFeedListParams &
  MobileFeedReadAccess & {
    /** Target position UUID. */
    positionId: string;
  };

/** Item request; omit sessionId to create an item reading session directly. */
export type GetMobileFeedItemParams = MobileFeedReadAccess & {
  /** Target item UUID. */
  itemId: string;
  /** Preview size, 0–3; default 3. Comment content is not currently available. */
  commentPreviewLimit?: number;
  /** Existing session authorized for the item. */
  sessionId?: string;
};

/** Viewport update request; anonymous calls require the original viewerToken. */
export type GetMobileFeedUpdatesParams = {
  /** Inherited from the original session; updates cannot select a different viewing account. */
  viewAs?: never;
  /** Current reading session. */
  sessionId: string;
  /** Up to 50 distinct, already delivered item UUIDs. */
  visibleItemIds: string[];
  /** Up to 20 distinct, authorized position UUIDs. */
  visiblePositionIds: string[];
  /** Baseline from the last accepted update; omit for a changed viewport. */
  updateCursor?: string;
  /** Increment whenever the visible set changes. */
  viewportRevision: number;
  /** Increment on every request; accept only the latest response for the current viewport. */
  requestSeq: number;
} & (
  | {
      /** Signing identity matching the session. */
      auth: MobileSignedRequestParams;
      /** Forbidden on signed reads. */
      viewerToken?: never;
    }
  | {
      /** Public read. */
      auth?: never;
      /** Credential belonging to the anonymous session. */
      viewerToken: string;
    }
);
