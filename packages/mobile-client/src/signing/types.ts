import { WalletClientWithAccount } from '@nadohq/shared';
import { Hex } from 'viem';
import { MobileSignedRequestParams } from '../types/clientTypes';
import {
  MobileServerAvatarSelection,
  MobileServerNotificationCapabilities,
  MobileServerProductEvent,
} from '../types/serverModelTypes';
import {
  MobileServerNotificationSubscriptionsUpdate,
  MobileServerRegisterExpoTokenParams,
} from '../types/serverRequestTypes';

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
  | ({
      /** Capability-aware device registration. */
      type: 'register_expo_token_v2';
    } & MobileServerRegisterExpoTokenParams & {
        /** Supported payload versions, types, and routes. */
        capabilities: MobileServerNotificationCapabilities;
      })
  | {
      /** Signed query for wallet markets and Identity bells. */
      type: 'notification_subscriptions';
    }
  | ({
      /** One revision-guarded subscription operation. */
      type: 'update_notification_subscriptions';
    } & MobileServerNotificationSubscriptionsUpdate)
  | {
      /** Signed query for the wallet's private notification page. */
      type: 'notification_inbox_v2';
      /** Previous page cursor, or nil for the first page. */
      cursor: string | null;
      /** Page size, or nil for the server default. */
      limit: number | null;
    }
  | {
      /** Atomic product analytics batch. */
      type: 'record_product_events';
      /** Events in caller order. */
      events: MobileServerProductEvent[];
    }
  | { type: 'set_bio'; bio: string }
  | { type: 'create_avatar_upload'; content_length: number }
  | {
      type: 'set_avatar';
      avatar: MobileServerAvatarSelection | null;
    }
  | { type: 'set_username'; display_name: string }
  | { type: 'set_private_mode'; private_mode: boolean }
  | ({
      /** Legacy device registration without a capability declaration. */
      type: 'register_expo_token';
    } & MobileServerRegisterExpoTokenParams)
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
  /**
   * Overrides the generated nonce; mainly useful for tests that pin the signed payload.
   */
  nonce?: bigint;
}
