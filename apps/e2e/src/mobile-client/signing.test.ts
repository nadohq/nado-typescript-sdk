import {
  buildSignedMobileRequest,
  canonicalizeMobileInner,
  getMobileNonce,
  getMobilePayloadHash,
  MobileSignedInner,
  stringifyMobileRequest,
} from '@nadohq/mobile-client';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
  subaccountToHex,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createWalletClient, http, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import { assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';

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
  // The three execute hashes below mirror the backend's pinned fixtures in mobile/src/api/types.rs.
  register_expo_token:
    '0x1b9471afc9bde66f9bffd576d3326420e1bade4e16afa3a73ddc65f27155611c',
  unregister_expo_token:
    '0xd131071d0898c97496f3d41dfc05f30a5f82c95e550944c4fba47419ddd0ebf3',
  update_preferences:
    '0x071b8ac6f3d2518267dd238c8c96e15e07e0552aede3ba32383706bb05726f83',
  notification_preferences:
    '0x3694dda0e5732b36eb3b60da6b147ec4e35520fc54529610c69d19d722d4fe97',
  registered_devices:
    '0xe77b42e32d27f054f86d5ed52c9aac7b3eed857eb6209ee883c92f01b84d3334',
} as const;

void describe('[mobile-client]: signing (offline)', () => {
  void describe('pinned payload hashes', () => {
    void test('claim_username', () => {
      const inner: MobileSignedInner = {
        type: 'claim_username',
        display_name: 'Alice.One',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.claim_username);
    });

    void test('update_username', () => {
      const inner: MobileSignedInner = {
        type: 'update_username',
        display_name: 'Alice.Two',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.update_username);
    });

    void test('set_private_mode', () => {
      const inner: MobileSignedInner = {
        type: 'set_private_mode',
        private_mode: true,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.set_private_mode);
    });

    void test('self_identity', () => {
      const inner: MobileSignedInner = { type: 'self_identity' };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.self_identity);
    });

    void test('register_expo_token', () => {
      const inner: MobileSignedInner = {
        type: 'register_expo_token',
        expo_token: 'ExponentPushToken[abcdef1234567890abcdef]',
        platform: 'ios',
        locale: 'en-GB',
        app_version: '1.2.3',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.register_expo_token);
    });

    void test('unregister_expo_token', () => {
      const inner: MobileSignedInner = {
        type: 'unregister_expo_token',
        expo_token: 'ExponentPushToken[abcdef1234567890abcdef]',
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.unregister_expo_token);
    });

    void test('update_preferences', () => {
      const inner: MobileSignedInner = {
        type: 'update_preferences',
        preferences: {
          schema_version: 1,
          categories: [{ category: 'order_fill', enabled: true, scopes: [] }],
        },
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.update_preferences);
    });

    void test('notification_preferences', () => {
      const inner: MobileSignedInner = { type: 'notification_preferences' };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.notification_preferences);
    });

    void test('registered_devices', () => {
      const inner: MobileSignedInner = { type: 'registered_devices' };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      assert.equal(hash, PINNED_HASHES.registered_devices);
    });
  });

  void test('canonicalizes msgpack key order regardless of input key order', () => {
    // Deliberately construct the inner payload with `type` last — canonicalizeMobileInner must rebuild it
    // with `type` first so the msgpack encoding (and therefore the payload hash) is deterministic.
    const outOfOrderInner = {
      private_mode: true,
      type: 'set_private_mode',
    } as MobileSignedInner;

    const hash = getMobilePayloadHash(canonicalizeMobileInner(outOfOrderInner));
    assert.equal(hash, PINNED_HASHES.set_private_mode);
  });

  void test('canonicalizes nested preference key order regardless of input key order', () => {
    // Nested preference objects must also be rebuilt in the backend's struct declaration order
    // (schema_version, categories; category, enabled, scopes) for the msgpack hash to be deterministic.
    const outOfOrderInner = {
      preferences: {
        categories: [{ scopes: [], enabled: true, category: 'order_fill' }],
        schema_version: 1,
      },
      type: 'update_preferences',
    } as unknown as MobileSignedInner;

    const hash = getMobilePayloadHash(canonicalizeMobileInner(outOfOrderInner));
    assert.equal(hash, PINNED_HASHES.update_preferences);
  });

  void describe('nonce generation', () => {
    void test('encodes a ~30s-ahead receive deadline as a bigint', () => {
      const before = Date.now();
      const nonce = getMobileNonce();
      const after = Date.now();

      assert.equal(typeof nonce, 'bigint');

      const deadlineMs = nonce / 1_000_000n;
      assert.ok(
        deadlineMs >= BigInt(before + 29_000),
        `deadline ${deadlineMs} should be at least ~29s ahead of ${before}`,
      );
      assert.ok(
        deadlineMs <= BigInt(after + 30_000),
        `deadline ${deadlineMs} should be at most ~30s ahead of ${after}`,
      );
    });

    void test('produces distinct nonces on successive calls', () => {
      const a = getMobileNonce();
      const b = getMobileNonce();
      assert.notEqual(a, b);
    });
  });

  void test('stringifyMobileRequest serializes the bigint nonce as an unquoted decimal token', () => {
    // Beyond Number.MAX_SAFE_INTEGER (2^53 - 1) to prove the nonce never passes through `Number`.
    const nonce = 30123456789012345678n;
    const body = {
      type: 'claim_username' as const,
      display_name: 'Ünïcödé_日本語',
      signature: '0xdeadbeef',
      sender: '0x00',
      nonce,
    };

    const json = stringifyMobileRequest(body);

    assert.match(
      json,
      /"nonce":\d+\}$/,
      'nonce should be an unquoted trailing integer',
    );
    assert.doesNotMatch(json, /"nonce":"\d+"/, 'nonce should not be quoted');

    const nonceDigits = /"nonce":(\d+)\}$/.exec(json)?.[1];
    assertDefined(nonceDigits, 'nonceDigits');
    assert.equal(
      nonceDigits,
      nonce.toString(),
      'manually extracting the trailing digits should recover the exact nonce',
    );

    const withoutNonceJson = `${json.slice(0, json.lastIndexOf(',"nonce":'))}}`;
    const parsed = JSON.parse(withoutNonceJson) as Omit<typeof body, 'nonce'>;
    assert.equal(parsed.type, body.type);
    assert.equal(
      parsed.display_name,
      body.display_name,
      'unicode display_name should survive serialization',
    );
    assert.equal(parsed.signature, body.signature);
    assert.equal(parsed.sender, body.sender);
  });

  void test('signs a request that recovers to the expected signer with a correctly flattened body', async () => {
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
    debugPrint('Signed mobile request', signedRequest);

    assert.equal(signedRequest.type, 'set_private_mode');
    assert.equal(signedRequest.private_mode, true);
    assert.equal(signedRequest.nonce, nonce);

    const expectedSender = subaccountToHex({
      subaccountOwner,
      subaccountName,
    }).toLowerCase();
    assert.equal(
      signedRequest.sender,
      expectedSender,
      'sender should derive from the owner, not the signer',
    );

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

    assert.equal(recoveredAddress.toLowerCase(), account.address.toLowerCase());
  });
});
