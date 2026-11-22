import { describe, expect, it, jest } from '@jest/globals';
import { encode } from '@msgpack/msgpack';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
} from '@nadohq/shared';
import { Hex, bytesToHex, hashTypedData, recoverTypedDataAddress } from 'viem';
import { canonicalizeMobileInner } from './canonicalize';
import { MOBILE_EIP712_METHOD_BY_TYPE } from './eip712MethodByType';
import { getMobilePayloadHash } from './payloadHash';
import { MobileSignedInnerByType, MobileSignedRequest } from './types';

type MappingInner = MobileSignedInnerByType<'tips_history'>;
interface MappingSigningFixture {
  chain_id: number;
  endpoint: Hex;
  method: string;
  payload_hash: Hex;
  authentication_digest: Hex;
  signer: Hex;
  request: MobileSignedRequest<MappingInner>;
}

// Frozen vector from the 22 November 2026 frontend handoff, section 3.
const fixture = jest.requireActual<MappingSigningFixture>(
  './fixtures/tip-collateral-mapping-signing.json',
);

function createInner(): MappingInner {
  return {
    submission_indices: [...fixture.request.submission_indices],
    direction: fixture.request.direction,
    product_id: fixture.request.product_id,
    subaccount: fixture.request.subaccount,
    mode: fixture.request.mode,
    type: fixture.request.type,
  };
}

describe('tips_history collateral_mapping signing', () => {
  it('matches the published MessagePack vector regardless of caller key order', () => {
    const inner = createInner();
    const original = {
      ...inner,
      submission_indices: [...inner.submission_indices],
    };
    const canonical = canonicalizeMobileInner(inner);
    const reference = Object.fromEntries(
      Object.entries(fixture.request).filter(
        ([field]) => !['sender', 'nonce', 'signature'].includes(field),
      ),
    );

    expect(Object.keys(canonical)).toEqual([
      'type',
      'mode',
      'subaccount',
      'product_id',
      'direction',
      'submission_indices',
    ]);
    expect(bytesToHex(encode(canonical))).toBe(bytesToHex(encode(reference)));
    expect(getMobilePayloadHash(canonical)).toBe(fixture.payload_hash);
    expect(canonical).not.toHaveProperty('cursor');
    expect(canonical).not.toHaveProperty('limit');
    if (canonical.type !== 'tips_history')
      throw new Error('Expected collateral mapping');
    expect(canonical.submission_indices).not.toBe(inner.submission_indices);
    expect(inner).toEqual(original);
  });

  it('matches the published EIP-712 digest and recovers its signer', async () => {
    const typedData = {
      domain: getNadoEIP712Domain(fixture.endpoint, fixture.chain_id),
      types: getNadoEIP712Types('nado_authentication'),
      primaryType: getNadoEIP712PrimaryType('nado_authentication'),
      message: {
        method: MOBILE_EIP712_METHOD_BY_TYPE.tips_history,
        sender: fixture.request.sender,
        payloadHash: getMobilePayloadHash(
          canonicalizeMobileInner(createInner()),
        ),
        nonce: BigInt(fixture.request.nonce),
      },
    };
    expect(MOBILE_EIP712_METHOD_BY_TYPE.tips_history).toBe(fixture.method);
    expect(hashTypedData(typedData)).toBe(fixture.authentication_digest);
    const signer = await recoverTypedDataAddress({
      ...typedData,
      signature: fixture.request.signature,
    });
    expect(signer.toLowerCase()).toBe(fixture.signer.toLowerCase());
  });
});
