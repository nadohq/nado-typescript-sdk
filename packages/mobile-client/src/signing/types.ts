import { WalletClientWithAccount } from '@nadohq/shared';
import { Hex } from 'viem';
import { MobileSignedRequestParams } from '../types/clientTypes';
import { MobileNotificationPlatform } from '../types/serverModelTypes';

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
      type: 'followers';
      subaccount: Hex;
      /** `null` requests the first page; otherwise an opaque cursor from the previous page. */
      cursor: string | null;
      /** `null` requests the backend default of 25; otherwise 1–50. */
      limit: number | null;
    }
  | {
      type: 'following';
      subaccount: Hex;
      /** `null` requests the first page; otherwise an opaque cursor from the previous page. */
      cursor: string | null;
      /** `null` requests the backend default of 25; otherwise 1–50. */
      limit: number | null;
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
