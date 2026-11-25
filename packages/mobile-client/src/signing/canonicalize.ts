import {
  MobileServerSocialFeedExternalImageDimensions,
  MobileSocialFeedMention,
} from '../types/serverModelTypes';
import { MobileSignedInner } from './types';

/**
 * Rebuilds an inner payload with its keys in the backend's struct declaration order (`type` first, then the
 * remaining fields in the exact order the backend serializes them). msgpack encodes object keys in insertion
 * order and the payload hash must be reproducible regardless of how the caller constructed the object, so
 * every inner payload — and each of its sub-types — is canonicalized here before hashing. This function is
 * the source of truth for that order.
 * @throws {Error} If the payload has an unsupported operation type.
 */
export function canonicalizeMobileInner(
  inner: MobileSignedInner,
): MobileSignedInner {
  switch (inner.type) {
    case 'tip_detail':
      return { type: inner.type, tip_id: inner.tip_id };
    case 'tips_history':
      if (inner.mode === 'list') {
        return {
          type: inner.type,
          mode: inner.mode,
          direction: inner.direction,
          subaccount: inner.subaccount ?? null,
          cursor: inner.cursor ?? null,
          limit: inner.limit ?? null,
        };
      }
      return {
        type: inner.type,
        mode: inner.mode,
        subaccount: inner.subaccount,
        product_id: inner.product_id,
        direction: inner.direction,
        submission_indices: [...inner.submission_indices],
      };
    case 'received_tips':
    case 'notification_inbox_v3':
      return {
        type: inner.type,
        cursor: inner.cursor ?? null,
        limit: inner.limit ?? null,
      };
    case 'mark_tips_seen':
      return { type: inner.type, tip_ids: [...inner.tip_ids] };
    case 'mark_notifications_seen':
      return {
        type: inner.type,
        notification_ids: [...inner.notification_ids],
      };
    case 'submit_tip':
      return {
        type: inner.type,
        chain_id: inner.chain_id,
        recipient_subaccount: inner.recipient_subaccount,
        origin_post_id: inner.origin_post_id,
        note: inner.note,
        background_id: inner.background_id,
        visibility: inner.visibility,
        withdrawal: {
          sender: inner.withdrawal.sender,
          productId: inner.withdrawal.productId,
          amount: inner.withdrawal.amount,
          nonce: inner.withdrawal.nonce,
          sendTo: inner.withdrawal.sendTo,
          appendix: inner.withdrawal.appendix,
        },
        withdrawal_signature: inner.withdrawal_signature,
        max_fee_x18: inner.max_fee_x18,
        ...(inner.expected_version === undefined
          ? {}
          : { expected_version: inner.expected_version }),
      };
    case 'register_expo_token_v2':
      return {
        type: inner.type,
        expo_token: inner.expo_token,
        platform: inner.platform,
        locale: inner.locale,
        app_version: inner.app_version,
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
                subaccount: inner.trader_bell.subaccount,
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
        cursor: inner.cursor,
        limit: inner.limit,
        ...(inner.supported_types === undefined
          ? {}
          : { supported_types: [...inner.supported_types] }),
      };
    case 'record_product_events':
      return {
        type: inner.type,
        events: inner.events.map((event) => ({
          client_event_id: event.client_event_id,
          event_name: event.event_name,
          notification_id: event.notification_id,
          occurred_at: event.occurred_at,
          product_id: event.product_id,
          query: event.query,
        })),
      };
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
        ...(inner.image_urls === undefined
          ? {}
          : { image_urls: [...inner.image_urls] }),
        ...(inner.external_image_dimensions === undefined
          ? {}
          : {
              external_image_dimensions: inner.external_image_dimensions.map(
                canonicalizeExternalImageDimensions,
              ),
            }),
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
        ...(inner.image_urls === undefined
          ? {}
          : { image_urls: [...inner.image_urls] }),
        ...(inner.external_image_dimensions === undefined
          ? {}
          : {
              external_image_dimensions: inner.external_image_dimensions.map(
                canonicalizeExternalImageDimensions,
              ),
            }),
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
    case 'attribute_orders':
      return {
        type: inner.type,
        item_id: inner.item_id,
        order_digests: [...inner.order_digests],
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

function canonicalizeExternalImageDimensions(
  dimensions: MobileServerSocialFeedExternalImageDimensions | null,
): MobileServerSocialFeedExternalImageDimensions | null {
  return dimensions === null
    ? null
    : { width: dimensions.width, height: dimensions.height };
}
