import {
  MobileFeedPage,
  MobileFeedTrade,
  MobileFollowListPage,
  MobileFollowMutationResult,
  MobileFollowSummary,
  MobileIdentitySummary,
  MobileNotificationPreferenceScope,
  MobileNotificationPreferences,
  MobilePublicProfile,
  MobileRegisteredWallet,
} from './types/clientTypes';
import { MobileServerFollowMutationResponse } from './types/serverExecuteTypes';
import {
  MobileServerFeedTrade,
  MobileServerIdentitySummary,
  MobileServerNotificationPreferenceScope,
  MobileServerNotificationPreferences,
  MobileServerProfile,
} from './types/serverModelTypes';
import {
  MobileServerFeedResponse,
  MobileServerFollowListResponse,
  MobileServerFollowSummaryResponse,
  MobileServerRegisteredWalletResponse,
} from './types/serverQueryTypes';

/**
 * Maps a server-side public profile (snake_case) to its client-side (camelCase) representation.
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
 * Maps a server-side follow summary response to its client-side representation.
 */
export function mapMobileFollowSummary(
  server: MobileServerFollowSummaryResponse,
): MobileFollowSummary {
  return {
    isFollowing: server.is_following,
    followedByCount: server.followed_by_count,
    followedBy: server.followed_by.map(mapMobileIdentitySummary),
  };
}

/**
 * Maps a server-side Followers or Following response to a client-side {@link MobileFollowListPage}.
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
