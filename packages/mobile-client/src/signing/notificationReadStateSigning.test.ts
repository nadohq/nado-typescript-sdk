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

type NotificationReadStateInner =
  | MobileSignedInnerByType<'notification_inbox_v2'>
  | MobileSignedInnerByType<'mark_notifications_seen'>;

interface NotificationReadStateSigningVector {
  method: string;
  payload_hash: Hex;
  authentication_digest: Hex;
  request: MobileSignedRequest<NotificationReadStateInner>;
}

interface NotificationReadStateSigningFixture {
  chain_id: number;
  endpoint: Hex;
  signer: Hex;
  vectors: NotificationReadStateSigningVector[];
}

// Backend 450684e: mobile/tests/fixtures/notification-read-state-signing.json.
const fixture = jest.requireActual<NotificationReadStateSigningFixture>(
  './fixtures/notification-read-state-signing.json',
);
const owner = privateKeyToAccount(`0x${'0'.repeat(63)}2`);
const walletClient = createWalletClient({
  account: owner,
  chain: mainnet,
  transport: http(),
});

function createInner(
  vector: NotificationReadStateSigningVector,
): NotificationReadStateInner {
  return Object.fromEntries(
    Object.entries(vector.request)
      .filter(([field]) => !['sender', 'nonce', 'signature'].includes(field))
      .reverse(),
  ) as NotificationReadStateInner;
}

describe('v2 notification read-state signing', () => {
  it.each(fixture.vectors)(
    'matches the backend payload hash, EIP-712 digest and signer for $method (%#)',
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
      const signer = await recoverTypedDataAddress({
        ...typedData,
        signature: vector.request.signature,
      });
      expect(signer.toLowerCase()).toBe(fixture.signer.toLowerCase());
      expect(JSON.stringify(inner)).toBe(before);
      if (
        inner.type === 'notification_inbox_v2' &&
        canonical.type === 'notification_inbox_v2'
      ) {
        expect(Object.keys(canonical)).toEqual([
          'type',
          'cursor',
          'limit',
          ...(inner.supported_types === undefined ? [] : ['supported_types']),
        ]);
        if (inner.supported_types !== undefined) {
          expect(canonical.supported_types).toEqual(inner.supported_types);
          expect(canonical.supported_types).not.toBe(inner.supported_types);
        } else {
          expect(canonical).not.toHaveProperty('supported_types');
        }
      }
    },
  );

  it.each(fixture.vectors)(
    'builds the exact published signed request for $method (%#)',
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

  it('keeps omitted, empty and ordered filters distinct without mutating the caller', () => {
    const unfiltered: MobileSignedInnerByType<'notification_inbox_v2'> = {
      type: 'notification_inbox_v2',
      cursor: null,
      limit: 20,
    };
    const types = ['deposit_completed', 'deposit_completed', 'new_follower'];
    const original = [...types];
    const filtered = canonicalizeMobileInner({
      ...unfiltered,
      supported_types: types,
    });
    const empty = canonicalizeMobileInner({
      ...unfiltered,
      supported_types: [],
    });
    const omitted = canonicalizeMobileInner(unfiltered);
    const explicitUndefined = canonicalizeMobileInner({
      ...unfiltered,
      supported_types: undefined,
    });
    const reversed = canonicalizeMobileInner({
      ...unfiltered,
      supported_types: [...types].reverse(),
    });
    expect(omitted).not.toHaveProperty('supported_types');
    expect(explicitUndefined).toEqual(omitted);
    expect(empty).toHaveProperty('supported_types', []);
    expect(filtered).toHaveProperty('supported_types', original);
    expect(types).toEqual(original);
    expect(getMobilePayloadHash(empty)).not.toBe(getMobilePayloadHash(omitted));
    expect(getMobilePayloadHash(filtered)).not.toBe(
      getMobilePayloadHash(empty),
    );
    expect(getMobilePayloadHash(filtered)).not.toBe(
      getMobilePayloadHash(reversed),
    );
  });
});
