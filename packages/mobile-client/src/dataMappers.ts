import { removeDecimals, subaccountToHex, toBigNumber } from '@nadohq/shared';
import {
  GetMobileFollowListParams,
  MobileAvatarPreset,
  MobileAvatarSelection,
  MobileAvatarUpload,
  MobileFeedPage,
  MobileFeedTrade,
  MobileFollowBatchResultItem,
  MobileFollowListPage,
  MobileFollowMutationResult,
  MobileFollowSummary,
  MobileIdentitySummary,
  MobileNotificationPreferenceScope,
  MobileNotificationPreferences,
  MobileProfileSearchPage,
  MobileProfilesInclude,
  MobilePublicProfile,
  MobileRegisteredWallet,
  MobileSocialFeedActionCandidate,
  MobileSocialFeedActionMarker,
  MobileSocialFeedActionResolutionResult,
  MobileSocialFeedAuthor,
  MobileSocialFeedCandle,
  MobileSocialFeedCommentResult,
  MobileSocialFeedComments,
  MobileSocialFeedCompactCard,
  MobileSocialFeedDrawing,
  MobileSocialFeedDrawingResult,
  MobileSocialFeedHistoryMetrics,
  MobileSocialFeedInteraction,
  MobileSocialFeedItem,
  MobileSocialFeedItemBase,
  MobileSocialFeedItemPatch,
  MobileSocialFeedItemResponse,
  MobileSocialFeedLikeResult,
  MobileSocialFeedListParams,
  MobileSocialFeedMarket,
  MobileSocialFeedMentionParams,
  MobileSocialFeedPage,
  MobileSocialFeedPnl,
  MobileSocialFeedPositionAction,
  MobileSocialFeedPositionCard,
  MobileSocialFeedPositionChart,
  MobileSocialFeedPositionHistory,
  MobileSocialFeedPositionPatch,
  MobileSocialFeedPositionResolutionResult,
  MobileSocialFeedPositions,
  MobileSocialFeedPost,
  MobileSocialFeedPresence,
  MobileSocialFeedPublishablePosition,
  MobileSocialFeedRankedPage,
  MobileSocialFeedReadParams,
  MobileSocialFeedReadSession,
  MobileSocialFeedReply,
  MobileSocialFeedTopTradersPage,
  MobileSocialFeedTradeCard,
  MobileSocialFeedTradeRow,
  MobileSocialFeedTradeRowBase,
  MobileSocialFeedTraderBadge,
  MobileSocialFeedTradingContext,
  MobileSocialFeedTradingTarget,
  MobileSocialFeedUpdates,
  MobileSocialFeedViewsResult,
  MobileSocialFeedWatchers,
  SearchMobileProfilesParams,
} from './types/clientTypes';
import { MobileUnsupportedFeedItemError } from './types/MobileUnsupportedFeedItemError';
import {
  MobileServerAvatarUploadResponse,
  MobileServerFollowBatchResponse,
  MobileServerFollowMutationResponse,
  MobileServerSocialFeedCommentResponse,
  MobileServerSocialFeedLikeResponse,
  MobileServerSocialFeedPresenceResponse,
  MobileServerSocialFeedViewsResponse,
} from './types/serverExecuteTypes';
import {
  MobileServerAvatarPreset,
  MobileServerAvatarSelection,
  MobileServerFeedTrade,
  MobileServerFollowSummary,
  MobileServerIdentitySummary,
  MobileServerNotificationPreferenceScope,
  MobileServerNotificationPreferences,
  MobileServerProfile,
  MobileServerSocialFeedActionCandidate,
  MobileServerSocialFeedActionMarker,
  MobileServerSocialFeedAuthor,
  MobileServerSocialFeedCandle,
  MobileServerSocialFeedCompactCard,
  MobileServerSocialFeedDrawing,
  MobileServerSocialFeedHistoryMetrics,
  MobileServerSocialFeedInteraction,
  MobileServerSocialFeedItem,
  MobileServerSocialFeedItemBase,
  MobileServerSocialFeedItemPatch,
  MobileServerSocialFeedMarket,
  MobileServerSocialFeedPnl,
  MobileServerSocialFeedPositionAction,
  MobileServerSocialFeedPositionCard,
  MobileServerSocialFeedPositionPatch,
  MobileServerSocialFeedPost,
  MobileServerSocialFeedPublishablePosition,
  MobileServerSocialFeedReadSession,
  MobileServerSocialFeedReply,
  MobileServerSocialFeedTradeCard,
  MobileServerSocialFeedTradeRow,
  MobileServerSocialFeedTradeRowBase,
  MobileServerSocialFeedTraderBadge,
  MobileServerSocialFeedTradingContext,
  MobileServerSocialFeedTradingTarget,
  MobileSocialFeedMention,
} from './types/serverModelTypes';
import {
  MobileServerFeedResponse,
  MobileServerFollowListResponse,
  MobileServerRegisteredWalletResponse,
  MobileServerSearchProfilesResponse,
  MobileServerSocialFeedActionResolutionResponse,
  MobileServerSocialFeedCommentsResponse,
  MobileServerSocialFeedDrawingResponse,
  MobileServerSocialFeedItemResponse,
  MobileServerSocialFeedPositionChartResponse,
  MobileServerSocialFeedPositionHistoryResponse,
  MobileServerSocialFeedPositionResolutionResponse,
  MobileServerSocialFeedPositionsResponse,
  MobileServerSocialFeedRankedResponse,
  MobileServerSocialFeedResponse,
  MobileServerSocialFeedTopTradersResponse,
  MobileServerSocialFeedUpdatesResponse,
  MobileServerSocialFeedWatchersResponse,
} from './types/serverQueryTypes';
import {
  MobileServerFollowListRequest,
  MobileServerProfilesInclude,
  MobileServerSearchProfilesRequest,
  MobileServerSocialFeedListParams,
  MobileServerSocialFeedReadParams,
} from './types/serverRequestTypes';

/**
 * Maps a server-side avatar preset to its client-side representation.
 */
export function mapMobileAvatarPreset(
  server: MobileServerAvatarPreset,
): MobileAvatarPreset {
  return { id: server.id, avatarUrl: server.avatar_url };
}

/**
 * Maps an upload grant, preserving the signed PUT headers and server-provided lifetime.
 */
export function mapMobileAvatarUpload(
  server: MobileServerAvatarUploadResponse,
): MobileAvatarUpload {
  return {
    uploadKey: server.upload_key,
    uploadUrl: server.upload_url,
    headers: server.headers,
    expiresInSeconds: server.expires_in_seconds,
  };
}

/**
 * Maps a client-side avatar selection to the signed wire payload; null clears the saved avatar.
 */
export function mapMobileAvatarSelectionToServer(
  avatar: MobileAvatarSelection | null,
): MobileServerAvatarSelection | null {
  if (avatar === null) {
    return null;
  }
  if (avatar.type === 'preset') {
    return { type: 'preset', id: avatar.id };
  }
  return { type: 'upload', upload_key: avatar.uploadKey };
}

/**
 * Maps a server-side public profile (snake_case) to its client-side (camelCase) representation. The three
 * include-gated fields stay `undefined` when the backend omitted them, rather than being coerced to `null`
 * or zero, so callers can tell "not requested" from a real value.
 */
export function mapMobilePublicProfile(
  server: MobileServerProfile,
): MobilePublicProfile {
  return {
    ...mapMobileIdentitySummary(server),
    bio: server.bio,
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
 * Maps a server-side profile search page (snake_case) to its client-side (camelCase) representation. Each
 * match goes through {@link mapMobilePublicProfile}, so include-gated fields stay `undefined` when omitted.
 */
export function mapMobileProfileSearchPage(
  server: MobileServerSearchProfilesResponse,
): MobileProfileSearchPage {
  return {
    profiles: server.profiles.map(mapMobilePublicProfile),
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
 * Maps a server-side batch follow or unfollow response to its client-side representation.
 */
export function mapMobileFollowBatchResult(
  server: MobileServerFollowBatchResponse,
): MobileFollowBatchResultItem[] {
  return server.results.map((result) => ({
    subaccount: result.subaccount,
    isFollowing: result.is_following,
    followerCount: result.follower_count,
  }));
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
 * Maps the client-side params of a profile search page to the server-side wire shape.
 */
export function mapMobileProfileSearchParamsToServer(
  params: SearchMobileProfilesParams,
): MobileServerSearchProfilesRequest {
  return {
    query: params.query,
    include: params.include
      ? mapMobileProfilesIncludeToServer(params.include)
      : undefined,
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
export function mapMobileSocialFeedTraderBadge(
  server: MobileServerSocialFeedTraderBadge,
): MobileSocialFeedTraderBadge {
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
export function mapMobileSocialFeedAuthor(
  server: MobileServerSocialFeedAuthor,
): MobileSocialFeedAuthor {
  return {
    ...mapMobileIdentitySummary(server),
    isFollowing: server.is_following,
    traderBadge:
      server.trader_badge === null
        ? null
        : mapMobileSocialFeedTraderBadge(server.trader_badge),
    traderDataStatus: server.trader_data_status,
  };
}

/**
 * Maps social market metadata.
 * @param server - The service response.
 * @returns The mapped feed market.
 */
export function mapMobileSocialFeedMarket(
  server: MobileServerSocialFeedMarket,
): MobileSocialFeedMarket {
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
export function mapMobileSocialFeedPnl(
  server: MobileServerSocialFeedPnl,
): MobileSocialFeedPnl {
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
export function mapMobileSocialFeedPositionPatch(
  server: MobileServerSocialFeedPositionPatch,
): MobileSocialFeedPositionPatch {
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
    pnl: mapMobileSocialFeedPnl(server.pnl),
    ...(server.current_position === undefined
      ? {}
      : {
          currentPosition: mapMobileSocialFeedHistoryMetrics(
            server.current_position,
          ),
        }),
  };
}

/**
 * Maps a position card with its current or frozen financial state.
 * @param server - The service response.
 * @returns The mapped feed position card.
 */
export function mapMobileSocialFeedPositionCard(
  server: MobileServerSocialFeedPositionCard,
): MobileSocialFeedPositionCard {
  return {
    ...mapMobileSocialFeedPositionPatch(server),
    productId: server.product_id,
    market: mapMobileSocialFeedMarket(server.market),
    direction: server.direction,
  };
}

/**
 * Maps interaction counters without inventing unavailable relationship state.
 * @param server - The service response.
 * @returns The mapped feed interaction.
 */
export function mapMobileSocialFeedInteraction(
  server: MobileServerSocialFeedInteraction,
): MobileSocialFeedInteraction {
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
    drawing:
      server.drawing === null
        ? null
        : mapMobileSocialFeedDrawing(server.drawing),
    author: mapMobileSocialFeedAuthor(server.author),
    createdAtMs: server.created_at_ms,
    displayAtMs: server.display_at_ms,
    version: server.version,
    market: mapMobileSocialFeedMarket(server.market),
    capabilities: {
      canLike: server.capabilities.can_like,
      canComment: server.capabilities.can_comment,
      canRecordView: server.capabilities.can_record_view,
    },
  };
}

/**
 * Maps a trade card, authored content, and position and interaction metadata.
 * @param server - The service response.
 * @returns The mapped social trade card.
 */
export function mapMobileSocialFeedTradeCard(
  server: MobileServerSocialFeedTradeCard,
): MobileSocialFeedTradeCard {
  return {
    ...mapMobileSocialFeedItemBase(server),
    kind: server.kind,
    action: server.action,
    text: server.text,
    mentions: server.mentions,
    position: mapMobileSocialFeedPositionCard(server.position),
    interaction: mapMobileSocialFeedInteraction(server.interaction),
    commentPreview: {
      items: server.comment_preview.items.map(mapMobileSocialFeedReply),
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
export function mapMobileSocialFeedTradeRowBase(
  server: MobileServerSocialFeedTradeRowBase,
): MobileSocialFeedTradeRowBase {
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
export function mapMobileSocialFeedTradeRow(
  server: MobileServerSocialFeedTradeRow,
): MobileSocialFeedTradeRow {
  const base = mapMobileSocialFeedTradeRowBase(server);
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
 * @throws {MobileUnsupportedFeedItemError} If an item kind is not supported by this SDK.
 */
export function mapMobileSocialFeedItem(
  server: MobileServerSocialFeedItem,
): MobileSocialFeedItem {
  const kind = server.kind;
  switch (server.kind) {
    case 'trade_card':
      return mapMobileSocialFeedTradeCard(server);
    case 'trade_row':
      return mapMobileSocialFeedTradeRow(server);
    case 'post':
      return mapMobileSocialFeedPost(server);
    case 'reply':
      return mapMobileSocialFeedReply(server);
    default:
      throw new MobileUnsupportedFeedItemError(kind);
  }
}

/**
 * Maps a fixed reading session, preserving opaque credentials and cursors.
 * @param server - The service response.
 * @returns The mapped feed read session.
 */
export function mapMobileSocialFeedReadSession(
  server: MobileServerSocialFeedReadSession,
): MobileSocialFeedReadSession {
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
 * @throws {MobileUnsupportedFeedItemError} If an item kind is not supported by this SDK.
 */
export function mapMobileSocialFeedPage(
  server: MobileServerSocialFeedResponse,
): MobileSocialFeedPage {
  return {
    readSession: mapMobileSocialFeedReadSession(server.read_session),
    items: server.items.map(mapMobileSocialFeedItem),
    nextCursor: server.next_cursor,
    watermark: server.watermark,
  };
}

/**
 * Maps a main feed page and its ranking version.
 * @param server - The service response.
 * @returns The mapped ranked feed page.
 * @throws {MobileUnsupportedFeedItemError} If an item kind is not supported by this SDK.
 */
export function mapMobileSocialFeedRankedPage(
  server: MobileServerSocialFeedRankedResponse,
): MobileSocialFeedRankedPage {
  return {
    ...mapMobileSocialFeedPage(server),
    rankingVersion: server.ranking_version,
  };
}

/**
 * Maps qualified trader items and their shared eligibility snapshot.
 * @param server - The service response.
 * @returns The mapped top traders feed page.
 * @throws {MobileUnsupportedFeedItemError} If an item kind is not supported by this SDK.
 */
export function mapMobileSocialFeedTopTradersPage(
  server: MobileServerSocialFeedTopTradersResponse,
): MobileSocialFeedTopTradersPage {
  return {
    ...mapMobileSocialFeedRankedPage(server),
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
 * @throws {MobileUnsupportedFeedItemError} If an item kind is not supported by this SDK.
 */
export function mapMobileSocialFeedItemResponse(
  server: MobileServerSocialFeedItemResponse,
): MobileSocialFeedItemResponse {
  return {
    item: mapMobileSocialFeedItem(server.item),
    readSession: mapMobileSocialFeedReadSession(server.read_session),
  };
}

/**
 * Maps item deltas, preserving omitted fields and explicit null clears.
 * @param server - The service response.
 * @returns The mapped feed item patch.
 */
export function mapMobileSocialFeedItemPatch(
  server: MobileServerSocialFeedItemPatch,
): MobileSocialFeedItemPatch {
  return {
    itemId: server.item_id,
    version: server.version,
    ...(server.attached_position === undefined
      ? {}
      : {
          attachedPosition:
            server.attached_position === null
              ? null
              : mapMobileSocialFeedPositionCard(server.attached_position),
        }),
    ...(server.attachment_status === undefined
      ? {}
      : { attachmentStatus: server.attachment_status }),
    author: mapMobileSocialFeedAuthor(server.author),
    displayAtMs: server.display_at_ms,
    ...(server.interaction === undefined
      ? {}
      : { interaction: mapMobileSocialFeedInteraction(server.interaction) }),
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
export function mapMobileSocialFeedUpdates(
  server: MobileServerSocialFeedUpdatesResponse,
): MobileSocialFeedUpdates {
  return {
    itemPatches: server.item_patches.map(mapMobileSocialFeedItemPatch),
    positionPatches: server.position_patches.map(
      mapMobileSocialFeedPositionPatch,
    ),
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
export function mapMobileSocialFeedReadParamsToServer(
  params: MobileSocialFeedReadParams,
): MobileServerSocialFeedReadParams {
  return {
    view_as:
      params.viewAs === undefined ? undefined : subaccountToHex(params.viewAs),
    viewer_token: params.viewerToken,
  };
}

/**
 * Maps a mention for signing without changing the text or offsets.
 * @param params - Caller-provided mention and original text offsets.
 * @returns The wire-format mention, preserving the original label and code-point offsets.
 * @throws {Error} If the owner is not a 20-byte address or the subaccount name cannot be encoded in 12 bytes.
 * @example
 * ```ts
 * const mention = mapMobileSocialFeedMentionToServer({
 *   subaccount: {
 *     subaccountOwner: '0x1111111111111111111111111111111111111111',
 *     subaccountName: 'default',
 *   },
 *   start: 0,
 *   end: 6,
 *   label: '@alice',
 * });
 * console.log(mention.start, mention.end, mention.label); // 0, 6, "@alice"
 * ```
 */
export function mapMobileSocialFeedMentionToServer(
  params: MobileSocialFeedMentionParams,
): MobileSocialFeedMention {
  return {
    subaccount: subaccountToHex(params.subaccount),
    start: params.start,
    end: params.end,
    label: params.label,
  };
}
/**
 * Preserves parsed drawing data, including false and zero.
 * @param server - Service payload with its original wire fields.
 * @returns The original parsed drawing data and its creation/update timestamps in milliseconds.
 * @example
 * ```ts
 * const drawing = mapMobileSocialFeedDrawing({
 *   data: false,
 *   created_at_ms: 1700000000000,
 *   updated_at_ms: 1700000001000,
 * });
 * console.log(drawing.data); // false, not null
 * ```
 */
export function mapMobileSocialFeedDrawing(
  server: MobileServerSocialFeedDrawing,
): MobileSocialFeedDrawing {
  return {
    data: server.data,
    createdAtMs: server.created_at_ms,
    updatedAtMs: server.updated_at_ms,
  };
}
/**
 * Maps a nonrecursive root preview, retaining nullable position visibility.
 * @param server - Service payload with its original wire fields.
 * @returns A nonrecursive preview with a nullable position and notional retained as an x18 BigNumber.
 * @example
 * ```ts
 * declare const serverPreview: MobileServerSocialFeedCompactCard;
 * const preview = mapMobileSocialFeedCompactCard(serverPreview);
 * const notionalX18 = preview.position?.notional.toFixed();
 * ```
 */
export function mapMobileSocialFeedCompactCard(
  server: MobileServerSocialFeedCompactCard,
): MobileSocialFeedCompactCard {
  return {
    id: server.id,
    author: mapMobileSocialFeedAuthor(server.author),
    textExcerpt: server.text_excerpt,
    position:
      server.position === null
        ? null
        : {
            positionId: server.position.position_id,
            market: mapMobileSocialFeedMarket(server.position.market),
            direction: server.position.direction,
            state: server.position.state,
            notional: toBigNumber(server.position.notional_x18),
          },
    hasAnalysis: server.has_analysis,
  };
}
/**
 * Maps an authored post and its readable comments and drawing.
 * @param server - Service payload with its original wire fields.
 * @returns A post with its unchanged text and mentions, mapped position, drawing, interactions, and reply preview.
 * @example
 * ```ts
 * declare const serverPost: MobileServerSocialFeedPost;
 * const post = mapMobileSocialFeedPost(serverPost);
 * const replies = post.commentPreview.items;
 * const nextReplyCursor = post.commentPreview.nextCursor;
 * ```
 */
export function mapMobileSocialFeedPost(
  server: MobileServerSocialFeedPost,
): MobileSocialFeedPost {
  return {
    ...mapMobileSocialFeedItemBase(server),
    kind: server.kind,
    text: server.text,
    mentions: server.mentions,
    position: mapMobileSocialFeedPositionCard(server.position),
    interaction: mapMobileSocialFeedInteraction(server.interaction),
    commentPreview: {
      items: server.comment_preview.items.map(mapMobileSocialFeedReply),
      totalCount: server.comment_preview.total_count,
      nextCursor: server.comment_preview.next_cursor,
    },
  };
}
/**
 * Maps reply visibility without treating an unavailable attachment as an absent one.
 * @param server - Service payload with its original wire fields.
 * @returns A reply preserving omitted reply targets, nullable attachments, and the separate attachment visibility status.
 * @example
 * ```ts
 * declare const serverReply: MobileServerSocialFeedReply;
 * const reply = mapMobileSocialFeedReply(serverReply);
 * const attachmentUnavailable = reply.attachmentStatus === 'unavailable';
 * const attachedPosition = reply.attachedPosition;
 * ```
 */
export function mapMobileSocialFeedReply(
  server: MobileServerSocialFeedReply,
): MobileSocialFeedReply {
  return {
    ...mapMobileSocialFeedItemBase(server),
    kind: server.kind,
    text: server.text,
    mentions: server.mentions,
    rootItemId: server.root_item_id,
    ...(server.reply_to_item_id === undefined
      ? {}
      : { replyToItemId: server.reply_to_item_id }),
    replyToAuthor:
      server.reply_to_author === null
        ? null
        : mapMobileSocialFeedAuthor(server.reply_to_author),
    attachedPosition:
      server.attached_position === null
        ? null
        : mapMobileSocialFeedPositionCard(server.attached_position),
    attachmentStatus: server.attachment_status,
    original: mapMobileSocialFeedCompactCard(server.original),
    interaction: mapMobileSocialFeedInteraction(server.interaction),
  };
}
/**
 * Maps current eligibility hints without implying caller ownership.
 * @param server - Service payload with its original wire fields.
 * @returns A position with current publication, attachment, and drawing eligibility hints and an unavailable reason.
 * @example
 * ```ts
 * declare const serverCandidate: MobileServerSocialFeedPublishablePosition;
 * const candidate = mapMobileSocialFeedPublishablePosition(serverCandidate);
 * const publicationHint = candidate.canPublish;
 * const attachmentHint = candidate.canAttachToComment;
 * ```
 */
export function mapMobileSocialFeedPublishablePosition(
  server: MobileServerSocialFeedPublishablePosition,
): MobileSocialFeedPublishablePosition {
  return {
    position: mapMobileSocialFeedPositionCard(server.position),
    canPublish: server.can_publish,
    canAttachToComment: server.can_attach_to_comment,
    canDrawAnalysis: server.can_draw_analysis,
    unavailableReason: server.unavailable_reason,
  };
}
/**
 * Maps all order action identifiers and eligibility hints.
 * @param server - Service payload with its original wire fields.
 * @returns Trusted action and position identifiers, action kind, publication eligibility, and an unavailable reason.
 * @example
 * ```ts
 * declare const serverCandidate: MobileServerSocialFeedActionCandidate;
 * const candidate = mapMobileSocialFeedActionCandidate(serverCandidate);
 * const publicationTarget = {
 *   actionId: candidate.actionId,
 *   positionId: candidate.positionId,
 * };
 * ```
 */
export function mapMobileSocialFeedActionCandidate(
  server: MobileServerSocialFeedActionCandidate,
): MobileSocialFeedActionCandidate {
  return {
    actionId: server.action_id,
    positionId: server.position_id,
    action: server.action,
    canPublish: server.can_publish,
    unavailableReason: server.unavailable_reason,
  };
}
/**
 * Maps history risk prices to decimals while retaining funding amounts in x18 units.
 * @param server - Service payload with its original wire fields.
 * @returns Nullable decimal liquidation price and x18 funding PnL, with their independent quality and observation metadata.
 * @example
 * ```ts
 * declare const serverMetrics: MobileServerSocialFeedHistoryMetrics;
 * const metrics = mapMobileSocialFeedHistoryMetrics(serverMetrics);
 * const liquidationPrice = metrics.estimatedLiquidationPrice?.toFixed();
 * const fundingPnlX18 = metrics.fundingPnl?.toFixed();
 * ```
 */
export function mapMobileSocialFeedHistoryMetrics(
  server: MobileServerSocialFeedHistoryMetrics,
): MobileSocialFeedHistoryMetrics {
  return {
    estimatedLiquidationPrice: removeDecimals(
      server.estimated_liquidation_price_x18,
    ),
    liquidationPriceQuality: server.liquidation_price_quality,
    liquidationPriceAsOfMs: server.liquidation_price_as_of_ms,
    fundingPnl:
      server.funding_pnl_x18 === null
        ? null
        : toBigNumber(server.funding_pnl_x18),
    fundingQuality: server.funding_quality,
    fundingAsOfMs: server.funding_as_of_ms,
  };
}
/**
 * Maps action prices independently; all amounts and quantities retain x18 units.
 * @param server - Service payload with its original wire fields.
 * @returns An action with decimal prices, x18 quantities/amounts, and independently nullable financial facts.
 * @example
 * ```ts
 * declare const serverAction: MobileServerSocialFeedPositionAction;
 * const action = mapMobileSocialFeedPositionAction(serverAction);
 * const averagePrice = action.averagePrice?.toFixed();
 * const executedQuantityX18 = action.executedQuantity.toFixed();
 * const realizedPnlX18 = action.realizedPnlDelta?.toFixed();
 * ```
 */
export function mapMobileSocialFeedPositionAction(
  server: MobileServerSocialFeedPositionAction,
): MobileSocialFeedPositionAction {
  return {
    id: server.id,
    positionId: server.position_id,
    action: server.action,
    direction: server.direction,
    marginMode: server.margin_mode,
    quantityBefore: toBigNumber(server.quantity_before_x18),
    quantityAfter: toBigNumber(server.quantity_after_x18),
    executedQuantity: toBigNumber(server.executed_quantity_x18),
    executedNotional:
      server.executed_notional_x18 === null
        ? null
        : toBigNumber(server.executed_notional_x18),
    averagePrice: removeDecimals(server.average_price_x18),
    entryPriceBefore: removeDecimals(server.entry_price_before_x18),
    liquidationOraclePrice: removeDecimals(server.liquidation_oracle_price_x18),
    liquidationNotional:
      server.liquidation_notional_x18 === null
        ? null
        : toBigNumber(server.liquidation_notional_x18),
    realizedPnlDelta:
      server.realized_pnl_delta_x18 === null
        ? null
        : toBigNumber(server.realized_pnl_delta_x18),
    leverage: server.leverage,
    leverageAtMs: server.leverage_at_ms,
    firstEventAtMs: server.first_event_at_ms,
    lastEventAtMs: server.last_event_at_ms,
    version: server.version,
  };
}
/**
 * Maps a trusted target without treating the viewing account as authenticated.
 * @param server - Service payload with its original wire fields.
 * @returns A trading target retaining distinct identity/trading subaccounts, margin mode, and observation time.
 * @example
 * ```ts
 * declare const serverTarget: MobileServerSocialFeedTradingTarget;
 * const target = mapMobileSocialFeedTradingTarget(serverTarget);
 * const identity = target.identitySubaccount;
 * const tradingAccount = target.tradingSubaccount;
 * ```
 */
export function mapMobileSocialFeedTradingTarget(
  server: MobileServerSocialFeedTradingTarget,
): MobileSocialFeedTradingTarget {
  return {
    positionId: server.position_id,
    identitySubaccount: server.identity_subaccount,
    tradingSubaccount: server.trading_subaccount,
    productId: server.product_id,
    marginMode: server.margin_mode,
    isoSubaccountName: server.iso_subaccount_name,
    direction: server.direction,
    stateAsOfMs: server.state_as_of_ms,
  };
}
/**
 * Maps viewing-account trading hints.
 * @param server - Service payload with its original wire fields.
 * @returns Trading hints with ordered target candidates, nullable viewer position, and the current reduction hint.
 * @example
 * ```ts
 * declare const serverContext: MobileServerSocialFeedTradingContext;
 * const context = mapMobileSocialFeedTradingContext(serverContext);
 * const candidateAccounts = context.candidates.map((target) => target.tradingSubaccount);
 * const canReduce = context.canReduce;
 * ```
 */
export function mapMobileSocialFeedTradingContext(
  server: MobileServerSocialFeedTradingContext,
): MobileSocialFeedTradingContext {
  return {
    productId: server.product_id,
    suggestedDirection: server.suggested_direction,
    resolution: server.resolution,
    candidates: server.candidates.map(mapMobileSocialFeedTradingTarget),
    viewerPositionId: server.viewer_position_id,
    canReduce: server.can_reduce,
  };
}
/**
 * Converts OHLC prices to decimals but preserves base-asset volume in x18.
 * @param server - Service payload with its original wire fields.
 * @returns A candle with decimal OHLC BigNumbers, base-asset volume retained in x18, and its timestamp in milliseconds.
 * @example
 * ```ts
 * const candle = mapMobileSocialFeedCandle({
 *   timestamp_ms: 1700000000000,
 *   open_x18: '2000000000000000000',
 *   high_x18: '3000000000000000000',
 *   low_x18: '1000000000000000000',
 *   close_x18: '2000000000000000000',
 *   volume_x18: '4000000000000000000',
 * });
 * console.log(candle.close.toFixed()); // '2'
 * console.log(candle.volume.toFixed()); // '4000000000000000000'
 * ```
 */
export function mapMobileSocialFeedCandle(
  server: MobileServerSocialFeedCandle,
): MobileSocialFeedCandle {
  return {
    timestampMs: server.timestamp_ms,
    open: removeDecimals(server.open_x18),
    high: removeDecimals(server.high_x18),
    low: removeDecimals(server.low_x18),
    close: removeDecimals(server.close_x18),
    volume: toBigNumber(server.volume_x18),
  };
}
/**
 * Maps markers without replacing unknown Oracle prices with execution prices.
 * @param server - Service payload with its original wire fields.
 * @returns An action marker with its original price basis and a nullable decimal price, without substituting another source.
 * @example
 * ```ts
 * declare const serverMarker: MobileServerSocialFeedActionMarker;
 * const marker = mapMobileSocialFeedActionMarker({
 *   ...serverMarker,
 *   price_x18: null,
 * });
 * console.log(marker.price); // null
 * ```
 */
export function mapMobileSocialFeedActionMarker(
  server: MobileServerSocialFeedActionMarker,
): MobileSocialFeedActionMarker {
  return {
    actionId: server.action_id,
    timestampMs: server.timestamp_ms,
    price: removeDecimals(server.price_x18),
    action: server.action,
    direction: server.direction,
    priceBasis: server.price_basis,
  };
}

/**
 * Maps selected-account open positions.
 * @param server - Service payload with its original wire fields.
 * @returns Mapped position candidates with the original nullable cursor and observation time.
 * @example
 * ```ts
 * const page = mapMobileSocialFeedPositions({
 *   positions: [],
 *   next_cursor: null,
 *   as_of_ms: 1700000000000,
 * });
 * console.log(page.positions.length, page.nextCursor); // 0, null
 * ```
 */
export function mapMobileSocialFeedPositions(
  server: MobileServerSocialFeedPositionsResponse,
): MobileSocialFeedPositions {
  return {
    positions: server.positions.map(mapMobileSocialFeedPublishablePosition),
    nextCursor: server.next_cursor,
    asOfMs: server.as_of_ms,
  };
}
/**
 * Maps normal empty and ambiguous command results.
 * @param server - Service payload with its original wire fields.
 * @returns The command resolution, nullable market, position candidates, and original reason for an empty result.
 * @example
 * ```ts
 * const result = mapMobileSocialFeedPositionResolution({
 *   resolution: 'unknown_market',
 *   product: null,
 *   candidates: [],
 *   reason: 'unknown_market',
 * });
 * console.log(result.resolution, result.product); // 'unknown_market', null
 * ```
 */
export function mapMobileSocialFeedPositionResolution(
  server: MobileServerSocialFeedPositionResolutionResponse,
): MobileSocialFeedPositionResolutionResult {
  return {
    resolution: server.resolution,
    product:
      server.product === null
        ? null
        : mapMobileSocialFeedMarket(server.product),
    candidates: server.candidates.map(mapMobileSocialFeedPublishablePosition),
    reason: server.reason,
  };
}
/**
 * Preserves pending order projection without inventing action candidates.
 * @param server - Service payload with its original wire fields.
 * @returns The original order digest, ready/pending state, mapped actions, and observation time.
 * @example
 * ```ts
 * const result = mapMobileSocialFeedActionResolution({
 *   order_digest: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 *   resolution: 'pending',
 *   actions: [],
 *   as_of_ms: 1700000000000,
 * });
 * console.log(result.resolution, result.actions.length); // 'pending', 0
 * ```
 */
export function mapMobileSocialFeedActionResolution(
  server: MobileServerSocialFeedActionResolutionResponse,
): MobileSocialFeedActionResolutionResult {
  return {
    orderDigest: server.order_digest,
    resolution: server.resolution,
    actions: server.actions.map(mapMobileSocialFeedActionCandidate),
    asOfMs: server.as_of_ms,
  };
}
/**
 * Distinguishes no drawing from falsy drawing data.
 * @param server - Service payload with its original wire fields.
 * @returns The parent item ID/version and a nullable drawing, retaining false or zero drawing data.
 * @example
 * ```ts
 * const result = mapMobileSocialFeedDrawingResult({
 *   item_id: '00000000-0000-4000-8000-000000000001',
 *   item_version: '2',
 *   drawing: null,
 * });
 * console.log(result.drawing); // null means no drawing
 * ```
 */
export function mapMobileSocialFeedDrawingResult(
  server: MobileServerSocialFeedDrawingResponse,
): MobileSocialFeedDrawingResult {
  return {
    itemId: server.item_id,
    itemVersion: server.item_version,
    drawing:
      server.drawing === null
        ? null
        : mapMobileSocialFeedDrawing(server.drawing),
  };
}
/**
 * Maps bidirectional comments and the actual returned session.
 * @param server - Service payload with its original wire fields.
 * @returns Mapped replies, total count, bidirectional cursors, nullable anchor, and the actual reading session.
 * @example
 * ```ts
 * declare const serverPage: MobileServerSocialFeedCommentsResponse;
 * const page = mapMobileSocialFeedComments(serverPage);
 * const nextCursor = page.nextCursor;
 * const previousCursor = page.previousCursor;
 * const readSession = page.readSession;
 * ```
 */
export function mapMobileSocialFeedComments(
  server: MobileServerSocialFeedCommentsResponse,
): MobileSocialFeedComments {
  return {
    comments: server.comments.map(mapMobileSocialFeedReply),
    totalCount: server.total_count,
    nextCursor: server.next_cursor,
    previousCursor: server.previous_cursor,
    anchorReplyId: server.anchor_reply_id,
    readSession: mapMobileSocialFeedReadSession(server.read_session),
  };
}
/**
 * Maps atomic reply publication without inventing a reading session.
 * @param server - Service payload with its original wire fields.
 * @returns The created reply and authoritative root comment count, without a fabricated reading session.
 * @example
 * ```ts
 * declare const serverResult: MobileServerSocialFeedCommentResponse;
 * const result = mapMobileSocialFeedCommentResult(serverResult);
 * const createdReply = result.comment;
 * const rootCommentCount = result.rootCommentCount;
 * ```
 */
export function mapMobileSocialFeedCommentResult(
  server: MobileServerSocialFeedCommentResponse,
): MobileSocialFeedCommentResult {
  return {
    comment: mapMobileSocialFeedReply(server.comment),
    rootCommentCount: server.root_comment_count,
  };
}
/**
 * Maps authoritative like state and count.
 * @param server - Service payload with its original wire fields.
 * @returns The applied like state, authoritative count, and item ID/version after the mutation.
 * @example
 * ```ts
 * const result = mapMobileSocialFeedLikeResult({
 *   item_id: '00000000-0000-4000-8000-000000000001',
 *   is_liked: false,
 *   like_count: 0,
 *   version: '2',
 * });
 * console.log(result.isLiked, result.likeCount); // false, 0
 * ```
 */
export function mapMobileSocialFeedLikeResult(
  server: MobileServerSocialFeedLikeResponse,
): MobileSocialFeedLikeResult {
  return {
    itemId: server.item_id,
    isLiked: server.is_liked,
    likeCount: server.like_count,
    version: server.version,
  };
}
/**
 * Maps exposure deduplication results without adding timestamps.
 * @param server - Service payload with its original wire fields.
 * @returns Newly accepted and duplicate item ID lists without inventing an observation timestamp.
 * @example
 * ```ts
 * const result = mapMobileSocialFeedViewsResult({
 *   accepted_item_ids: [],
 *   duplicate_item_ids: ['00000000-0000-4000-8000-000000000001'],
 * });
 * console.log(result.acceptedItemIds.length, result.duplicateItemIds.length); // 0, 1
 * ```
 */
export function mapMobileSocialFeedViewsResult(
  server: MobileServerSocialFeedViewsResponse,
): MobileSocialFeedViewsResult {
  return {
    acceptedItemIds: server.accepted_item_ids,
    duplicateItemIds: server.duplicate_item_ids,
  };
}
/**
 * Maps full history, preserving action/take order, association, and null facts.
 * @param server - Service payload with its original wire fields.
 * @returns Position metrics, ordered action/take timeline, summary, cursor, quality, reading session, and trading hints.
 * @example
 * ```ts
 * declare const serverHistory: MobileServerSocialFeedPositionHistoryResponse;
 * const history = mapMobileSocialFeedPositionHistory(serverHistory);
 * const actions = history.timeline.filter((entry) => entry.kind === 'action');
 * const readSession = history.readSession;
 * ```
 */
export function mapMobileSocialFeedPositionHistory(
  server: MobileServerSocialFeedPositionHistoryResponse,
): MobileSocialFeedPositionHistory {
  return {
    position: {
      ...mapMobileSocialFeedPositionCard(server.position),
      ...mapMobileSocialFeedHistoryMetrics(server.position),
    },
    summary: {
      actionCount: server.summary.action_count,
      takeCount: server.summary.take_count,
    },
    timeline: server.timeline.map((entry) =>
      entry.kind === 'action'
        ? {
            kind: entry.kind,
            action: mapMobileSocialFeedPositionAction(entry.action),
            relatedItemId: entry.related_item_id,
            relatedTake:
              entry.related_take === null
                ? null
                : mapMobileSocialFeedTradeCard(entry.related_take),
          }
        : {
            kind: entry.kind,
            item:
              entry.item.kind === 'trade_card'
                ? mapMobileSocialFeedTradeCard(entry.item)
                : mapMobileSocialFeedPost(entry.item),
          },
    ),
    nextCursor: server.next_cursor,
    historyQuality: server.history_quality,
    readSession: mapMobileSocialFeedReadSession(server.read_session),
    tradingContext: mapMobileSocialFeedTradingContext(server.trading_context),
  };
}
/**
 * Maps candles and independent price sources, preserving explicit nulls.
 * @param server - Service payload with its original wire fields.
 * @returns Decimal-price candles and markers with x18 volume, a nullable liquidation line, and paging/quality metadata.
 * @example
 * ```ts
 * declare const serverChart: MobileServerSocialFeedPositionChartResponse;
 * const chart = mapMobileSocialFeedPositionChart(serverChart);
 * const liquidationPrice = chart.estimatedLiquidationLine?.price.toFixed();
 * const nextBeforeMs = chart.nextBeforeMs;
 * ```
 */
export function mapMobileSocialFeedPositionChart(
  server: MobileServerSocialFeedPositionChartResponse,
): MobileSocialFeedPositionChart {
  return {
    candles: server.candles.map(mapMobileSocialFeedCandle),
    actionMarkers: server.action_markers.map(mapMobileSocialFeedActionMarker),
    estimatedLiquidationLine:
      server.estimated_liquidation_line === null
        ? null
        : {
            price: removeDecimals(server.estimated_liquidation_line.price_x18),
            asOfMs: server.estimated_liquidation_line.as_of_ms,
          },
    nextBeforeMs: server.next_before_ms,
    asOfMs: server.as_of_ms,
    dataQuality: server.data_quality,
  };
}
/**
 * Maps watcher observations; account previews are self-reported, not authenticated.
 * @param server - Service payload with its original wire fields.
 * @returns The visitor count, self-reported public account previews, and observation time.
 * @example
 * ```ts
 * const watchers = mapMobileSocialFeedWatchers({
 *   watcher_count: 3,
 *   watcher_preview: [],
 *   as_of_ms: 1700000000000,
 * });
 * console.log(watchers.watcherCount, watchers.watcherPreview.length); // 3, 0
 * ```
 */
export function mapMobileSocialFeedWatchers(
  server: MobileServerSocialFeedWatchersResponse,
): MobileSocialFeedWatchers {
  return {
    watcherCount: server.watcher_count,
    watcherPreview: server.watcher_preview.map(mapMobileSocialFeedAuthor),
    asOfMs: server.as_of_ms,
  };
}
/**
 * Maps a page lease without inventing an observation timestamp.
 * @param server - Service payload with its original wire fields.
 * @returns Visitor count and public previews with heartbeat/lease durations in seconds, without an observation timestamp.
 * @example
 * ```ts
 * const presence = mapMobileSocialFeedPresence({
 *   watcher_count: 2,
 *   watcher_preview: [],
 *   heartbeat_interval_seconds: 15,
 *   expires_in_seconds: 0,
 * });
 * console.log(presence.expiresInSeconds); // 0 after leaving the page
 * ```
 */
export function mapMobileSocialFeedPresence(
  server: MobileServerSocialFeedPresenceResponse,
): MobileSocialFeedPresence {
  return {
    watcherCount: server.watcher_count,
    watcherPreview: server.watcher_preview.map(mapMobileSocialFeedAuthor),
    heartbeatIntervalSeconds: server.heartbeat_interval_seconds,
    expiresInSeconds: server.expires_in_seconds,
  };
}
