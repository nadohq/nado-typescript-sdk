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

const PINNED_HASHES = {
  claim_username:
    '0xcfbe9e0a546f43f6d68f86b38cf260ffe079af1915800c0e6df8724ddb6f2dff',
  update_username:
    '0x92c3831d30de8206f9ee9d4cf29ed2a2fb1612a3b818e2e46121fc1d5eb4edb6',
  set_private_mode:
    '0x4d12a06234d751e6ddcc01d8f70836bb5b7e207e573641d1efb5aaf2b0f30d10',
  self_identity:
    '0x10e94c4502cade0a0b4d7469717bcc1d266fc6a3b7635236fa1d3600b58c9954',
  // Mirrors the backend's pinned fixture in mobile/src/api/types.rs.
  register_expo_token:
    '0x1b9471afc9bde66f9bffd576d3326420e1bade4e16afa3a73ddc65f27155611c',
  registered_devices:
    '0xe77b42e32d27f054f86d5ed52c9aac7b3eed857eb6209ee883c92f01b84d3334',
} as const;

describe('[mobile-client]: signing (offline)', () => {
  describe('pinned payload hashes', () => {
    it('claim_username', () => {
      const inner: MobileSignedInner = {
        type: 'claim_username',
        display_name: 'Alice.One',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.claim_username);
    });

    it('update_username', () => {
      const inner: MobileSignedInner = {
        type: 'update_username',
        display_name: 'Alice.Two',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.update_username);
    });

    it('set_private_mode', () => {
      const inner: MobileSignedInner = {
        type: 'set_private_mode',
        private_mode: true,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.set_private_mode);
    });

    it('self_identity', () => {
      const inner: MobileSignedInner = { type: 'self_identity' };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.self_identity);
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

    it('registered_devices', () => {
      const inner: MobileSignedInner = { type: 'registered_devices' };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.registered_devices);
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
    // register_expo_token is the only signed payload with more than one field, so it is where a caller can
    // actually get the order wrong; canonicalizeMobileInner must rebuild it in the backend's declaration order.
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
