import { MobileServerSocialFeedListParams } from '../types/serverSocialFeedTypes';
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
    case 'profile_feed':
      return omitUndefined({
        type: inner.type,
        subaccount: inner.subaccount.toLowerCase() as typeof inner.subaccount,
        market_category: inner.market_category,
        ...listFields(inner),
      });
    case 'market_feed':
      return omitUndefined({
        type: inner.type,
        product_id: inner.product_id,
        ...listFields(inner),
      });
    case 'position_feed':
      return omitUndefined({
        type: inner.type,
        position_id: inner.position_id.toLowerCase(),
        ...listFields(inner),
      });
    case 'feed_item':
      return omitUndefined({
        type: inner.type,
        item_id: inner.item_id.toLowerCase(),
        comment_preview_limit: inner.comment_preview_limit,
        session_id: inner.session_id,
      });
    case 'feed_updates':
      return omitUndefined({
        type: inner.type,
        session_id: inner.session_id,
        visible_item_ids: inner.visible_item_ids.map((id) => id.toLowerCase()),
        visible_position_ids: inner.visible_position_ids.map((id) =>
          id.toLowerCase(),
        ),
        update_cursor: inner.update_cursor,
        viewport_revision: inner.viewport_revision,
        request_seq: inner.request_seq,
      });
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
    default: {
      throw new Error(
        `canonicalizeMobileInner: unhandled inner payload type: ${JSON.stringify(inner)}`,
      );
    }
  }
}

function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;
}

function listFields(inner: MobileServerSocialFeedListParams) {
  return {
    feed_types: inner.feed_types,
    minimum_notional: inner.minimum_notional,
    limit: inner.limit,
    session_id: inner.session_id,
    cursor: inner.cursor,
  };
}
