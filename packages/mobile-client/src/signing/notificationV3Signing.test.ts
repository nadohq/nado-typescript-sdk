import { describe, expect, it, jest } from '@jest/globals';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
} from '@nadohq/shared';
import {
  createWalletClient,
  hashTypedData,
  Hex,
  http,
  recoverTypedDataAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { buildSignedMobileRequest } from './buildSignedMobileRequest';
import { canonicalizeMobileInner } from './canonicalize';
import { MOBILE_EIP712_METHOD_BY_TYPE } from './eip712MethodByType';
import { getMobilePayloadHash } from './payloadHash';
import { MobileSignedInnerByType, MobileSignedRequest } from './types';

type NotificationV3Inner =
  | MobileSignedInnerByType<'notification_inbox_v3'>
  | MobileSignedInnerByType<'mark_notifications_seen'>;

interface NotificationV3SigningVector {
  method: string;
  payload_hash: Hex;
  authentication_digest: Hex;
  request: MobileSignedRequest<NotificationV3Inner>;
}

interface NotificationV3SigningFixture {
  chain_id: number;
  endpoint: Hex;
  signer: Hex;
  vectors: NotificationV3SigningVector[];
}

// Backend d829a1f: mobile/tests/fixtures/notification-v3-signing.json, published with PR2.
const fixture = jest.requireActual<NotificationV3SigningFixture>(
  './fixtures/notification-v3-signing.json',
);
const owner = privateKeyToAccount(`0x${'0'.repeat(63)}2`);
const walletClient = createWalletClient({
  account: owner,
  chain: mainnet,
  transport: http(),
});

function createInner(vector: NotificationV3SigningVector): NotificationV3Inner {
  return Object.fromEntries(
    Object.entries(vector.request)
      .filter(([field]) => !['sender', 'nonce', 'signature'].includes(field))
      .reverse(),
  ) as NotificationV3Inner;
}

describe('PR2 notification v3 signing', () => {
  it.each(fixture.vectors)(
    'matches the backend hash, authentication digest and signer for $method (%#)',
    async (vector) => {
      const inner = createInner(vector);
      const before = JSON.stringify(inner);
      const canonical = canonicalizeMobileInner(inner);
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
        inner.type === 'mark_notifications_seen' &&
        canonical.type === 'mark_notifications_seen'
      ) {
        expect(canonical.notification_ids).not.toBe(inner.notification_ids);
      }
    },
  );

  it.each(fixture.vectors)(
    'builds the published signed request for $method (%#)',
    async (vector) => {
      expect(
        await buildSignedMobileRequest({
          walletClient,
          subaccountOwner: owner.address,
          subaccountName: 'default',
          chainId: fixture.chain_id,
          verifyingAddr: fixture.endpoint,
          nonce: BigInt(vector.request.nonce),
          inner: createInner(vector),
        }),
      ).toEqual(vector.request);
    },
  );

  it('retains explicit null pagination and canonical field order', () => {
    const canonical = canonicalizeMobileInner({
      limit: null,
      cursor: null,
      type: 'notification_inbox_v3',
    });
    expect(Object.keys(canonical)).toEqual(['type', 'cursor', 'limit']);
    expect(canonical).toEqual({
      type: 'notification_inbox_v3',
      cursor: null,
      limit: null,
    });
  });

  it('keeps seen ID order and duplicates in the signed batch for server-side deduplication', () => {
    const inner: MobileSignedInnerByType<'mark_notifications_seen'> = {
      type: 'mark_notifications_seen',
      notification_ids: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111',
      ],
    };
    const canonical = canonicalizeMobileInner(inner);
    expect(canonical).toEqual(inner);
    expect(getMobilePayloadHash(canonical)).not.toBe(
      getMobilePayloadHash(
        canonicalizeMobileInner({
          ...inner,
          notification_ids: [...new Set(inner.notification_ids)],
        }),
      ),
    );
  });
});
