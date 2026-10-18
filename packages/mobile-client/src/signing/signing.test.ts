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

// Every hash here mirrors the backend's pinned fixtures in mobile/src/api, so a divergence is a
// real wire-format break rather than a stale expectation.
const PINNED_HASHES = {
  set_bio: '0x96206cad01c9b00d69412721842ca0866bb1a82ec90f3979b8bcc91dc96a1243',
  create_avatar_upload:
    '0xb3811340e751e2799d3a24467fa50aeb221e1ecea5aa6599ab09bd2426162495',
  set_avatar_preset:
    '0x9113b26919a71b910a4f61f4342121896a106014acaeef5da5a2d2e3f09e17ab',
  set_avatar_clear:
    '0x8ed3e0bc36cda8de523a22414c495e12385366d1cb61622be807b939505174ae',
  set_avatar_upload:
    '0xe036ffdffa1fdde9104a1cee9bb254352de293550dade21e439a65fc6fbd3d2c',
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
  set_follow_batch_true:
    '0x0d86ef133ad5db8968911d102c48599691dcc40094ace985484c3f7e2cb3a87d',
  set_follow_batch_false:
    '0x02272ef5f6c7f9b315a892240af614f9cbbcb1edc69538db37ae1409549ff2fa',
} as const;

// Every follow fixture on the backend targets this subaccount.
const FIXTURE_TARGET_SUBACCOUNT =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as const;

// Batch follow fixtures target the subaccount above, then this one.
const FIXTURE_SECOND_TARGET_SUBACCOUNT =
  '0x2222222222222222222222222222222222222222222222222222222222222222' as const;

describe('[mobile-client]: signing (offline)', () => {
  describe('pinned payload hashes', () => {
    it('set_bio', () => {
      const inner: MobileSignedInner = {
        type: 'set_bio',
        bio: 'Trading 中文 🚀\nBuilding on @inkhq',
      };
      expect(getMobilePayloadHash(canonicalizeMobileInner(inner))).toBe(
        PINNED_HASHES.set_bio,
      );
    });

    it('create_avatar_upload', () => {
      const inner: MobileSignedInner = {
        type: 'create_avatar_upload',
        content_length: 12345,
      };
      expect(getMobilePayloadHash(canonicalizeMobileInner(inner))).toBe(
        PINNED_HASHES.create_avatar_upload,
      );
    });

    it('set_avatar (preset)', () => {
      const inner: MobileSignedInner = {
        type: 'set_avatar',
        avatar: { type: 'preset', id: 'penguin' },
      };
      expect(getMobilePayloadHash(canonicalizeMobileInner(inner))).toBe(
        PINNED_HASHES.set_avatar_preset,
      );
    });

    it('set_avatar (clear)', () => {
      const inner: MobileSignedInner = { type: 'set_avatar', avatar: null };
      expect(getMobilePayloadHash(canonicalizeMobileInner(inner))).toBe(
        PINNED_HASHES.set_avatar_clear,
      );
    });

    it('set_avatar (upload)', () => {
      const inner: MobileSignedInner = {
        type: 'set_avatar',
        avatar: { type: 'upload', upload_key: 'staging/avatars/test' },
      };
      expect(getMobilePayloadHash(canonicalizeMobileInner(inner))).toBe(
        PINNED_HASHES.set_avatar_upload,
      );
    });

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

    it('set_follow_batch (follow)', () => {
      const inner: MobileSignedInner = {
        type: 'set_follow_batch',
        subaccounts: [
          FIXTURE_TARGET_SUBACCOUNT,
          FIXTURE_SECOND_TARGET_SUBACCOUNT,
        ],
        is_following: true,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.set_follow_batch_true);
    });

    it('set_follow_batch (unfollow)', () => {
      const inner: MobileSignedInner = {
        type: 'set_follow_batch',
        subaccounts: [
          FIXTURE_TARGET_SUBACCOUNT,
          FIXTURE_SECOND_TARGET_SUBACCOUNT,
        ],
        is_following: false,
      };
      const hash = getMobilePayloadHash(canonicalizeMobileInner(inner));
      expect(hash).toBe(PINNED_HASHES.set_follow_batch_false);
    });
  });

  it('canonicalizes nested avatar fields before hashing', () => {
    const inner: MobileSignedInner = {
      avatar: { id: 'penguin', type: 'preset' },
      type: 'set_avatar',
    };
    expect(getMobilePayloadHash(canonicalizeMobileInner(inner))).toBe(
      PINNED_HASHES.set_avatar_preset,
    );
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

describe('[mobile-client]: social content signing', () => {
  const requestId = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
  const positionId = 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB';
  const itemId = 'CCCCCCCC-CCCC-4CCC-8CCC-CCCCCCCCCCCC';
  const mention = {
    label: '@Alice',
    end: 8,
    start: 2,
    subaccount: FIXTURE_TARGET_SUBACCOUNT,
  };
  const text = '🚀 @Alice  ';
  const drawing = ' { "lines" : [], "enabled": false } ';

  it('canonicalizes every post field and nested mention without changing content', () => {
    const input: MobileSignedInner = {
      drawing_data_json: drawing,
      mentions: [mention],
      text,
      action_id: itemId,
      position_id: positionId,
      client_request_id: requestId,
      type: 'create_feed_post',
    };
    const result = canonicalizeMobileInner(input);
    expect(Object.keys(result)).toEqual([
      'type',
      'client_request_id',
      'position_id',
      'action_id',
      'text',
      'mentions',
      'drawing_data_json',
    ]);
    if (result.type !== 'create_feed_post') throw new Error('Expected post');
    expect(Object.keys(result.mentions[0])).toEqual([
      'subaccount',
      'start',
      'end',
      'label',
    ]);
    expect(result.client_request_id).toBe(requestId.toLowerCase());
    expect(result.action_id).toBe(itemId.toLowerCase());
    expect(result.text).toBe(text);
    expect(result.drawing_data_json).toBe(drawing);
    expect(result.mentions[0]).toEqual({
      subaccount: FIXTURE_TARGET_SUBACCOUNT,
      start: 2,
      end: 8,
      label: '@Alice',
    });
    expect(input.position_id).toBe(positionId);
    expect(Object.keys(mention)).toEqual([
      'label',
      'end',
      'start',
      'subaccount',
    ]);
  });

  it('omits absent optional fields but retains empty text and mention arrays', () => {
    const post = canonicalizeMobileInner({
      type: 'create_feed_post',
      client_request_id: requestId,
      position_id: positionId,
      action_id: undefined,
      text: '',
      mentions: [],
      drawing_data_json: 'false',
    });
    expect(Object.keys(post)).toEqual([
      'type',
      'client_request_id',
      'position_id',
      'text',
      'mentions',
      'drawing_data_json',
    ]);
    const comment = canonicalizeMobileInner({
      type: 'create_feed_comment',
      client_request_id: requestId,
      root_item_id: itemId,
      reply_to_item_id: undefined,
      text,
      mentions: [],
      attached_position_id: undefined,
    });
    expect(Object.keys(comment)).toEqual([
      'type',
      'client_request_id',
      'root_item_id',
      'text',
      'mentions',
    ]);
    expect(getMobilePayloadHash(comment)).not.toBe(
      getMobilePayloadHash({
        ...comment,
        reply_to_item_id: null,
      } as unknown as MobileSignedInner),
    );
  });

  it('canonicalizes comment optionals in backend order and preserves whitespace', () => {
    const comment = canonicalizeMobileInner({
      attached_position_id: positionId,
      mentions: [mention],
      text,
      reply_to_item_id: itemId,
      root_item_id: requestId,
      client_request_id: requestId,
      type: 'create_feed_comment',
    });
    expect(Object.keys(comment)).toEqual([
      'type',
      'client_request_id',
      'root_item_id',
      'reply_to_item_id',
      'text',
      'mentions',
      'attached_position_id',
    ]);
    if (comment.type !== 'create_feed_comment')
      throw new Error('Expected comment');
    expect(comment.attached_position_id).toBe(positionId.toLowerCase());
    expect(comment.text).toBe(text);
    expect(Object.keys(comment.mentions[0])).toEqual([
      'subaccount',
      'start',
      'end',
      'label',
    ]);
  });

  it('does not reformat JSON before hashing or normalize falsy drawing values', () => {
    const inner: MobileSignedInner = {
      type: 'update_feed_chart_drawing',
      item_id: itemId,
      data_json: drawing,
    };
    const canonical = canonicalizeMobileInner(inner);
    expect(Object.keys(canonical)).toEqual(['type', 'item_id', 'data_json']);
    expect(getMobilePayloadHash(canonical)).not.toBe(
      getMobilePayloadHash(
        canonicalizeMobileInner({
          ...inner,
          data_json: JSON.stringify(JSON.parse(drawing)),
        }),
      ),
    );
    for (const dataJson of ['false', '0']) {
      expect(
        canonicalizeMobileInner({ ...inner, data_json: dataJson }),
      ).toEqual({
        type: inner.type,
        item_id: itemId.toLowerCase(),
        data_json: dataJson,
      });
    }
  });

  const payloads: MobileSignedInner[] = [
    {
      type: 'create_feed_post',
      client_request_id: requestId,
      position_id: positionId,
      text,
      mentions: [mention],
    },
    {
      type: 'create_feed_comment',
      client_request_id: requestId,
      root_item_id: itemId,
      text,
      mentions: [],
    },
    { type: 'create_feed_chart_drawing', item_id: itemId, data_json: 'false' },
    { type: 'update_feed_chart_drawing', item_id: itemId, data_json: '0' },
    { type: 'set_feed_like', item_id: itemId, is_liked: false },
  ];
  it.each(payloads)(
    'recovers the signer for $type using its execute method domain',
    async (inner) => {
      const account = privateKeyToAccount(FIXED_PRIVATE_KEY);
      const walletClient = createWalletClient({
        account,
        chain: ink,
        transport: http(),
      });
      const nonce = 30_000_000_000_000n;
      const signed = await buildSignedMobileRequest({
        walletClient,
        subaccountOwner: account.address,
        subaccountName: 'default',
        chainId: ink.id,
        verifyingAddr: FIXED_VERIFYING_ADDR,
        nonce,
        inner,
      });
      const canonical = canonicalizeMobileInner(inner);
      const recovered = await recoverTypedDataAddress({
        domain: getNadoEIP712Domain(FIXED_VERIFYING_ADDR, ink.id),
        types: getNadoEIP712Types('nado_authentication'),
        primaryType: getNadoEIP712PrimaryType('nado_authentication'),
        message: {
          method: 'mobile:execute_' + inner.type,
          sender: signed.sender,
          payloadHash: getMobilePayloadHash(canonical),
          nonce,
        },
        signature: signed.signature,
      });
      expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
      expect(signed).toMatchObject(canonical);
      expect(signed).not.toHaveProperty('payload');
    },
  );
});
