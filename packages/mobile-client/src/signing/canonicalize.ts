import { Hex } from 'viem';
import { MobileSignedInner } from './types';

/**
 * Rebuilds an inner payload with its keys in the backend's struct declaration order (`type` first, then the
 * remaining fields in the exact order the backend serializes them). msgpack encodes object keys in insertion
 * order and the payload hash must be reproducible regardless of how the caller constructed the object, so
 * every inner payload — and each of its sub-types — is canonicalized here before hashing. This function is
 * the source of truth for that order.
 */
export function canonicalizeMobileInner(
  inner: MobileSignedInner,
): MobileSignedInner {
  switch (inner.type) {
    case 'register_expo_token_v2':
      return {
        type: inner.type,
        expo_token: inner.expo_token,
        platform: inner.platform,
        locale: inner.locale ?? null,
        app_version: inner.app_version ?? null,
        capabilities: {
          payload_versions: [...inner.capabilities.payload_versions],
          type_ids: [...inner.capabilities.type_ids],
          routes: [...inner.capabilities.routes],
        },
      };
    case 'notification_subscriptions':
      return { type: inner.type };
    case 'update_notification_subscriptions':
      return {
        type: inner.type,
        expected_revision: inner.expected_revision,
        trader_bell:
          inner.trader_bell == null
            ? null
            : {
                subaccount: inner.trader_bell.subaccount.toLowerCase() as Hex,
                enabled: inner.trader_bell.enabled,
              },
        market:
          inner.market == null
            ? null
            : {
                product_id: inner.market.product_id,
                subscribed: inner.market.subscribed,
              },
        import_markets:
          inner.import_markets == null ? null : [...inner.import_markets],
      };
    case 'notification_inbox_v2':
      return {
        type: inner.type,
        cursor: inner.cursor ?? null,
        limit: inner.limit ?? null,
      };
    case 'record_product_events':
      return {
        type: inner.type,
        events: inner.events.map((event) => ({
          client_event_id: event.client_event_id,
          event_name: event.event_name,
          notification_id: event.notification_id ?? null,
          occurred_at: event.occurred_at,
          product_id: event.product_id ?? null,
          query: event.query ?? null,
        })),
      };
    case 'set_bio':
      return { type: 'set_bio', bio: inner.bio };
    case 'create_avatar_upload':
      return {
        type: 'create_avatar_upload',
        content_length: inner.content_length,
      };
    case 'set_avatar': {
      const avatar = inner.avatar;
      if (avatar === null) {
        return { type: 'set_avatar', avatar: null };
      }
      return {
        type: 'set_avatar',
        avatar:
          avatar.type === 'preset'
            ? { type: 'preset', id: avatar.id }
            : { type: 'upload', upload_key: avatar.upload_key },
      };
    }
    case 'set_username':
      return { type: 'set_username', display_name: inner.display_name };
    case 'set_private_mode':
      return { type: 'set_private_mode', private_mode: inner.private_mode };
    case 'register_expo_token':
      return {
        type: 'register_expo_token',
        expo_token: inner.expo_token,
        platform: inner.platform,
        locale: inner.locale,
        app_version: inner.app_version,
      };
    case 'set_follow':
      return {
        type: 'set_follow',
        subaccount: inner.subaccount,
        is_following: inner.is_following,
      };
    case 'set_follow_batch':
      return {
        type: 'set_follow_batch',
        subaccounts: [...inner.subaccounts],
        is_following: inner.is_following,
      };
    default: {
      throw new Error(
        `canonicalizeMobileInner: unhandled inner payload type: ${JSON.stringify(inner)}`,
      );
    }
  }
}
