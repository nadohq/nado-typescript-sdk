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
 */
export type MobileSignedInner =
  | { type: 'set_username'; display_name: string }
  | { type: 'set_private_mode'; private_mode: boolean }
  | { type: 'self_identity' }
  | {
      type: 'register_expo_token';
      expo_token: string;
      platform: MobileNotificationPlatform;
      // Optional on the wire, but always present (null when unset) so the msgpack payload hash matches the
      // backend, which serializes `Option::None` as nil under the same key.
      locale: string | null;
      app_version: string | null;
    }
  | { type: 'registered_devices' };

/**
 * Type-specific payload fields for a signed inner request of a given `type` (the inner payload without its
 * `type` tag). Derived from {@link MobileSignedInner} so the two never drift apart.
 */
export type MobileSignedInnerParams<T extends MobileSignedInner['type']> = Omit<
  Extract<MobileSignedInner, { type: T }>,
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
