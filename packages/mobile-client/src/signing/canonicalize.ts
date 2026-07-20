import { MobileServerNotificationPreferences } from '../types/serverTypes';
import { MobileSignedInner } from './types';

/**
 * Rebuilds an inner payload with its keys in the backend's struct declaration order (`type` first, then the
 * remaining fields in the exact order the backend serializes them). msgpack encodes object keys in insertion
 * order and the payload hash must be reproducible regardless of how the caller constructed the object, so
 * every inner payload — and each of its sub-types — is canonicalized here before hashing. This function (with
 * {@link canonicalizeNotificationPreferences} for nested preferences) is the source of truth for that order.
 */
export function canonicalizeMobileInner(
  inner: MobileSignedInner,
): MobileSignedInner {
  switch (inner.type) {
    case 'claim_username':
      return { type: 'claim_username', display_name: inner.display_name };
    case 'update_username':
      return { type: 'update_username', display_name: inner.display_name };
    case 'set_private_mode':
      return { type: 'set_private_mode', private_mode: inner.private_mode };
    case 'self_identity':
      return { type: 'self_identity' };
    case 'register_expo_token':
      return {
        type: 'register_expo_token',
        expo_token: inner.expo_token,
        platform: inner.platform,
        locale: inner.locale,
        app_version: inner.app_version,
      };
    case 'unregister_expo_token':
      return { type: 'unregister_expo_token', expo_token: inner.expo_token };
    case 'update_preferences':
      return {
        type: 'update_preferences',
        preferences: canonicalizeNotificationPreferences(inner.preferences),
      };
    case 'notification_preferences':
      return { type: 'notification_preferences' };
    case 'registered_devices':
      return { type: 'registered_devices' };
    default: {
      throw new Error(
        `canonicalizeMobileInner: unhandled inner payload type: ${JSON.stringify(inner)}`,
      );
    }
  }
}

/**
 * Rebuilds notification preferences with keys in the backend's struct declaration order, so the msgpack
 * encoding matches the backend's `rmp_serde::to_vec_named` output field-for-field.
 */
function canonicalizeNotificationPreferences(
  preferences: MobileServerNotificationPreferences,
): MobileServerNotificationPreferences {
  return {
    schema_version: preferences.schema_version,
    categories: preferences.categories.map((category) => ({
      category: category.category,
      enabled: category.enabled,
      scopes: category.scopes.map((scope) =>
        scope.type === 'subaccount'
          ? { type: 'subaccount', subaccount: scope.subaccount }
          : { type: 'product', product_id: scope.product_id },
      ),
    })),
  };
}
