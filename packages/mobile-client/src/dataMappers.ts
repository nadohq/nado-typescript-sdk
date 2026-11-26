import {
  EIP712WithdrawCollateralV2Values,
  removeDecimals,
  subaccountFromHex,
  subaccountToHex,
  toBigNumber,
  toIntegerString,
} from '@nadohq/shared';
import type BigNumber from 'bignumber.js';
import type {
  MobileSignedInnerByType,
  MobileSignedInnerParams,
} from './signing/types';
import {
  GetMobileFollowListParams,
  GetMobileNotificationInboxV2Params,
  GetMobileTipCollateralMappingsParams,
  GetMobileTipsHistoryParams,
  MobileAttributeOrdersResult,
  MobileAvatarPreset,
  MobileAvatarSelection,
  MobileAvatarUpload,
  MobileCreatorEarningsSummary,
  MobileFeedPage,
  MobileFeedTrade,
  MobileFollowBatchResultItem,
  MobileFollowListPage,
  MobileFollowMutationResult,
  MobileFollowSummary,
  MobileIdentitySummary,
  MobileNotificationCapabilities,
  MobileNotificationInboxV2,
  MobileNotificationPayloadV2,
  MobileNotificationPreferenceScope,
  MobileNotificationPreferences,
  MobileNotificationRegistrationV2,
  MobileNotificationRoute,
  MobileNotificationSettings,
  MobileNotificationSettingsV2,
  MobileNotificationSubscriptions,
  MobileNotificationSubscriptionsUpdate,
  MobilePositionLookup,
  MobileProductEvent,
  MobileProfileSearchPage,
  MobileProfilesInclude,
  MobilePublicProfile,
  MobileReceivedTipsPage,
  MobileRegisteredWallet,
  MobileSocialFeedActionCandidate,
  MobileSocialFeedActionMarker,
  MobileSocialFeedActionResolutionResult,
  MobileSocialFeedAuthor,
  MobileSocialFeedCandle,
  MobileSocialFeedCapabilities,
  MobileSocialFeedCommentGroup,
  MobileSocialFeedCommentResult,
  MobileSocialFeedCommentsPage,
  MobileSocialFeedCompactCard,
  MobileSocialFeedContentBase,
  MobileSocialFeedDrawing,
  MobileSocialFeedDrawingMutationResult,
  MobileSocialFeedDrawingResult,
  MobileSocialFeedHistoryMetrics,
  MobileSocialFeedHistoryTake,
  MobileSocialFeedImage,
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
  MobileSocialFeedPositionThought,
  MobileSocialFeedPositionThoughtsPage,
  MobileSocialFeedPositionsPage,
  MobileSocialFeedPost,
  MobileSocialFeedPresence,
  MobileSocialFeedPublishablePosition,
  MobileSocialFeedRankedPage,
  MobileSocialFeedReadParams,
  MobileSocialFeedReadSession,
  MobileSocialFeedReply,
  MobileSocialFeedRoiBasis,
  MobileSocialFeedThreadGroup,
  MobileSocialFeedTimelineEntry,
  MobileSocialFeedTip,
  MobileSocialFeedTopTradersPage,
  MobileSocialFeedTradeCard,
  MobileSocialFeedTradeRow,
  MobileSocialFeedTradeRowBase,
  MobileSocialFeedTraderBadge,
  MobileSocialFeedTradingContext,
  MobileSocialFeedTradingTarget,
  MobileSocialFeedUpdates,
  MobileSocialFeedUploadedImage,
  MobileSocialFeedWatchers,
  MobileSubmitTipParams,
  MobileSubmitTipResult,
  MobileTipCollateralMappings,
  MobileTipDetail,
  MobileTipDetailCommon,
  MobileTipGatewayResult,
  MobileTipHistoryCommon,
  MobileTipHistoryRow,
  MobileTipParticipant,
  MobileTipSenderCost,
  MobileTipsHistoryPage,
  SearchMobileProfilesParams,
} from './types/clientTypes';
import { MobileUnsupportedFeedItemError } from './types/MobileUnsupportedFeedItemError';
import { MobileUnsupportedNotificationRouteError } from './types/MobileUnsupportedNotificationRouteError';
import {
  MobileServerAttributeOrdersResponse,
  MobileServerAvatarUploadResponse,
  MobileServerFollowBatchResponse,
  MobileServerFollowMutationResponse,
  MobileServerSocialFeedCommentResponse,
  MobileServerSocialFeedDrawingMutationResponse,
  MobileServerSocialFeedLikeResponse,
  MobileServerSocialFeedPresenceResponse,
  MobileServerSubmitTipResponse,
} from './types/serverExecuteTypes';
import {
  MobileServerAvatarPreset,
  MobileServerAvatarSelection,
  MobileServerFeedTrade,
  MobileServerFollowSummary,
  MobileServerIdentitySummary,
  MobileServerNotificationPayloadV2,
  MobileServerNotificationPreferenceScope,
  MobileServerNotificationPreferences,
  MobileServerNotificationRoute,
  MobileServerNotificationSettings,
  MobileServerProductEvent,
  MobileServerProfile,
  MobileServerSocialFeedActionCandidate,
  MobileServerSocialFeedActionMarker,
  MobileServerSocialFeedAuthor,
  MobileServerSocialFeedCandle,
  MobileServerSocialFeedCapabilities,
  MobileServerSocialFeedCommentGroup,
  MobileServerSocialFeedCompactCard,
  MobileServerSocialFeedContentBase,
  MobileServerSocialFeedDrawing,
  MobileServerSocialFeedHistoryMetrics,
  MobileServerSocialFeedHistoryTake,
  MobileServerSocialFeedImage,
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
  MobileServerSocialFeedRoiBasis,
  MobileServerSocialFeedThreadGroup,
  MobileServerSocialFeedTimelineEntry,
  MobileServerSocialFeedTip,
  MobileServerSocialFeedTradeCard,
  MobileServerSocialFeedTradeRow,
  MobileServerSocialFeedTradeRowBase,
  MobileServerSocialFeedTraderBadge,
  MobileServerSocialFeedTradingContext,
  MobileServerSocialFeedTradingTarget,
  MobileServerSocialFeedUploadedImage,
  MobileServerTipDetail,
  MobileServerTipDetailCommon,
  MobileServerTipGatewayResult,
  MobileServerTipHistoryCommon,
  MobileServerTipHistoryRow,
  MobileServerTipParticipant,
  MobileServerTipSenderCost,
  MobileServerTipWithdrawal,
  MobileSocialFeedMention,
  MobileSocialFeedType,
} from './types/serverModelTypes';
import {
  MobileServerCreatorEarningsSummaryResponse,
  MobileServerFeedResponse,
  MobileServerFollowListResponse,
  MobileServerNotificationInboxV2Response,
  MobileServerNotificationRegistrationV2Response,
  MobileServerNotificationSettingsV2Response,
  MobileServerNotificationSubscriptionsResponse,
  MobileServerPositionLookupResponse,
  MobileServerReceivedTipsResponse,
  MobileServerRegisteredWalletResponse,
  MobileServerSearchProfilesResponse,
  MobileServerSocialFeedActionResolutionResponse,
  MobileServerSocialFeedCommentsResponse,
  MobileServerSocialFeedDrawingResponse,
  MobileServerSocialFeedItemResponse,
  MobileServerSocialFeedPositionChartResponse,
  MobileServerSocialFeedPositionHistoryResponse,
  MobileServerSocialFeedPositionResolutionResponse,
  MobileServerSocialFeedPositionThought,
  MobileServerSocialFeedPositionThoughtsResponse,
  MobileServerSocialFeedPositionsResponse,
  MobileServerSocialFeedRankedResponse,
  MobileServerSocialFeedResponse,
  MobileServerSocialFeedTopTradersResponse,
  MobileServerSocialFeedUpdatesResponse,
  MobileServerSocialFeedWatchersResponse,
  MobileServerTipCollateralMappingsResponse,
  MobileServerTipsHistoryResponse,
} from './types/serverQueryTypes';
import {
  MobileServerFollowListRequest,
  MobileServerNotificationSubscriptionsUpdate,
  MobileServerProfilesInclude,
  MobileServerRegisterExpoTokenV2Params,
  MobileServerSearchProfilesRequest,
  MobileServerSocialFeedListParams,
  MobileServerSocialFeedReadParams,
} from './types/serverRequestTypes';

/** Maps a position lookup payload to its client-side lifecycle UUID. */
export function mapMobilePositionLookup(
  server: MobileServerPositionLookupResponse,
): MobilePositionLookup {
  return { positionId: server.position_id };
}

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

/** Maps a saved notification registration to the client model without the response envelope.
 * @param server - Registration payload.
 * @returns Saved generation and capabilities.
 */
export function mapMobileNotificationRegistrationV2(
  server: MobileServerNotificationRegistrationV2Response,
): MobileNotificationRegistrationV2 {
  return {
    registrationGeneration: server.registration_generation,
    capabilities: {
      payloadVersions: server.capabilities.payload_versions,
      typeIds: server.capabilities.type_ids,
      routes: server.capabilities.routes,
    },
  };
}

/** Maps a v2 capability declaration to the registration wire format.
 * @param capabilities - Device-supported features.
 * @returns V2-only registration capabilities.
 */
export function mapMobileNotificationCapabilitiesToServer(
  capabilities: MobileNotificationCapabilities,
): MobileServerRegisterExpoTokenV2Params['capabilities'] {
  return {
    payload_versions: capabilities.payloadVersions,
    type_ids: capabilities.typeIds,
    routes: capabilities.routes,
  };
}

/** Maps complete notification settings to the client model.
 * @param server - Saved settings.
 * @returns CamelCase settings.
 */
export function mapMobileNotificationSettings(
  server: MobileServerNotificationSettings,
): MobileNotificationSettings {
  return {
    myPositions: server.my_positions,
    positionThresholds: server.position_thresholds,
    myOrders: server.my_orders,
    followingTrades: server.following_trades,
    followingPosts: server.following_posts,
    minTradeSizeUsd: server.min_trade_size_usd,
    newFollowers: server.new_followers,
    announcements: server.announcements,
    discovery: server.discovery,
    ...(server.likes_and_replies === undefined
      ? {}
      : { likesAndReplies: server.likes_and_replies }),
  };
}

/** Maps a complete replacement settings document to wire format.
 * @param settings - Complete client settings.
 * @returns Settings accepted by the service.
 */
export function mapMobileNotificationSettingsToServer(
  settings: MobileNotificationSettings,
): MobileServerNotificationSettings {
  return {
    my_positions: settings.myPositions,
    position_thresholds: settings.positionThresholds,
    my_orders: settings.myOrders,
    following_trades: settings.followingTrades,
    following_posts: settings.followingPosts,
    min_trade_size_usd: settings.minTradeSizeUsd,
    new_followers: settings.newFollowers,
    announcements: settings.announcements,
    discovery: settings.discovery,
    ...(settings.likesAndReplies === undefined
      ? {}
      : { likes_and_replies: settings.likesAndReplies }),
  };
}

/** Maps a revisioned settings response without the response envelope.
 * @param server - Versioned settings payload.
 * @returns Client settings and their revision.
 */
export function mapMobileNotificationSettingsV2(
  server: MobileServerNotificationSettingsV2Response,
): MobileNotificationSettingsV2 {
  return {
    schemaVersion: server.schema_version,
    revision: server.revision,
    settings: mapMobileNotificationSettings(server.settings),
  };
}

/** Maps wallet market subscriptions and Identity bells.
 * @param server - Subscription payload.
 * @returns Client subscription state without the response envelope.
 */
export function mapMobileNotificationSubscriptions(
  server: MobileServerNotificationSubscriptionsResponse,
): MobileNotificationSubscriptions {
  return {
    revision: server.revision,
    favoritesImported: server.favorites_imported,
    marketIds: server.market_ids,
    traderBells: server.trader_bells,
  };
}

/** Maps one subscription operation, explicitly nulling unused wire operations.
 * @param update - Exactly one revision-guarded operation.
 * @returns The complete signed inner operation fields.
 */
export function mapMobileNotificationSubscriptionsUpdateToServer(
  update: MobileNotificationSubscriptionsUpdate,
): MobileServerNotificationSubscriptionsUpdate {
  return {
    expected_revision: update.expectedRevision,
    trader_bell:
      update.traderBell == null
        ? null
        : {
            subaccount: subaccountToHex(update.traderBell.subaccount),
            enabled: update.traderBell.enabled,
          },
    market:
      update.market == null
        ? null
        : {
            product_id: update.market.productId,
            subscribed: update.market.subscribed,
          },
    import_markets: update.importMarkets ?? null,
  };
}

/** Maps an allowlisted notification destination.
 * @param server - Named backend destination.
 * @returns Client navigation data, never an arbitrary URL.
 * @throws {MobileUnsupportedNotificationRouteError} If the service returns an unsupported route name.
 */
export function mapMobileNotificationRoute<
  TRoute extends MobileServerNotificationRoute,
>(server: TRoute): Extract<MobileNotificationRoute, { name: TRoute['name'] }>;
export function mapMobileNotificationRoute(
  server: MobileServerNotificationRoute,
): MobileNotificationRoute {
  const name = server.name;
  switch (name) {
    case 'market':
      return { name: server.name, productId: server.product_id };
    case 'profile':
      return { name: server.name, subaccount: server.subaccount };
    case 'portfolio':
      return { name: server.name };
    case 'tip':
      return { name: server.name, tipId: server.tip_id };
    case 'tip_thread':
      return {
        name: server.name,
        tipId: server.tip_id,
        feedItemId: server.feed_item_id,
        originPostId: server.origin_post_id,
        replyItemId: server.reply_item_id,
      };
    case 'feed_thread':
      return {
        name: server.name,
        rootItemId: server.root_item_id,
        replyItemId: server.reply_item_id,
      };
    default:
      throw new MobileUnsupportedNotificationRouteError(name satisfies never);
  }
}

/** Maps v2 push or inbox navigation data.
 * @param server - Wire-format notification payload.
 * @returns Client notification data.
 * @throws {MobileUnsupportedNotificationRouteError} If the service returns an unsupported route name.
 */
export function mapMobileNotificationPayloadV2(
  server: MobileServerNotificationPayloadV2,
): MobileNotificationPayloadV2 {
  const common = {
    payloadVersion: server.payload_version,
    notificationId: server.notification_id,
    recipientWallet: server.recipient_wallet,
    templateVersion: server.template_version,
    ...(server.title === undefined ? {} : { title: server.title }),
    ...(server.body === undefined ? {} : { body: server.body }),
  };
  switch (server.type_id) {
    case 'tip_received':
      return {
        ...common,
        typeId: server.type_id,
        title: server.title,
        body: server.body,
        route: mapMobileNotificationRoute(server.route),
      };
    case 'tip_liked':
    case 'tip_replied':
      return {
        ...common,
        typeId: server.type_id,
        title: server.title,
        body: server.body,
        route: mapMobileNotificationRoute(server.route),
      };
    case 'feed_liked':
      return {
        ...common,
        typeId: server.type_id,
        title: server.title,
        body: server.body,
        route: mapMobileNotificationRoute(server.route),
      };
    case 'feed_replied':
      return {
        ...common,
        typeId: server.type_id,
        title: server.title,
        body: server.body,
        route: mapMobileNotificationRoute(server.route),
      };
    default:
      return {
        ...common,
        typeId: server.type_id,
        route: mapMobileNotificationRoute(server.route),
      };
  }
}

/** Maps the Creator Rate and earnings, retaining x18 amount units.
 * @param server - `creator_earnings_summary` payload.
 * @returns CamelCase rate fields with BigNumber amounts.
 */
export function mapMobileCreatorEarningsSummary(
  server: MobileServerCreatorEarningsSummaryResponse,
): MobileCreatorEarningsSummary {
  return {
    creatorRateBps: server.creator_rate_bps,
    creatorRateSource: server.creator_rate_source,
    creatorRateLabel: server.creator_rate_label,
    creatorRateEndsAtMs: server.creator_rate_ends_at_ms,
    claimable: toBigNumber(server.claimable_x18),
    lifetime: toBigNumber(server.lifetime_x18),
  };
}

/** Maps a private notification page without the response envelope.
 * @param server - Newest-first inbox payload.
 * @returns Client items, attribution flags, and the next cursor.
 * @throws {MobileUnsupportedNotificationRouteError} If a notification has an unsupported route name.
 */
export function mapMobileNotificationInboxV2(
  server: MobileServerNotificationInboxV2Response,
): MobileNotificationInboxV2 {
  return {
    notifications: server.notifications.map((item) => ({
      notificationId: item.notification_id,
      typeId: item.type_id,
      data: mapMobileNotificationPayloadV2(item.data),
      createdAt: item.created_at,
      ...(item.seen_at === undefined ? {} : { seenAt: item.seen_at }),
      tradeWithin24h: item.trade_within_24h,
    })),
    nextCursor: server.next_cursor,
  };
}

/**
 * Maps typed Inbox filters, preserving omission separately from an explicit empty filter.
 * Omission returns the legacy types; Tip and Feed notifications require an explicit filter.
 */
export function mapMobileNotificationInboxV2ParamsToServer(
  params: Pick<
    GetMobileNotificationInboxV2Params,
    'cursor' | 'limit' | 'supportedTypes'
  >,
): MobileSignedInnerParams<'notification_inbox_v2'> {
  return {
    cursor: params.cursor ?? null,
    limit: params.limit ?? null,
    ...(params.supportedTypes === undefined
      ? {}
      : { supported_types: params.supportedTypes }),
  };
}

/** Maps a typed analytics interaction, nulling unused wire fields.
 * @param event - Event-specific client data.
 * @returns Complete signed wire event.
 */
export function mapMobileProductEventToServer(
  event: MobileProductEvent,
): MobileServerProductEvent {
  return {
    client_event_id: event.clientEventId,
    event_name: event.eventName,
    notification_id: event.notificationId ?? null,
    occurred_at: event.occurredAt,
    product_id: event.productId ?? null,
    query: event.query ?? null,
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
    ...(server.roi_basis === undefined
      ? {}
      : { roiBasis: mapMobileSocialFeedRoiBasis(server.roi_basis) }),
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
 * Maps the ROI denominator without losing x18 precision, quality, or nullable source time.
 * @param server - The service response.
 * @returns The nullable x18 ROI denominator with its accounting basis and availability metadata.
 */
export function mapMobileSocialFeedRoiBasis(
  server: MobileServerSocialFeedRoiBasis,
): MobileSocialFeedRoiBasis {
  return {
    amount: server.amount_x18 === null ? null : toBigNumber(server.amount_x18),
    basis: server.basis,
    asOfMs: server.as_of_ms,
    quality: server.quality,
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
 * Maps uploaded image metadata; bytes remain behind a protected GET.
 * @param server - The service response.
 * @returns The mapped feed image.
 */
export function mapMobileSocialFeedUploadedImage(
  server: MobileServerSocialFeedUploadedImage,
): MobileSocialFeedUploadedImage {
  return {
    imageId: server.image_id,
    url: server.url,
    width: server.width,
    height: server.height,
    contentType: server.content_type,
    byteSize: server.byte_size,
    thumbnail: {
      url: server.thumbnail.url,
      width: server.thumbnail.width,
      height: server.thumbnail.height,
    },
  };
}

/**
 * Maps either protected upload metadata or an external URL without inventing metadata.
 * @param server - The service response.
 * @returns The mapped uploaded image or external URL.
 */
export function mapMobileSocialFeedImage(
  server: MobileServerSocialFeedImage,
): MobileSocialFeedImage {
  if ('image_id' in server) {
    return mapMobileSocialFeedUploadedImage(server);
  }
  return {
    url: server.url,
    ...(server.width === undefined || server.height === undefined
      ? {}
      : { width: server.width, height: server.height }),
  };
}

function mapMobileSocialFeedCapabilities(
  server: MobileServerSocialFeedCapabilities,
): MobileSocialFeedCapabilities {
  return {
    canLike: server.can_like,
    canComment: server.can_comment,
    canRecordView: server.can_record_view,
    ...(server.can_tip === undefined ? {} : { canTip: server.can_tip }),
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
    ...mapMobileSocialFeedItemMetadata(server),
    market: mapMobileSocialFeedMarket(server.market),
  };
}

/** Maps shared metadata for market-backed items and marketless Tip replies. */
function mapMobileSocialFeedItemMetadata(
  server: Omit<MobileServerSocialFeedItemBase, 'market'>,
): Omit<MobileSocialFeedItemBase, 'market'> {
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
    capabilities: mapMobileSocialFeedCapabilities(server.capabilities),
  };
}

/**
 * Maps the content, position, interaction, and comment preview shared by posts and trade cards.
 * @param server - The service response.
 * @returns The mapped shared content fields.
 */
export function mapMobileSocialFeedContentBase(
  server: MobileServerSocialFeedContentBase,
): MobileSocialFeedContentBase {
  return {
    ...mapMobileSocialFeedItemBase(server),
    images: server.images.map(mapMobileSocialFeedImage),
    text: server.text,
    mentions: server.mentions,
    position: mapMobileSocialFeedPositionCard(server.position),
    interaction: mapMobileSocialFeedInteraction(server.interaction),
    commentPreview: {
      items: server.comment_preview.items.map(mapMobileSocialFeedReply),
      totalCount: server.comment_preview.total_count,
      nextCursor: server.comment_preview.next_cursor,
    },
    ...(server.public_tip_total_x18 === undefined
      ? {}
      : { publicTipTotal: toBigNumber(server.public_tip_total_x18) }),
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
    ...mapMobileSocialFeedContentBase(server),
    kind: server.kind,
    action: server.action,
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
  switch (kind) {
    case 'trade_card':
      return mapMobileSocialFeedTradeCard(server);
    case 'trade_row':
      return mapMobileSocialFeedTradeRow(server);
    case 'post':
      return mapMobileSocialFeedPost(server);
    case 'reply':
      return mapMobileSocialFeedReply(server);
    case 'tip':
      return mapMobileSocialFeedTip(server);
    default:
      throw new MobileUnsupportedFeedItemError(kind satisfies never);
  }
}

/** Maps a public Tip without requiring a market or position, retaining its exact x18 amount and IDs. */
export function mapMobileSocialFeedTip(
  server: MobileServerSocialFeedTip,
): MobileSocialFeedTip {
  return {
    kind: server.kind,
    id: server.id,
    hasAnalysis: server.has_analysis,
    drawing: server.drawing,
    market: server.market,
    author: mapMobileSocialFeedAuthor(server.author),
    createdAtMs: server.created_at_ms,
    displayAtMs: server.display_at_ms,
    version: server.version,
    capabilities: mapMobileSocialFeedCapabilities(server.capabilities),
    tipId: server.tip_id,
    sender: mapMobileTipParticipant(server.sender),
    recipient: mapMobileTipParticipant(server.recipient),
    productId: server.product_id,
    netAmount: toBigNumber(server.net_amount_x18),
    visibility: server.visibility,
    note: server.note,
    backgroundId: server.background_id,
    backgroundVersion: server.background_version,
    originPostId: server.origin_post_id,
    originAvailability: server.origin_availability,
    original:
      server.original === null
        ? null
        : mapMobileSocialFeedCompactCard(server.original),
    submittedAtMs: server.submitted_at_ms,
    creditedAtMs: server.credited_at_ms,
    interaction: mapMobileSocialFeedInteraction(server.interaction),
    commentPreview: {
      items: server.comment_preview.items.map(mapMobileSocialFeedReply),
      totalCount: server.comment_preview.total_count,
      nextCursor: server.comment_preview.next_cursor,
    },
  };
}

/**
 * Maps a reading session and its current idle expiration, preserving opaque credentials and cursors.
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
 * Maps mutable item fields without fabricating omitted values; on reset an omitted Tip total clears it.
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
    ...(server.capabilities === undefined
      ? {}
      : { capabilities: mapMobileSocialFeedCapabilities(server.capabilities) }),
    ...(server.public_tip_total_x18 === undefined
      ? {}
      : { publicTipTotal: toBigNumber(server.public_tip_total_x18) }),
    ...(server.sender === undefined
      ? {}
      : { sender: mapMobileTipParticipant(server.sender) }),
    ...(server.recipient === undefined
      ? {}
      : { recipient: mapMobileTipParticipant(server.recipient) }),
    ...(server.origin_post_id === undefined
      ? {}
      : { originPostId: server.origin_post_id }),
    ...(server.origin_availability === undefined
      ? {}
      : { originAvailability: server.origin_availability }),
    ...(server.original === undefined
      ? {}
      : {
          original:
            server.original === null
              ? null
              : mapMobileSocialFeedCompactCard(server.original),
        }),
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
export function mapMobileSocialFeedListParamsToServer<
  FeedType extends MobileSocialFeedType,
>(
  params: MobileSocialFeedListParams<FeedType>,
): MobileServerSocialFeedListParams<FeedType> {
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
 */
export function mapMobileSocialFeedPost(
  server: MobileServerSocialFeedPost,
): MobileSocialFeedPost {
  return {
    ...mapMobileSocialFeedContentBase(server),
    kind: server.kind,
  };
}

/**
 * Maps reply visibility without treating an unavailable attachment as an absent one.
 * @param server - Service payload with its original wire fields.
 * @returns A reply preserving omitted reply targets, nullable attachments, and the separate attachment visibility status.
 */
export function mapMobileSocialFeedReply(
  server: MobileServerSocialFeedReply,
): MobileSocialFeedReply {
  return {
    ...mapMobileSocialFeedItemMetadata(server),
    kind: server.kind,
    market:
      server.market === null ? null : mapMobileSocialFeedMarket(server.market),
    images: server.images.map(mapMobileSocialFeedImage),
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
 * Maps history prices to decimals while retaining funding amounts in x18 units.
 * @param server - Service payload with its original wire fields.
 * @returns History prices and x18 funding PnL. Preserves omitted exit prices for patch updates.
 */
export function mapMobileSocialFeedHistoryMetrics(
  server: MobileServerSocialFeedHistoryMetrics,
): MobileSocialFeedHistoryMetrics {
  return {
    ...(server.average_exit_price_x18 === undefined
      ? {}
      : { averageExitPrice: removeDecimals(server.average_exit_price_x18) }),
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
    fundingBasis: server.funding_basis,
    fundingAsOfMs: server.funding_as_of_ms,
  };
}

/**
 * Maps action prices independently; all amounts and quantities retain x18 units.
 * @param server - Service payload with its original wire fields.
 * @returns An action with decimal prices, x18 quantities/amounts, and independently nullable financial facts.
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
 */
export function mapMobileSocialFeedPositionsPage(
  server: MobileServerSocialFeedPositionsResponse,
): MobileSocialFeedPositionsPage {
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
 */
export function mapMobileSocialFeedPositionResolutionResult(
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
 */
export function mapMobileSocialFeedActionResolutionResult(
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
 * Maps a saved drawing after creation or replacement.
 * @param server - Successful drawing mutation response.
 * @returns The parent item ID/version and non-null saved drawing.
 */
export function mapMobileSocialFeedDrawingMutationResult(
  server: MobileServerSocialFeedDrawingMutationResponse,
): MobileSocialFeedDrawingMutationResult {
  return {
    itemId: server.item_id,
    itemVersion: server.item_version,
    drawing: mapMobileSocialFeedDrawing(server.drawing),
  };
}

/**
 * Maps a top-level comment and its complete flat descendants without sorting or dropping content.
 * @param server - A comment group from the service thread snapshot.
 * @returns The mapped top-level comment with each descendant's original parent relationship.
 */
export function mapMobileSocialFeedCommentGroup(
  server: MobileServerSocialFeedCommentGroup,
): MobileSocialFeedCommentGroup {
  return {
    ...mapMobileSocialFeedReply(server),
    replies: server.replies.map(mapMobileSocialFeedReply),
  };
}

/** Maps a complete Reply or Tip group in server order without adding an outer group wrapper. */
export function mapMobileSocialFeedThreadGroup(
  server: MobileServerSocialFeedThreadGroup,
): MobileSocialFeedThreadGroup {
  if (server.kind === 'tip') {
    return {
      ...mapMobileSocialFeedTip(server),
      replies: server.replies.map(mapMobileSocialFeedReply),
    };
  }
  return mapMobileSocialFeedCommentGroup(server);
}

/**
 * Maps complete comment groups in server order and the actual returned session.
 * @param server - Service payload with its original wire fields.
 * @returns Mapped groups, whole-thread counts, bidirectional cursors, nullable anchor, and reading session.
 */
export function mapMobileSocialFeedCommentsPage(
  server: MobileServerSocialFeedCommentsResponse,
): MobileSocialFeedCommentsPage {
  return {
    comments: server.comments.map(mapMobileSocialFeedThreadGroup),
    totalCount: server.total_count,
    topLevelCount: server.top_level_count,
    nextCursor: server.next_cursor,
    previousCursor: server.previous_cursor,
    anchorReplyId: server.anchor_reply_id,
    ...(server.anchor_tip_item_id === undefined
      ? {}
      : { anchorTipItemId: server.anchor_tip_item_id }),
    readSession: mapMobileSocialFeedReadSession(server.read_session),
  };
}

/**
 * Maps atomic reply publication without inventing a reading session.
 * @param server - Service payload with its original wire fields.
 * @returns The created reply and authoritative root comment count, without a fabricated reading session.
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
 * Maps a server-side order attribution response to its client-side representation.
 */
export function mapMobileAttributeOrdersResult(
  server: MobileServerAttributeOrdersResponse,
): MobileAttributeOrdersResult {
  return {
    isAccepted: server.accepted,
    results: server.results.map((result) => ({
      orderDigest: result.order_digest,
      status: result.status,
      reason: result.reason ?? null,
    })),
  };
}

/**
 * Maps a published history take without treating unknown kinds as posts.
 * @param server - The published service item.
 * @returns The mapped post or trade card.
 * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported take kind.
 */
export function mapMobileSocialFeedHistoryTake(
  server: MobileServerSocialFeedHistoryTake,
): MobileSocialFeedHistoryTake {
  const kind = server.kind;
  switch (kind) {
    case 'trade_card':
      return mapMobileSocialFeedTradeCard(server);
    case 'post':
      return mapMobileSocialFeedPost(server);
    default:
      throw new MobileUnsupportedFeedItemError(kind satisfies never);
  }
}

/**
 * Maps a historical action or published take while preserving its discriminant.
 * @param server - The service timeline entry.
 * @returns The mapped action or take entry.
 * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported entry or take kind.
 */
export function mapMobileSocialFeedTimelineEntry(
  server: MobileServerSocialFeedTimelineEntry,
): MobileSocialFeedTimelineEntry {
  const kind = server.kind;
  switch (kind) {
    case 'action':
      return {
        kind,
        action: mapMobileSocialFeedPositionAction(server.action),
        relatedItemId: server.related_item_id,
        relatedTake:
          server.related_take === null
            ? null
            : mapMobileSocialFeedTradeCard(server.related_take),
      };
    case 'take':
      return {
        kind,
        item: mapMobileSocialFeedHistoryTake(server.item),
      };
    default:
      throw new MobileUnsupportedFeedItemError(kind satisfies never);
  }
}

/**
 * Maps full history, preserving action/take order, association, and null facts.
 * @param server - Service payload with its original wire fields.
 * @returns Position metrics, ordered action/take timeline, summary, cursor, quality, reading session, and trading hints.
 * @throws {MobileUnsupportedFeedItemError} If a timeline entry or take has an unsupported kind.
 */
export function mapMobileSocialFeedPositionHistory(
  server: MobileServerSocialFeedPositionHistoryResponse,
): MobileSocialFeedPositionHistory {
  return {
    owner: mapMobileSocialFeedAuthor(server.owner),
    position: {
      ...mapMobileSocialFeedPositionCard(server.position),
      averageExitPrice: null,
      ...mapMobileSocialFeedHistoryMetrics(server.position),
    },
    summary: {
      actionCount: server.summary.action_count,
      takeCount: server.summary.take_count,
    },
    timeline: server.timeline.map(mapMobileSocialFeedTimelineEntry),
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

/**
 * Maps a published thought, keeping its guaranteed analysis flag and drawing.
 * @param server - Service payload with its original wire fields.
 * @returns The mapped post or trade card with a non-null drawing.
 * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported take kind.
 */
export function mapMobileSocialFeedPositionThought(
  server: MobileServerSocialFeedPositionThought,
): MobileSocialFeedPositionThought {
  return {
    ...mapMobileSocialFeedHistoryTake(server),
    hasAnalysis: server.has_analysis,
    drawing: mapMobileSocialFeedDrawing(server.drawing),
  };
}

/**
 * Maps a thoughts page in server order, preserving empty pages with continuation cursors.
 * @param server - Service payload with its original wire fields.
 * @returns Thoughts, the next cursor, and the position reading session.
 * @throws {MobileUnsupportedFeedItemError} If an item is not a post or trade card.
 */
export function mapMobileSocialFeedPositionThoughts(
  server: MobileServerSocialFeedPositionThoughtsResponse,
): MobileSocialFeedPositionThoughtsPage {
  return {
    items: server.items.map(mapMobileSocialFeedPositionThought),
    nextCursor: server.next_cursor,
    readSession: mapMobileSocialFeedReadSession(server.read_session),
  };
}

/**
 * Converts Engine payload-builder values to Tip wire fields without executing or re-signing a withdrawal.
 * Amount and appendix use integer-string encoding; hex spellings and the withdrawal nonce pass through.
 */
export function mapMobileTipWithdrawalToServer(
  withdrawal: EIP712WithdrawCollateralV2Values,
): MobileServerTipWithdrawal {
  return {
    sender: withdrawal.sender,
    productId: withdrawal.productId,
    amount: toIntegerString(withdrawal.amount),
    nonce: withdrawal.nonce,
    sendTo: withdrawal.sendTo,
    appendix: toIntegerString(withdrawal.appendix),
  };
}

/**
 * Maps explicitly confirmed Tip inputs while preserving the inner owner signature and withdrawal nonce.
 * Ordinary recovery omits expected_version; it never increases the confirmed cap or authorizes a retry.
 * @throws {Error} If the recipient subaccount cannot be encoded as bytes32.
 */
export function mapMobileSubmitTipParamsToServer(
  params: MobileSubmitTipParams,
): MobileSignedInnerParams<'submit_tip'> {
  return {
    chain_id: params.chainId.toString(),
    recipient_subaccount: subaccountToHex(params.recipientSubaccount),
    origin_post_id: params.originPostId ?? null,
    note: params.note ?? null,
    background_id: params.backgroundId,
    visibility: params.visibility,
    withdrawal: mapMobileTipWithdrawalToServer(params.withdrawal),
    withdrawal_signature: params.withdrawalSignature,
    max_fee_x18: toIntegerString(params.maxFeeX18),
    ...(params.expectedVersion === undefined
      ? {}
      : { expected_version: params.expectedVersion }),
  };
}

/** Maps durable Tip state without treating an admitted Gateway rejection as a transport failure. */
export function mapMobileSubmitTipResult(
  server: MobileServerSubmitTipResponse,
): MobileSubmitTipResult {
  return {
    tipId: server.tip_id,
    tipStatus: server.tip_status,
    version: server.version,
    submittedAtMs: server.submitted_at_ms,
    gateway: mapTipGatewayResult(server.gateway),
    processingReason: server.processing_reason,
  };
}

/**
 * Maps one attribution request without changing its exact Indexer indices or their order.
 * @throws {Error} If the target subaccount cannot be encoded as bytes32.
 */
export function mapMobileTipCollateralMappingsParamsToServer(
  params: GetMobileTipCollateralMappingsParams,
): Omit<
  Extract<
    MobileSignedInnerByType<'tips_history'>,
    { mode: 'collateral_mapping' }
  >,
  'type'
> {
  return {
    mode: 'collateral_mapping',
    subaccount: subaccountToHex(params.subaccount),
    product_id: params.productId,
    direction: params.direction,
    submission_indices: params.submissionIndices,
  };
}

/**
 * Maps partial attribution results, preserving unknown amounts and source order.
 * Subaccounts retain their exact bytes32 Hex identity for collateral-attribution correlation keys.
 */
export function mapMobileTipCollateralMappings(
  server: MobileServerTipCollateralMappingsResponse,
): MobileTipCollateralMappings {
  return {
    mappings: server.mappings.map((mapping) => ({
      subaccount: mapping.subaccount,
      productId: mapping.product_id,
      direction: mapping.direction,
      submissionIdx: mapping.submission_idx,
      mappingState: mapping.mapping_state,
      classification: mapping.classification,
      depositTotal: mapTipNullableAmount(mapping.deposit_total_x18),
      tipTotal: mapTipNullableAmount(mapping.tip_total_x18),
      ordinaryAmount: mapTipNullableAmount(mapping.ordinary_amount_x18),
    })),
  };
}

/**
 * Maps participant history filters to their canonical signed shape, retaining explicit null defaults.
 * @throws {Error} If a supplied participant subaccount cannot be encoded as bytes32.
 */
export function mapMobileTipsHistoryParamsToServer(
  params: GetMobileTipsHistoryParams,
): Omit<
  Extract<MobileSignedInnerByType<'tips_history'>, { mode: 'list' }>,
  'type'
> {
  return {
    mode: 'list',
    direction: params.direction ?? 'all',
    subaccount:
      params.subaccount == null ? null : subaccountToHex(params.subaccount),
    cursor: params.cursor ?? null,
    limit: params.limit ?? null,
  };
}

/**
 * Decodes a required participant identity while preserving missing public profile fields as null.
 * @throws {Error} If the server returns an invalid bytes32 subaccount.
 */
export function mapMobileTipParticipant(
  participant: MobileServerTipParticipant,
): MobileTipParticipant {
  return {
    subaccount: subaccountFromHex(participant.subaccount),
    displayName: participant.display_name,
    avatarUrl: participant.avatar_url,
  };
}

/**
 * Maps role-specific Tip detail without changing read state or exposing fields from the other role.
 * Verified credit time and exact source indices remain intact when a credited Tip enters review.
 * @throws {Error} If a participant identity cannot be decoded.
 */
export function mapMobileTipDetail(
  detail: MobileServerTipDetail,
): MobileTipDetail {
  const common = mapTipDetailCommon(detail);
  if (detail.role === 'sender') {
    return {
      ...common,
      role: detail.role,
      senderCost: mapTipSenderCost(detail.sender_cost),
      gateway: mapTipGatewayResult(detail.gateway),
      processingReason: detail.processing_reason,
    };
  }
  return {
    ...common,
    role: detail.role,
    seenAt: detail.seen_at,
  };
}

/**
 * Maps mixed participant activity in server order, retaining exact indices and recipient-only read state.
 * @throws {Error} If a participant identity cannot be decoded.
 */
export function mapMobileTipsHistoryPage(
  page: MobileServerTipsHistoryResponse,
): MobileTipsHistoryPage {
  return {
    tips: page.tips.map(mapTipHistoryRow),
    nextCursor: page.next_cursor,
  };
}

/**
 * Maps unread verified receipt cards in server order; this read never acknowledges a receipt.
 * Amounts retain integer x18 units and catalog versions remain opaque strings.
 * @throws {Error} If a sender identity cannot be decoded.
 */
export function mapMobileReceivedTipsPage(
  page: MobileServerReceivedTipsResponse,
): MobileReceivedTipsPage {
  return {
    tips: page.tips.map((tip) => ({
      tipId: tip.tip_id,
      sender: mapMobileTipParticipant(tip.sender),
      netAmount: toBigNumber(tip.net_amount_x18),
      note: tip.note,
      backgroundId: tip.background_id,
      backgroundVersion: tip.background_version,
      creditedAtMs: tip.credited_at_ms,
      seenAt: tip.seen_at,
    })),
    nextCursor: page.next_cursor,
  };
}

function mapTipDetailCommon(
  detail: MobileServerTipDetailCommon,
): MobileTipDetailCommon {
  return {
    ...mapTipHistoryCommon(detail),
    version: detail.version,
    backgroundId: detail.background_id,
    backgroundVersion: detail.background_version,
    originPostId: detail.origin_post_id,
    originAvailability: detail.origin_availability,
    feedItemId: detail.feed_item_id,
  };
}

function mapTipGatewayResult(
  gateway: MobileServerTipGatewayResult,
): MobileTipGatewayResult {
  return {
    status: gateway.status,
    errorCode: gateway.error_code,
    errorName: gateway.error_name,
  };
}

function mapTipSenderCost(
  cost: MobileServerTipSenderCost,
): MobileTipSenderCost {
  return {
    maxFee: toBigNumber(cost.max_fee_x18),
    actualFee: mapTipNullableAmount(cost.actual_fee_x18),
    actualTotal: mapTipNullableAmount(cost.actual_total_x18),
    displayFee: toBigNumber(cost.display_fee_x18),
    displayTotal: toBigNumber(cost.display_total_x18),
    feeBasis: cost.fee_basis,
  };
}

function mapTipHistoryRow(row: MobileServerTipHistoryRow): MobileTipHistoryRow {
  const common = mapTipHistoryCommon(row);
  return row.role === 'sender'
    ? { ...common, role: row.role }
    : { ...common, role: row.role, seenAt: row.seen_at };
}

function mapTipHistoryCommon(
  row: MobileServerTipHistoryCommon,
): MobileTipHistoryCommon {
  return {
    tipId: row.tip_id,
    tipStatus: row.tip_status,
    sender: mapMobileTipParticipant(row.sender),
    recipient: mapMobileTipParticipant(row.recipient),
    productId: row.product_id,
    netAmount: toBigNumber(row.net_amount_x18),
    visibility: row.visibility,
    note: row.note,
    submittedAtMs: row.submitted_at_ms,
    creditedAtMs: row.credited_at_ms,
    withdrawalSubmissionIdx: row.withdrawal_submission_idx,
    depositSubmissionIdx: row.deposit_submission_idx,
  };
}

function mapTipNullableAmount(value: string | null): BigNumber | null {
  return value === null ? null : toBigNumber(value);
}
