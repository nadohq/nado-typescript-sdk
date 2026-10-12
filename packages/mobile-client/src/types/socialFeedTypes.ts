import { Subaccount } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { MobileSignedRequestParams } from './clientTypes';
import {
  MobileFeedMarketCategory,
  MobileServerFeedAuthor,
  MobileServerFeedInteraction,
  MobileServerFeedItemPatch,
  MobileServerFeedLeverage,
  MobileServerFeedMarket,
  MobileServerFeedPnl,
  MobileServerFeedPositionCard,
  MobileServerFeedPositionPatch,
  MobileServerFeedReadSession,
  MobileServerFeedUpdatesResponse,
  MobileServerRankedFeedPage,
  MobileServerSocialFeedItem,
  MobileServerSocialFeedItemResponse,
  MobileServerSocialFeedPage,
  MobileServerSocialTradeCard,
  MobileServerSocialTradeRow,
  MobileServerTopTradersFeedPage,
  MobileServerTraderBadge,
  MobileSocialFeedType,
} from './serverSocialFeedTypes';

type CamelCase<Key extends string> = Key extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : Key;

/**
 * Client representation of an F01 response: camelCase keys and exact BigNumber x18 integers.
 * X18 fields retain their original units (divide by 10^18 for display). Version strings,
 * opaque tokens, null values, and optional patch fields retain their wire semantics.
 */
export type MobileFeedModel<T> = T extends readonly (infer Item)[]
  ? MobileFeedModel<Item>[]
  : T extends object
    ? {
        [K in keyof T as K extends string
          ? CamelCase<K>
          : K]: K extends `${string}_x18`
          ? Exclude<T[K], string> | BigNumber
          : MobileFeedModel<T[K]>;
      }
    : T;

/** Account-level official 30-day qualification badge. */
export type MobileTraderBadge = MobileFeedModel<MobileServerTraderBadge>;

/** Feed author with optional badge and the selected viewing account's follow state. */
export type MobileFeedAuthor = MobileFeedModel<MobileServerFeedAuthor>;

/** Feed market metadata. */
export type MobileFeedMarket = MobileFeedModel<MobileServerFeedMarket>;

/** Leverage value and its availability basis. */
export type MobileFeedLeverage = MobileFeedModel<MobileServerFeedLeverage>;

/** Position PnL; amountX18 is an exact integer, not display units. */
export type MobileFeedPnl = MobileFeedModel<MobileServerFeedPnl>;

/** Mutable position facts at one version. */
export type MobileFeedPositionPatch =
  MobileFeedModel<MobileServerFeedPositionPatch>;

/** Position card with market and direction. */
export type MobileFeedPositionCard =
  MobileFeedModel<MobileServerFeedPositionCard>;

/** Read-only interaction counters. */
export type MobileFeedInteraction =
  MobileFeedModel<MobileServerFeedInteraction>;

/** Automatic F01 trade card. */
export type MobileSocialTradeCard =
  MobileFeedModel<MobileServerSocialTradeCard>;

/** F01 size-change or liquidation row. */
export type MobileSocialTradeRow = MobileFeedModel<MobileServerSocialTradeRow>;

/** F01 content, narrowed by kind and action. */
export type MobileSocialFeedItem = MobileFeedModel<MobileServerSocialFeedItem>;

/** Fixed 15-minute reading session and optional anonymous credential. */
export type MobileFeedReadSession =
  MobileFeedModel<MobileServerFeedReadSession>;

/** Fixed-window list; empty pages with a nextCursor must still be advanced. */
export type MobileSocialFeedPage = MobileFeedModel<MobileServerSocialFeedPage>;

/** Main-feed page with its ranking version. */
export type MobileRankedFeedPage = MobileFeedModel<MobileServerRankedFeedPage>;

/** Top Traders page with qualified author badges and cohort metadata. */
export type MobileTopTradersFeedPage =
  MobileFeedModel<MobileServerTopTradersFeedPage>;

/** Item details and its reading session. */
export type MobileSocialFeedItemResponse =
  MobileFeedModel<MobileServerSocialFeedItemResponse>;

/** Item delta; absent fields remain unchanged and null clears a value. */
export type MobileFeedItemPatch = MobileFeedModel<MobileServerFeedItemPatch>;

/** Batch updates, revocations, and new-content hints for a viewport. */
export type MobileFeedUpdates =
  MobileFeedModel<MobileServerFeedUpdatesResponse>;

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

/** Filters and fixed-session pagination common to all six F01 lists. */
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
  /** Preview size, 0–3; default 3. F01 returns no comment content. */
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
