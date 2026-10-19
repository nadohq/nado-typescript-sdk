import { WalletClientWithAccount } from '@nadohq/shared';
import { Hex } from 'viem';
import { MobileSignedRequestParams } from '../types/clientTypes';
import {
  MobileNotificationPlatform,
  MobileServerAvatarSelection,
  MobileSocialFeedMention,
} from '../types/serverModelTypes';

/**
 * Unsigned inner payloads that can be authenticated against the mobile service API.
 *
 * Key order is significant: the payload hash is `keccak256(msgpack(inner))`, and msgpack encodes object keys
 * in insertion order, so every field of every sub-type must be serialized in the exact order the backend
 * declares its structs — `type` first, then the remaining fields — or the hash won't match and signature
 * verification fails. This type only describes the shape; the authoritative runtime key order is enforced by
 * {@link canonicalizeMobileInner}, which is the source of truth. Keep the field order here in sync with it.
 *
 * Every bytes32 field must be lowercase hex. The backend decodes them case-insensitively but hashes its own
 * re-serialization, which is always lowercase, so a mixed-case value is accepted on the wire and then fails
 * authentication against a hash the client never reproduced. Build them with `subaccountToHex`, which
 * lowercases; unlike bytes32, string fields such as `display_name` are hashed as-is and keep their casing.
 */
export type MobileSignedInner =
  | {
      /** Atomic post publication. */
      type: 'create_feed_post';
      /** Author-scoped idempotency UUID. */
      client_request_id: string;
      /** Owned position UUID. */
      position_id: string;
      /** Optional trusted action UUID, omitted rather than encoded as nil. */
      action_id?: string;
      /** Unmodified original text. */
      text: string;
      /** Ordered mentions into the original text. */
      mentions: MobileSocialFeedMention[];
      /** Original JSON text; omitted when absent. */
      drawing_data_json?: string;
    }
  | {
      /** Atomic comment publication. */
      type: 'create_feed_comment';
      /** Author-scoped idempotency UUID. */
      client_request_id: string;
      /** Root UUID. */
      root_item_id: string;
      /** Optional same-thread reply UUID. */
      reply_to_item_id?: string;
      /** Unmodified original text. */
      text: string;
      /** Ordered mentions. */
      mentions: MobileSocialFeedMention[];
      /** Optional owned position UUID. */
      attached_position_id?: string;
    }
  | {
      /** First attachment or full replacement. */
      type: 'create_feed_chart_drawing';
      /** Parent UUID. */
      item_id: string;
      /** Original JSON text, not parsed or reformatted before hashing. */
      data_json: string;
    }
  | {
      /** Full replacement of an existing drawing. */
      type: 'update_feed_chart_drawing';
      /** Parent UUID. */
      item_id: string;
      /** Original JSON text. */
      data_json: string;
    }
  | {
      /** Idempotent relationship mutation. */
      type: 'set_feed_like';
      /** Item UUID. */
      item_id: string;
      /** Desired relationship state. */
      is_liked: boolean;
    }
  | { type: 'set_bio'; bio: string }
  | { type: 'create_avatar_upload'; content_length: number }
  | {
      type: 'set_avatar';
      avatar: MobileServerAvatarSelection | null;
    }
  | { type: 'set_username'; display_name: string }
  | { type: 'set_private_mode'; private_mode: boolean }
  | {
      type: 'register_expo_token';
      expo_token: string;
      platform: MobileNotificationPlatform;
      // Optional on the wire, but always present (null when unset) so the msgpack payload hash matches the
      // backend, which serializes `Option::None` as nil under the same key.
      locale: string | null;
      app_version: string | null;
    }
  | {
      type: 'set_follow';
      subaccount: Hex;
      /** `true` follows the target, `false` unfollows it. Both directions are idempotent. */
      is_following: boolean;
    }
  | {
      type: 'set_follow_batch';
      /** Distinct targets in request order; the response keeps this order. */
      subaccounts: Hex[];
      /** `true` follows every target, `false` unfollows every target. Both directions are idempotent. */
      is_following: boolean;
    };

/**
 * The single {@link MobileSignedInner} member carrying the given `type` tag.
 */
export type MobileSignedInnerByType<T extends MobileSignedInner['type']> =
  Extract<MobileSignedInner, { type: T }>;

/**
 * Type-specific payload fields for a signed inner request of a given `type` (the inner payload without its
 * `type` tag). Derived from {@link MobileSignedInner} so the two never drift apart.
 */
export type MobileSignedInnerParams<T extends MobileSignedInner['type']> = Omit<
  MobileSignedInnerByType<T>,
  'type'
>;

/**
 * A signed mobile service API request body: the inner payload flattened with its signature, sender, and
 * nonce (unlike the engine client, which wraps params under a `{ [type]: params }` key).
 */
export type MobileSignedRequest<
  T extends MobileSignedInner = MobileSignedInner,
> = T & {
  signature: Hex;
  sender: Hex;
  nonce: string;
};

/**
 * Params for {@link buildSignedMobileRequest}.
 */
export interface BuildSignedMobileRequestParams extends MobileSignedRequestParams {
  walletClient: WalletClientWithAccount;
  inner: MobileSignedInner;
}
