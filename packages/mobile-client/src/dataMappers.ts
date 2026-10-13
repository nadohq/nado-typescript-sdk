import { removeDecimals, subaccountToHex, toBigNumber } from '@nadohq/shared';
import {
  GetMobileFollowListParams,
  MobileFeedAuthor,
  MobileFeedInteraction,
  MobileFeedItemPatch,
  MobileFeedMarket,
  MobileFeedPage,
  MobileFeedPnl,
  MobileFeedPositionCard,
  MobileFeedPositionPatch,
  MobileFeedReadSession,
  MobileFeedTrade,
  MobileFeedUpdates,
  MobileFollowListPage,
  MobileFollowMutationResult,
  MobileFollowSummary,
  MobileIdentitySummary,
  MobileNotificationPreferenceScope,
  MobileNotificationPreferences,
  MobileProfilesInclude,
  MobilePublicFeedReadAccess,
  MobilePublicProfile,
  MobileRankedFeedPage,
  MobileRegisteredWallet,
  MobileSocialFeedItem,
  MobileSocialFeedItemBase,
  MobileSocialFeedItemResponse,
  MobileSocialFeedListParams,
  MobileSocialFeedPage,
  MobileSocialTradeCard,
  MobileSocialTradeRow,
  MobileSocialTradeRowBase,
  MobileTopTradersFeedPage,
  MobileTraderBadge,
} from './types/clientTypes';
import { MobileServerFollowMutationResponse } from './types/serverExecuteTypes';
import {
  MobileServerFeedAuthor,
  MobileServerFeedInteraction,
  MobileServerFeedItemPatch,
  MobileServerFeedMarket,
  MobileServerFeedPnl,
  MobileServerFeedPositionCard,
  MobileServerFeedPositionPatch,
  MobileServerFeedReadSession,
  MobileServerFeedTrade,
  MobileServerFeedUpdatesResponse,
  MobileServerFollowSummary,
  MobileServerIdentitySummary,
  MobileServerNotificationPreferenceScope,
  MobileServerNotificationPreferences,
  MobileServerProfile,
  MobileServerRankedFeedPage,
  MobileServerSocialFeedItem,
  MobileServerSocialFeedItemBase,
  MobileServerSocialFeedItemResponse,
  MobileServerSocialFeedPage,
  MobileServerSocialTradeCard,
  MobileServerSocialTradeRow,
  MobileServerSocialTradeRowBase,
  MobileServerTopTradersFeedPage,
  MobileServerTraderBadge,
} from './types/serverModelTypes';
import {
  MobileServerFeedResponse,
  MobileServerFollowListResponse,
  MobileServerRegisteredWalletResponse,
} from './types/serverQueryTypes';
import {
  MobileServerFollowListRequest,
  MobileServerProfilesInclude,
  MobileServerPublicFeedReadParams,
  MobileServerSocialFeedListParams,
} from './types/serverRequestTypes';

/**
 * Maps a server-side public profile (snake_case) to its client-side (camelCase) representation. The three
 * include-gated fields stay `undefined` when the backend omitted them, rather than being coerced to `null`
 * or zero, so callers can tell "not requested" from a real value.
 */
export function mapMobilePublicProfile(
  server: MobileServerProfile,
): MobilePublicProfile {
  return {
    subaccount: server.subaccount,
    username: server.username,
    displayName: server.display_name,
    privateMode: server.private_mode,
    followerCount: server.follower_count,
    followingCount: server.following_count,
    followSummary: server.follow_summary
      ? mapMobileFollowSummary(server.follow_summary)
      : undefined,
  };
}

/**
 * Maps a server-side identity summary (snake_case) to its client-side (camelCase) representation.
 */
function mapMobileIdentitySummary(
  server: MobileServerIdentitySummary,
): MobileIdentitySummary {
  return {
    subaccount: server.subaccount,
    username: server.username,
    displayName: server.display_name,
    avatarUrl: server.avatar_url,
  };
}

/**
 * Maps a server-side follow summary to its client-side representation.
 */
function mapMobileFollowSummary(
  server: MobileServerFollowSummary,
): MobileFollowSummary {
  return {
    isFollowing: server.is_following,
    followedByCount: server.followed_by_count,
    followedBy: server.followed_by.map(mapMobileIdentitySummary),
  };
}

/**
 * Maps a server-side Followers or Following response to a client-side {@link MobileFollowListPage}. Rows
 * keep `isFollowing` absent when the request named no `viewAs`, rather than defaulting it to `false`.
 */
export function mapMobileFollowListPage(
  server: MobileServerFollowListResponse,
): MobileFollowListPage {
  return {
    accounts: server.accounts.map((account) => ({
      identity: mapMobileIdentitySummary(account.identity),
      isFollowing: account.is_following,
      followerCount: account.follower_count,
    })),
    nextCursor: server.next_cursor,
  };
}

/**
 * Maps a server-side follow or unfollow response to its client-side representation.
 */
export function mapMobileFollowMutationResult(
  server: MobileServerFollowMutationResponse,
): MobileFollowMutationResult {
  return {
    isFollowing: server.is_following,
    followerCount: server.follower_count,
  };
}

/**
 * Maps server-side notification preferences (snake_case) to their client-side (camelCase) representation.
 */
export function mapMobileNotificationPreferences(
  server: MobileServerNotificationPreferences,
): MobileNotificationPreferences {
  return {
    schemaVersion: server.schema_version,
    categories: server.categories.map((category) => ({
      category: category.category,
      enabled: category.enabled,
      scopes: category.scopes.map(mapMobileNotificationPreferenceScope),
    })),
  };
}

function mapMobileNotificationPreferenceScope(
  server: MobileServerNotificationPreferenceScope,
): MobileNotificationPreferenceScope {
  if (server.type === 'subaccount') {
    return { type: 'subaccount', subaccount: server.subaccount };
  }
  return { type: 'product', productId: server.product_id };
}

/**
 * Maps client-side profiles includes (camelCase) to the server-side (snake_case) wire shape.
 */
export function mapMobileProfilesIncludeToServer(
  include: MobileProfilesInclude,
): MobileServerProfilesInclude {
  return {
    follow_counts: include.followCounts,
    follow_summary: include.followSummary
      ? { view_as: subaccountToHex(include.followSummary.viewAs) }
      : undefined,
  };
}

/**
 * Maps the client-side params of a Followers or Following page to the server-side wire shape. Both list
 * directions take identical params and differ only in the `type` the caller dispatches on.
 */
export function mapMobileFollowListParamsToServer(
  params: GetMobileFollowListParams,
): MobileServerFollowListRequest {
  return {
    subaccount: subaccountToHex(params.target),
    view_as: params.viewAs ? subaccountToHex(params.viewAs) : undefined,
    cursor: params.cursor,
    limit: params.limit,
  };
}

/**
 * Maps client-side notification preferences (camelCase) to the server-side (snake_case) wire shape.
 */
export function mapMobileNotificationPreferencesToServer(
  preferences: MobileNotificationPreferences,
): MobileServerNotificationPreferences {
  return {
    schema_version: preferences.schemaVersion,
    categories: preferences.categories.map((category) => ({
      category: category.category,
      enabled: category.enabled,
      scopes: category.scopes.map(mapMobileNotificationPreferenceScopeToServer),
    })),
  };
}

function mapMobileNotificationPreferenceScopeToServer(
  scope: MobileNotificationPreferenceScope,
): MobileServerNotificationPreferenceScope {
  if (scope.type === 'subaccount') {
    return { type: 'subaccount', subaccount: scope.subaccount };
  }
  return { type: 'product', product_id: scope.productId };
}

/**
 * Maps a server-side feed trade (snake_case) to its client-side (camelCase) representation.
 */
function mapMobileFeedTrade(server: MobileServerFeedTrade): MobileFeedTrade {
  return {
    ...mapMobileIdentitySummary(server),
    orderDigest: server.order_digest,
    productId: server.product_id,
    quantity: server.quantity,
    notional: server.notional,
    averagePrice: server.average_price,
    margin: {
      mode: server.margin.mode,
      estimatedLeverage: server.margin.estimated_leverage,
    },
    position: server.position,
    realizedPnl: server.realized_pnl,
    filledAt: server.filled_at_ms,
  };
}

/**
 * Maps a server-side feed response to a client-side {@link MobileFeedPage}.
 */
export function mapMobileFeedPage(
  server: MobileServerFeedResponse,
): MobileFeedPage {
  return {
    trades: server.trades.map(mapMobileFeedTrade),
    nextCursor: server.next_cursor,
  };
}

/**
 * Maps a server-side registered wallet (snake_case) to its client-side (camelCase) representation.
 */
export function mapMobileRegisteredWallet(
  server: MobileServerRegisteredWalletResponse,
): MobileRegisteredWallet {
  return {
    wallet: server.wallet,
    platform: server.platform,
    locale: server.locale,
    appVersion: server.app_version,
    tokenFingerprintPrefix: server.token_fingerprint_prefix,
    lastSeenAt: server.last_seen_at,
  };
}

/**
 * Maps the official account PnL badge, retaining x18 amount units.
 * @param server - The service response.
 * @returns The mapped trader badge.
 */
export function mapMobileTraderBadge(
  server: MobileServerTraderBadge,
): MobileTraderBadge {
  return {
    code: server.code,
    pnl: toBigNumber(server.pnl_x18),
    metricKey: server.metric_key,
    window: server.window,
    sourceAsOfMs: server.source_as_of_ms,
    fetchedAtMs: server.fetched_at_ms,
    snapshotId: server.snapshot_id,
  };
}

/**
 * Maps author identity, relationship state, and optional qualification badge.
 * @param server - The service response.
 * @returns The mapped feed author.
 */
export function mapMobileFeedAuthor(
  server: MobileServerFeedAuthor,
): MobileFeedAuthor {
  return {
    ...mapMobileIdentitySummary(server),
    isFollowing: server.is_following,
    traderBadge:
      server.trader_badge === null
        ? null
        : mapMobileTraderBadge(server.trader_badge),
    traderDataStatus: server.trader_data_status,
  };
}

/**
 * Maps social market metadata.
 * @param server - The service response.
 * @returns The mapped feed market.
 */
export function mapMobileFeedMarket(
  server: MobileServerFeedMarket,
): MobileFeedMarket {
  return {
    productId: server.product_id,
    symbol: server.symbol,
    logoUrl: server.logo_url,
    category: server.category,
    sourceCategories: server.source_categories,
  };
}

/**
 * Maps position PnL while retaining x18 amount units and availability.
 * @param server - The service response.
 * @returns The mapped feed pnl.
 */
export function mapMobileFeedPnl(server: MobileServerFeedPnl): MobileFeedPnl {
  return {
    amount: server.amount_x18 === null ? null : toBigNumber(server.amount_x18),
    basis: server.basis,
    mode: server.mode,
    asOfMs: server.as_of_ms,
    quality: server.quality,
  };
}

/**
 * Maps complete position facts, converting entry price to decimal units.
 * @param server - The service response.
 * @returns The mapped feed position patch.
 */
export function mapMobileFeedPositionPatch(
  server: MobileServerFeedPositionPatch,
): MobileFeedPositionPatch {
  return {
    positionId: server.position_id,
    positionVersion: server.position_version,
    stateAsOfMs: server.state_as_of_ms,
    entryPrice: removeDecimals(server.entry_price_x18),
    displayBasis: server.display_basis,
    snapshotAtMs: server.snapshot_at_ms,
    quantity: toBigNumber(server.quantity_x18),
    notional: toBigNumber(server.notional_x18),
    state: server.state,
    historyQuality: server.history_quality,
    marginMode: server.margin_mode,
    leverage: server.leverage,
    leverageAtMs: server.leverage_at_ms,
    pnl: mapMobileFeedPnl(server.pnl),
  };
}

/**
 * Maps a position card with its current or frozen financial state.
 * @param server - The service response.
 * @returns The mapped feed position card.
 */
export function mapMobileFeedPositionCard(
  server: MobileServerFeedPositionCard,
): MobileFeedPositionCard {
  return {
    ...mapMobileFeedPositionPatch(server),
    productId: server.product_id,
    market: mapMobileFeedMarket(server.market),
    direction: server.direction,
  };
}

/**
 * Maps interaction counters without inventing unavailable relationship state.
 * @param server - The service response.
 * @returns The mapped feed interaction.
 */
export function mapMobileFeedInteraction(
  server: MobileServerFeedInteraction,
): MobileFeedInteraction {
  return {
    likeCount: server.like_count,
    commentCount: server.comment_count,
    viewCount: server.view_count,
    likedByMe: server.liked_by_me,
  };
}

/**
 * Maps common item metadata and server capabilities.
 * @param server - The service response.
 * @returns The mapped social feed item base.
 */
export function mapMobileSocialFeedItemBase(
  server: MobileServerSocialFeedItemBase,
): MobileSocialFeedItemBase {
  return {
    id: server.id,
    hasAnalysis: server.has_analysis,
    drawing: server.drawing,
    author: mapMobileFeedAuthor(server.author),
    createdAtMs: server.created_at_ms,
    displayAtMs: server.display_at_ms,
    version: server.version,
    market: mapMobileFeedMarket(server.market),
    capabilities: {
      canLike: server.capabilities.can_like,
      canComment: server.capabilities.can_comment,
      canRecordView: server.capabilities.can_record_view,
    },
  };
}

/**
 * Maps an automatic trade card and its position and interaction metadata.
 * @param server - The service response.
 * @returns The mapped social trade card.
 */
export function mapMobileSocialTradeCard(
  server: MobileServerSocialTradeCard,
): MobileSocialTradeCard {
  return {
    ...mapMobileSocialFeedItemBase(server),
    kind: server.kind,
    action: server.action,
    text: server.text,
    mentions: server.mentions,
    position: mapMobileFeedPositionCard(server.position),
    interaction: mapMobileFeedInteraction(server.interaction),
    commentPreview: {
      items: server.comment_preview.items,
      totalCount: server.comment_preview.total_count,
      nextCursor: server.comment_preview.next_cursor,
    },
  };
}

/**
 * Maps historical trade facts with decimal execution prices and x18 quantities.
 * @param server - The service response.
 * @returns The mapped social trade row base.
 */
export function mapMobileSocialTradeRowBase(
  server: MobileServerSocialTradeRowBase,
): MobileSocialTradeRowBase {
  return {
    ...mapMobileSocialFeedItemBase(server),
    kind: server.kind,
    positionId: server.position_id,
    direction: server.direction,
    marginMode: server.margin_mode,
    leverage: server.leverage,
    leverageAtMs: server.leverage_at_ms,
    tradeCount: server.trade_count,
    quantity: toBigNumber(server.quantity_x18),
    averagePrice: removeDecimals(server.average_price_x18),
  };
}

/**
 * Maps size changes and independently nullable liquidation facts.
 * @param server - The service response.
 * @returns The mapped social trade row.
 */
export function mapMobileSocialTradeRow(
  server: MobileServerSocialTradeRow,
): MobileSocialTradeRow {
  const base = mapMobileSocialTradeRowBase(server);
  if (server.action === 'liquidated') {
    return {
      ...base,
      action: server.action,
      notional:
        server.notional_x18 === null ? null : toBigNumber(server.notional_x18),
      entryPrice: removeDecimals(server.entry_price_x18),
      liquidationOraclePrice: removeDecimals(
        server.liquidation_oracle_price_x18,
      ),
      liquidationExecutionPrice: removeDecimals(
        server.liquidation_execution_price_x18,
      ),
      realizedPnlDelta:
        server.realized_pnl_delta_x18 === null
          ? null
          : toBigNumber(server.realized_pnl_delta_x18),
    };
  }
  return {
    ...base,
    action: server.action,
    notional: toBigNumber(server.notional_x18),
  };
}

/**
 * Maps the item variant without mixing card and row fields.
 * @param server - The service response.
 * @returns The mapped social feed item.
 */
export function mapMobileSocialFeedItem(
  server: MobileServerSocialFeedItem,
): MobileSocialFeedItem {
  return server.kind === 'trade_card'
    ? mapMobileSocialTradeCard(server)
    : mapMobileSocialTradeRow(server);
}

/**
 * Maps a fixed reading session, preserving opaque credentials and cursors.
 * @param server - The service response.
 * @returns The mapped feed read session.
 */
export function mapMobileFeedReadSession(
  server: MobileServerFeedReadSession,
): MobileFeedReadSession {
  return {
    sessionId: server.session_id,
    mode: server.mode,
    expiresAtMs: server.expires_at_ms,
    viewTracking: {
      minVisibleRatio: server.view_tracking.min_visible_ratio,
      minDurationMs: server.view_tracking.min_duration_ms,
    },
    updateCursor: server.update_cursor,
    viewerToken: server.viewer_token,
  };
}

/**
 * Maps a fixed feed page without changing item order or pagination.
 * @param server - The service response.
 * @returns The mapped social feed page.
 */
export function mapMobileSocialFeedPage(
  server: MobileServerSocialFeedPage,
): MobileSocialFeedPage {
  return {
    readSession: mapMobileFeedReadSession(server.read_session),
    items: server.items.map(mapMobileSocialFeedItem),
    nextCursor: server.next_cursor,
    watermark: server.watermark,
  };
}

/**
 * Maps a main feed page and its ranking version.
 * @param server - The service response.
 * @returns The mapped ranked feed page.
 */
export function mapMobileRankedFeedPage(
  server: MobileServerRankedFeedPage,
): MobileRankedFeedPage {
  return {
    ...mapMobileSocialFeedPage(server),
    rankingVersion: server.ranking_version,
  };
}

/**
 * Maps qualified trader items and their shared eligibility snapshot.
 * @param server - The service response.
 * @returns The mapped top traders feed page.
 */
export function mapMobileTopTradersFeedPage(
  server: MobileServerTopTradersFeedPage,
): MobileTopTradersFeedPage {
  return {
    ...mapMobileRankedFeedPage(server),
    cohort: {
      snapshotId: server.cohort.snapshot_id,
      status: server.cohort.status,
      coverage: {
        scope: server.cohort.coverage.scope,
        totalAuthors: server.cohort.coverage.total_authors,
        queriedAuthors: server.cohort.coverage.queried_authors,
        complete: server.cohort.coverage.complete,
      },
    },
  };
}

/**
 * Maps item details and the authorized reading session.
 * @param server - The service response.
 * @returns The mapped social feed item response.
 */
export function mapMobileSocialFeedItemResponse(
  server: MobileServerSocialFeedItemResponse,
): MobileSocialFeedItemResponse {
  return {
    item: mapMobileSocialFeedItem(server.item),
    readSession: mapMobileFeedReadSession(server.read_session),
  };
}

/**
 * Maps item deltas, preserving omitted fields and explicit null clears.
 * @param server - The service response.
 * @returns The mapped feed item patch.
 */
export function mapMobileFeedItemPatch(
  server: MobileServerFeedItemPatch,
): MobileFeedItemPatch {
  return {
    itemId: server.item_id,
    version: server.version,
    author: mapMobileFeedAuthor(server.author),
    displayAtMs: server.display_at_ms,
    ...(server.interaction === undefined
      ? {}
      : { interaction: mapMobileFeedInteraction(server.interaction) }),
    ...(server.trade_count === undefined
      ? {}
      : { tradeCount: server.trade_count }),
    ...(server.quantity_x18 === undefined
      ? {}
      : { quantity: toBigNumber(server.quantity_x18) }),
    ...(server.notional_x18 === undefined
      ? {}
      : {
          notional:
            server.notional_x18 === null
              ? null
              : toBigNumber(server.notional_x18),
        }),
    ...(server.average_price_x18 === undefined
      ? {}
      : {
          averagePrice: removeDecimals(server.average_price_x18),
        }),
    ...(server.entry_price_x18 === undefined
      ? {}
      : {
          entryPrice: removeDecimals(server.entry_price_x18),
        }),
    ...(server.liquidation_oracle_price_x18 === undefined
      ? {}
      : {
          liquidationOraclePrice: removeDecimals(
            server.liquidation_oracle_price_x18,
          ),
        }),
    ...(server.liquidation_execution_price_x18 === undefined
      ? {}
      : {
          liquidationExecutionPrice: removeDecimals(
            server.liquidation_execution_price_x18,
          ),
        }),
    ...(server.realized_pnl_delta_x18 === undefined
      ? {}
      : {
          realizedPnlDelta:
            server.realized_pnl_delta_x18 === null
              ? null
              : toBigNumber(server.realized_pnl_delta_x18),
        }),
    ...(server.leverage === undefined ? {} : { leverage: server.leverage }),
    ...(server.leverage_at_ms === undefined
      ? {}
      : { leverageAtMs: server.leverage_at_ms }),
  };
}

/**
 * Maps viewport changes while preserving the sequence and update baseline.
 * @param server - The service response.
 * @returns The mapped feed updates.
 */
export function mapMobileFeedUpdates(
  server: MobileServerFeedUpdatesResponse,
): MobileFeedUpdates {
  return {
    itemPatches: server.item_patches.map(mapMobileFeedItemPatch),
    positionPatches: server.position_patches.map(mapMobileFeedPositionPatch),
    unavailableTargets: server.unavailable_targets,
    newItemsCount: server.new_items_count,
    updateCursor: server.update_cursor,
    reset: server.reset,
    viewportRevision: server.viewport_revision,
    requestSeq: server.request_seq,
  };
}

/**
 * Maps common list parameters to the public query wire format without inserting defaults.
 * @param params - Client filters and session pagination.
 * @returns Wire fields; undefined options are omitted when serialized to JSON.
 */
export function mapMobileSocialFeedListParamsToServer(
  params: MobileSocialFeedListParams,
): MobileServerSocialFeedListParams {
  return {
    feed_types: params.feedTypes,
    minimum_notional: params.minimumNotional,
    limit: params.limit,
    session_id: params.sessionId,
    cursor: params.cursor,
  };
}

/**
 * Maps the public viewing account and browser credential without inferring an identity.
 * @param params - Public relationship perspective and optional session credential.
 * @returns Wire fields for a public feed read.
 */
export function mapMobilePublicFeedReadParamsToServer(
  params: MobilePublicFeedReadAccess,
): MobileServerPublicFeedReadParams {
  return {
    view_as:
      params.viewAs === undefined ? undefined : subaccountToHex(params.viewAs),
    viewer_token: params.viewerToken,
  };
}
