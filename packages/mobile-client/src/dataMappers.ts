import {
  MobileFeedMargin,
  MobileFeedPage,
  MobileFeedTrade,
  MobileIdentity,
  MobileNotificationPreferenceScope,
  MobileNotificationPreferences,
  MobilePublicProfile,
  MobileRegisteredDevice,
} from './types/clientTypes';
import {
  MobileServerFeedMargin,
  MobileServerFeedTrade,
  MobileServerIdentity,
  MobileServerNotificationPreferenceScope,
  MobileServerNotificationPreferences,
  MobileServerProfile,
  MobileServerRegisteredDevice,
} from './types/serverModelTypes';
import { MobileServerFeedResponse } from './types/serverQueryTypes';

/**
 * Maps a server-side identity (snake_case) to its client-side (camelCase) representation.
 */
export function mapMobileIdentity(
  server: MobileServerIdentity,
): MobileIdentity {
  return {
    subaccount: server.subaccount,
    username: server.username,
    displayName: server.display_name,
    privateMode: server.private_mode,
  };
}

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

function mapMobileFeedMargin(server: MobileServerFeedMargin): MobileFeedMargin {
  if (server.mode === 'cross') {
    return { mode: 'cross' };
  }
  // Preserve the omitted-when-unavailable semantics instead of introducing an explicit `undefined` key
  return server.estimated_leverage !== undefined
    ? { mode: 'isolated', estimatedLeverage: server.estimated_leverage }
    : { mode: 'isolated' };
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
    margin: mapMobileFeedMargin(server.margin),
    position: server.position,
    realizedPnl: server.realized_pnl,
    filledAtMillis: server.filled_at_ms,
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
 * Maps a server-side registered device (snake_case) to its client-side (camelCase) representation.
 */
export function mapMobileRegisteredDevice(
  server: MobileServerRegisteredDevice,
): MobileRegisteredDevice {
  return {
    platform: server.platform,
    locale: server.locale,
    appVersion: server.app_version,
    tokenFingerprintPrefix: server.token_fingerprint_prefix,
    lastSeenAt: server.last_seen_at,
  };
}
