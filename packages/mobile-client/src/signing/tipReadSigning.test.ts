import { describe, expect, it, jest } from '@jest/globals';
import { encode } from '@msgpack/msgpack';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
} from '@nadohq/shared';
import {
  bytesToHex,
  createWalletClient,
  hashTypedData,
  Hex,
  http,
  recoverTypedDataAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { buildSignedMobileRequest } from './buildSignedMobileRequest';
import { canonicalizeMobileInner } from './canonicalize';
import { MOBILE_EIP712_METHOD_BY_TYPE } from './eip712MethodByType';
import { getMobilePayloadHash } from './payloadHash';
import { MobileSignedInnerByType, MobileSignedRequest } from './types';

type TipReadInner =
  | MobileSignedInnerByType<'tip_detail'>
  | Extract<MobileSignedInnerByType<'tips_history'>, { mode: 'list' }>
  | MobileSignedInnerByType<'received_tips'>
  | MobileSignedInnerByType<'mark_tips_seen'>;

interface TipReadSigningVector {
  method: string;
  payload_msgpack_hex: Hex;
  payload_hash: Hex;
  authentication_digest: Hex;
  request: MobileSignedRequest<TipReadInner>;
}

interface TipReadSigningFixture {
  chain_id: number;
  endpoint: Hex;
  signer: Hex;
  vectors: TipReadSigningVector[];
}

// Backend d829a1f: mobile/tests/fixtures/tip-read-signing.json, published with PR5.
const fixture = jest.requireActual<TipReadSigningFixture>(
  './fixtures/tip-read-signing.json',
);
const owner = privateKeyToAccount(`0x${'0'.repeat(63)}1`);
const walletClient = createWalletClient({
  account: owner,
  chain: foundry,
  transport: http(),
});

function createInner(vector: TipReadSigningVector): TipReadInner {
  return Object.fromEntries(
    Object.entries(vector.request)
      .filter(([field]) => !['sender', 'nonce', 'signature'].includes(field))
      .reverse(),
  ) as TipReadInner;
}

describe('PR5 Tip read signing', () => {
  it.each(fixture.vectors)(
    'matches backend bytes, hash, authentication digest and signer for $method',
    async (vector) => {
      const inner = createInner(vector);
      const before = JSON.stringify(inner);
      const canonical = canonicalizeMobileInner(inner);
      expect(bytesToHex(encode(canonical))).toBe(vector.payload_msgpack_hex);
      expect(getMobilePayloadHash(canonical)).toBe(vector.payload_hash);
      expect(MOBILE_EIP712_METHOD_BY_TYPE[canonical.type]).toBe(vector.method);
      const typedData = {
        domain: getNadoEIP712Domain(fixture.endpoint, fixture.chain_id),
        types: getNadoEIP712Types('nado_authentication'),
        primaryType: getNadoEIP712PrimaryType('nado_authentication'),
        message: {
          method: vector.method,
          sender: vector.request.sender,
          payloadHash: getMobilePayloadHash(canonical),
          nonce: BigInt(vector.request.nonce),
        },
      };
      expect(hashTypedData(typedData)).toBe(vector.authentication_digest);
      expect(
        (
          await recoverTypedDataAddress({
            ...typedData,
            signature: vector.request.signature,
          })
        ).toLowerCase(),
      ).toBe(fixture.signer.toLowerCase());
      expect(JSON.stringify(inner)).toBe(before);
      if (
        inner.type === 'mark_tips_seen' &&
        canonical.type === 'mark_tips_seen'
      ) {
        expect(canonical.tip_ids).not.toBe(inner.tip_ids);
        expect(canonical.tip_ids).toEqual(inner.tip_ids);
      }
    },
  );

  it.each(fixture.vectors)(
    'builds exactly the published signed HTTP request for $method',
    async (vector) => {
      const request = await buildSignedMobileRequest({
        walletClient,
        subaccountOwner: owner.address,
        subaccountName: 'default',
        chainId: fixture.chain_id,
        verifyingAddr: fixture.endpoint,
        nonce: BigInt(vector.request.nonce),
        inner: createInner(vector),
      });
      expect(request).toEqual(vector.request);
    },
  );

  it('preserves explicit null history scope and pagination in their canonical order', () => {
    const canonical = canonicalizeMobileInner({
      type: 'tips_history',
      mode: 'list',
      direction: 'all',
      subaccount: null,
      cursor: null,
      limit: null,
    });
    expect(Object.keys(canonical)).toEqual([
      'type',
      'mode',
      'direction',
      'subaccount',
      'cursor',
      'limit',
    ]);
    expect(canonical).toMatchObject({
      subaccount: null,
      cursor: null,
      limit: null,
    });
  });

  it('covers the order of seen IDs so reordering a batch changes its signed payload', () => {
    const inner: MobileSignedInnerByType<'mark_tips_seen'> = {
      type: 'mark_tips_seen',
      tip_ids: [
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
      ],
    };
    expect(getMobilePayloadHash(canonicalizeMobileInner(inner))).not.toBe(
      getMobilePayloadHash(
        canonicalizeMobileInner({
          ...inner,
          tip_ids: [...inner.tip_ids].reverse(),
        }),
      ),
    );
  });
});
