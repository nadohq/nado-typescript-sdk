import { encode } from '@msgpack/msgpack';
import {
  getNadoEIP712Domain,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/shared';
import { Hex, keccak256 } from 'viem';
import { MobileSignedRequestParams } from './types/clientTypes';
import {
  MobileNotificationPlatform,
  MobileServerNotificationPreferences,
} from './types/serverTypes';

/**
 * EIP-712 types for the `NadoAuthentication` primary type, used to sign every request to the Mobile
 * Identity API's `query` and `execute` routes.
 */
export const NADO_AUTHENTICATION_TYPES = {
  NadoAuthentication: [
    { name: 'method', type: 'string' },
    { name: 'sender', type: 'bytes32' },
    { name: 'payloadHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const;

/**
 * Unsigned inner payloads that can be authenticated against the Mobile Identity API. `type` must come first
 * in each literal so msgpack serializes it deterministically (see {@link canonicalizeMobileInner}).
 */
export type MobileSignedInner =
  | { type: 'claim_username'; display_name: string }
  | { type: 'update_username'; display_name: string }
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
  | { type: 'unregister_expo_token'; expo_token: string }
  | {
      type: 'update_preferences';
      preferences: MobileServerNotificationPreferences;
    }
  | { type: 'notification_preferences' }
  | { type: 'registered_devices' };

/**
 * EIP-712 `method` string for each signed inner payload type.
 */
export const MOBILE_METHOD_BY_TYPE: Record<MobileSignedInner['type'], string> =
  {
    claim_username: 'mobile:execute_claim_username',
    update_username: 'mobile:execute_update_username',
    set_private_mode: 'mobile:execute_set_private_mode',
    self_identity: 'mobile:query_self_identity',
    register_expo_token: 'mobile:execute_register_expo_token',
    unregister_expo_token: 'mobile:execute_unregister_expo_token',
    update_preferences: 'mobile:execute_update_preferences',
    notification_preferences: 'mobile:query_notification_preferences',
    registered_devices: 'mobile:query_registered_devices',
  };

/**
 * Rebuilds an inner payload as a literal with `type` first. msgpack encodes object keys in insertion order,
 * and the payload hash must be reproducible regardless of how the caller constructed the object, so every
 * inner payload is canonicalized before hashing.
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

/**
 * Computes the EIP-712 `payloadHash` for a canonicalized inner payload: `keccak256(msgpack(inner))`.
 *
 * @param inner - A canonicalized inner payload; callers must run {@link canonicalizeMobileInner} first.
 */
export function getMobilePayloadHash(inner: MobileSignedInner): Hex {
  return keccak256(encode(inner));
}

let nonceCounter = 0n;

/**
 * Generates a `nonce` for a signed Mobile Identity API request. The server reads `nonce / 1_000_000` as a
 * millisecond receive deadline, which must be later than server time and no more than 100s ahead — hence the
 * 30s deadline window here. The low six digits are a per-process counter so nonces generated within the same
 * millisecond stay distinct.
 */
export function getMobileNonce(): bigint {
  const deadlineMs = BigInt(Date.now() + 30_000);
  const nonce = deadlineMs * 1_000_000n + nonceCounter;
  nonceCounter = (nonceCounter + 1n) % 1_000_000n;
  return nonce;
}

/**
 * A signed Mobile Identity API request body: the inner payload flattened with its signature, sender, and
 * nonce (unlike the engine client, which wraps params under a `{ [type]: params }` key).
 */
export type MobileSignedRequest<
  T extends MobileSignedInner = MobileSignedInner,
> = T & {
  signature: Hex;
  sender: Hex;
  nonce: bigint;
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

/**
 * Builds and signs a Mobile Identity API request: canonicalizes the inner payload, derives `sender` from the
 * subaccount owner (never the signer), computes the EIP-712 `payloadHash`, signs the `NadoAuthentication`
 * typed data, and returns the flattened signed body ready to POST.
 */
export async function buildSignedMobileRequest<T extends MobileSignedInner>(
  params: BuildSignedMobileRequestParams & { inner: T },
): Promise<MobileSignedRequest<T>> {
  const {
    walletClient,
    subaccountOwner,
    subaccountName,
    chainId,
    verifyingAddr,
    inner,
  } = params;

  const canonicalInner = canonicalizeMobileInner(inner) as T;
  const sender = subaccountToHex({
    subaccountOwner,
    subaccountName,
  }).toLowerCase() as Hex;
  const payloadHash = getMobilePayloadHash(canonicalInner);
  const nonce = params.nonce ?? getMobileNonce();
  const method = MOBILE_METHOD_BY_TYPE[canonicalInner.type];

  const signature = await walletClient.signTypedData({
    domain: getNadoEIP712Domain(verifyingAddr, chainId),
    types: NADO_AUTHENTICATION_TYPES,
    primaryType: 'NadoAuthentication',
    message: { method, sender, payloadHash, nonce },
  });

  return {
    ...canonicalInner,
    signature,
    sender,
    nonce,
  };
}
