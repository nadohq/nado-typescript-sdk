import { describe, expect, it } from '@jest/globals';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
  subaccountToHex,
} from '@nadohq/shared';
import { createWalletClient, http, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import { buildSignedMobileRequest } from './buildSignedMobileRequest';
import { canonicalizeMobileInner } from './canonicalize';
import { getMobileNonce } from './nonce';
import { getMobilePayloadHash } from './payloadHash';
import { MobileSignedInner } from './types';

// Fixed test key — these tests are offline (no network I/O) and only exercise local signing/hashing logic.
const FIXED_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907' as const;
const FIXED_VERIFYING_ADDR = '0x0000000000000000000000000000000000000001';

// Every hash here mirrors the backend's pinned fixtures in mobile/src/api/types.rs, so a divergence is a
// real wire-format break rather than a stale expectation.
const PINNED_HASHES = {
  set_username:
    '0xb4a55d9eb0be4e5c9457761c0c34c75cf39f7c07bd170700d8dd5e9c7de4a659',
  set_private_mode:
    '0x4d12a06234d751e6ddcc01d8f70836bb5b7e207e573641d1efb5aaf2b0f30d10',
  register_expo_token:
    '0x1b9471afc9bde66f9bffd576d3326420e1bade4e16afa3a73ddc65f27155611c',
  set_follow_true:
    '0x1ff8529b7c1a0111313eed98536e591555a3bcab51133776ce30c6ef32b559b3',
  set_follow_false:
    '0xec9e9e8f32ac4fcf3015f8b7f20c338623ff85db0488703c7fb688519a46e2e5',
  follow_summary:
    '0x9872d3eb331bd76476d6b22003f8e929de88b44fea6a65492ed48b14ecdbf99f',
  followers:
    '0x44f3cd2c991196cf949a25cebe0e16a4e5e8a14846d35751f3931de3c8ffcabd',
  following:
    '0xaddabad62abf1919dcd4250eee20359970cbfb59f4c81536551462f8918e5ddd',
} as const;

// Every follow fixture on the backend targets this subaccount.
const FIXTURE_TARGET_SUBACCOUNT =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as const;

describe('[mobile-client]: signing (offline)', () => {
  describe('pinned payload hashes', () => {
    it('set_username', () => {
      const inner: MobileSignedInner = {
        type: 'set_username',
        display_name: 'Alice.One',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.set_username);
    });

    it('set_private_mode', () => {
      const inner: MobileSignedInner = {
        type: 'set_private_mode',
        private_mode: true,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.set_private_mode);
    });

    it('register_expo_token', () => {
      const inner: MobileSignedInner = {
        type: 'register_expo_token',
        expo_token: 'ExponentPushToken[abcdef1234567890abcdef]',
        platform: 'ios',
        locale: 'en-GB',
        app_version: '1.2.3',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.register_expo_token);
    });

    it('set_follow (follow)', () => {
      const inner: MobileSignedInner = {
        type: 'set_follow',
        subaccount: FIXTURE_TARGET_SUBACCOUNT,
        is_following: true,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.set_follow_true);
    });

    it('set_follow (unfollow)', () => {
      const inner: MobileSignedInner = {
        type: 'set_follow',
        subaccount: FIXTURE_TARGET_SUBACCOUNT,
        is_following: false,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.set_follow_false);
    });

    it('follow_summary', () => {
      const inner: MobileSignedInner = {
        type: 'follow_summary',
        subaccount: FIXTURE_TARGET_SUBACCOUNT,
        followed_by_limit: 2,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.follow_summary);
    });

    it('followers', () => {
      const inner: MobileSignedInner = {
        type: 'followers',
        subaccount: FIXTURE_TARGET_SUBACCOUNT,
        cursor: null,
        limit: 50,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.followers);
    });

    it('following', () => {
      const inner: MobileSignedInner = {
        type: 'following',
        subaccount: FIXTURE_TARGET_SUBACCOUNT,
        cursor: null,
        limit: 50,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.following);
    });
  });

  it('canonicalizes msgpack key order regardless of input key order', () => {
    // Deliberately construct the inner payload with `type` last — canonicalizeMobileInner must rebuild it
    // with `type` first so the msgpack encoding (and therefore the payload hash) is deterministic.
    const outOfOrderInner = {
      private_mode: true,
      type: 'set_private_mode',
    } as MobileSignedInner;

    const hash = getMobilePayloadHash(canonicalizeMobileInner(outOfOrderInner));
    expect(hash).toBe(PINNED_HASHES.set_private_mode);
  });

  it('canonicalizes multi-field key order regardless of input key order', () => {
    // register_expo_token has the most fields of any signed payload, so it is where a caller is most likely
    // to get the order wrong; canonicalizeMobileInner must rebuild it in the backend's declaration order.
    const outOfOrderInner = {
      app_version: '1.2.3',
      locale: 'en-GB',
      platform: 'ios',
      expo_token: 'ExponentPushToken[abcdef1234567890abcdef]',
      type: 'register_expo_token',
    } as MobileSignedInner;

    const hash = getMobilePayloadHash(canonicalizeMobileInner(outOfOrderInner));
    expect(hash).toBe(PINNED_HASHES.register_expo_token);
  });

  describe('nonce generation', () => {
    it('encodes a ~30s-ahead receive deadline as a bigint', () => {
      const before = Date.now();
      const nonce = getMobileNonce();
      const after = Date.now();

      expect(typeof nonce).toBe('bigint');

      const deadlineMs = nonce / 1_000_000n;
      expect(deadlineMs >= BigInt(before + 29_000)).toBe(true);
      expect(deadlineMs <= BigInt(after + 30_000)).toBe(true);
    });

    it('produces distinct nonces on successive calls', () => {
      const a = getMobileNonce();
      const b = getMobileNonce();
      expect(a).not.toBe(b);
    });
  });

  it('signs a request that recovers to the expected signer with a correctly flattened body', async () => {
    const account = privateKeyToAccount(FIXED_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: ink,
      transport: http(),
    });

    const subaccountOwner = account.address;
    const subaccountName = 'default';
    const chainId = ink.id;
    const verifyingAddr = FIXED_VERIFYING_ADDR;
    const nonce = 30_000_000_000_000n;

    const signedRequest = await buildSignedMobileRequest({
      walletClient,
      subaccountOwner,
      subaccountName,
      chainId,
      verifyingAddr,
      inner: { type: 'set_private_mode', private_mode: true },
      nonce,
    });

    expect(signedRequest.type).toBe('set_private_mode');
    expect(signedRequest.private_mode).toBe(true);
    expect(signedRequest.nonce).toBe(nonce.toString());

    const expectedSender = subaccountToHex({
      subaccountOwner,
      subaccountName,
    }).toLowerCase();
    expect(signedRequest.sender).toBe(expectedSender);

    const payloadHash = getMobilePayloadHash(
      canonicalizeMobileInner({ type: 'set_private_mode', private_mode: true }),
    );
    const recoveredAddress = await recoverTypedDataAddress({
      domain: getNadoEIP712Domain(verifyingAddr, chainId),
      types: getNadoEIP712Types('nado_authentication'),
      primaryType: getNadoEIP712PrimaryType('nado_authentication'),
      message: {
        method: 'mobile:execute_set_private_mode',
        sender: signedRequest.sender,
        payloadHash,
        nonce,
      },
      signature: signedRequest.signature,
    });

    expect(recoveredAddress.toLowerCase()).toBe(account.address.toLowerCase());
  });
});
