import { MobileSocialFeedMention } from '../types/serverModelTypes';
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
    case 'create_feed_post':
      return {
        type: inner.type,
        client_request_id: inner.client_request_id,
        position_id: inner.position_id,
        ...(inner.action_id === undefined
          ? {}
          : { action_id: inner.action_id }),
        text: inner.text,
        mentions: inner.mentions.map(canonicalizeMention),
        ...(inner.drawing_data_json === undefined
          ? {}
          : { drawing_data_json: inner.drawing_data_json }),
        ...(inner.image_ids === undefined
          ? {}
          : { image_ids: [...inner.image_ids] }),
      };
    case 'create_feed_comment':
      return {
        type: inner.type,
        client_request_id: inner.client_request_id,
        root_item_id: inner.root_item_id,
        ...(inner.reply_to_item_id === undefined
          ? {}
          : { reply_to_item_id: inner.reply_to_item_id }),
        text: inner.text,
        mentions: inner.mentions.map(canonicalizeMention),
        ...(inner.attached_position_id === undefined
          ? {}
          : { attached_position_id: inner.attached_position_id }),
        ...(inner.image_ids === undefined
          ? {}
          : { image_ids: [...inner.image_ids] }),
      };
    case 'create_feed_post_image_uploads':
    case 'create_feed_comment_image_uploads':
      return {
        type: inner.type,
        content_hash: inner.content_hash,
      };
    case 'create_feed_chart_drawing':
    case 'update_feed_chart_drawing':
      return {
        type: inner.type,
        item_id: inner.item_id,
        data_json: inner.data_json,
      };
    case 'set_feed_like':
      return {
        type: inner.type,
        item_id: inner.item_id,
        is_liked: inner.is_liked,
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

function canonicalizeMention(
  mention: MobileSocialFeedMention,
): MobileSocialFeedMention {
  return {
    subaccount: mention.subaccount,
    start: mention.start,
    end: mention.end,
    label: mention.label,
  };
}
