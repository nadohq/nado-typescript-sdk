import {
  MobileFeedPage,
  MobileFeedTrade,
  MobileNotificationPreferenceScope,
  MobileNotificationPreferences,
  MobilePublicProfile,
  MobileRegisteredWallet,
} from './types/clientTypes';
import {
  MobileServerFeedTrade,
  MobileServerNotificationPreferenceScope,
  MobileServerNotificationPreferences,
  MobileServerProfile,
} from './types/serverModelTypes';
import {
  MobileServerFeedResponse,
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
    orderDigest: server.order_digest,
    subaccount: server.subaccount,
    username: server.username,
    displayName: server.display_name,
    avatarUrl: server.avatar_url,
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
