import { describe, expect, it, jest } from '@jest/globals';
import { encode } from '@msgpack/msgpack';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
  getValidatedHex,
  subaccountToHex,
} from '@nadohq/shared';
import {
  Hex,
  bytesToHex,
  createWalletClient,
  hashTypedData,
  http,
  recoverTypedDataAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { buildSignedMobileRequest } from './buildSignedMobileRequest';
import { canonicalizeMobileInner } from './canonicalize';
import { MOBILE_EIP712_METHOD_BY_TYPE } from './eip712MethodByType';
import { getMobilePayloadHash } from './payloadHash';
import { MobileSignedInnerByType } from './types';

// Backend PR #103, commit d592b2cf6408cb60fef67ecfba47dacc5c6dcc61:
// mobile/tests/fixtures/submit-tip-signing.json and mobile/src/tip/wire.rs.
// The owner and linked-signer vectors pin both authentication layers without network I/O.
type SubmitTipInner = MobileSignedInnerByType<'submit_tip'>;
interface SubmitTipSigningVector {
  payload_hash: Hex;
  signer: Hex;
  request: SubmitTipInner & {
    sender: Hex;
    nonce: string;
    signature: Hex;
  };
}
interface SubmitTipSigningFixture {
  endpoint: Hex;
  chain_id: number;
  withdrawal_digest: Hex;
  first: SubmitTipSigningVector;
  confirmed: SubmitTipSigningVector;
  linked_inner: {
    withdrawal_signature: Hex;
    nonce: string;
    signature: Hex;
  };
}
const fixture = jest.requireActual<SubmitTipSigningFixture>(
  './fixtures/submit-tip-signing.json',
);
const endpoint = fixture.endpoint;
const initial = fixture.first.request;
const confirmed = fixture.confirmed.request;

function createInner(overrides: Partial<SubmitTipInner> = {}): SubmitTipInner {
  return {
    type: 'submit_tip',
    chain_id: initial.chain_id,
    recipient_subaccount: getValidatedHex(initial.recipient_subaccount),
    origin_post_id: initial.origin_post_id,
    note: initial.note,
    background_id: initial.background_id,
    visibility: 'private',
    withdrawal: {
      sender: getValidatedHex(initial.withdrawal.sender),
      productId: initial.withdrawal.productId,
      amount: initial.withdrawal.amount,
      nonce: initial.withdrawal.nonce,
      sendTo: getValidatedHex(initial.withdrawal.sendTo),
      appendix: initial.withdrawal.appendix,
    },
    withdrawal_signature: initial.withdrawal_signature,
    max_fee_x18: initial.max_fee_x18,
    ...overrides,
  };
}

function createConfirmedInner(): SubmitTipInner {
  return createInner({
    max_fee_x18: confirmed.max_fee_x18,
    expected_version: confirmed.expected_version,
  });
}

function withdrawalTypedData(withdrawal: SubmitTipInner['withdrawal']) {
  return {
    domain: getNadoEIP712Domain(endpoint, fixture.chain_id),
    types: getNadoEIP712Types('withdraw_collateral_v2'),
    primaryType: getNadoEIP712PrimaryType('withdraw_collateral_v2'),
    message: { ...withdrawal },
  };
}

describe('submit_tip signing', () => {
  describe('canonicalizeMobileInner', () => {
    it.each([
      [fixture.first, createInner()],
      [fixture.confirmed, createConfirmedInner()],
    ] as const)(
      'matches the backend MessagePack bytes and payload hash for nonce $0.request.nonce',
      (vector, inner) => {
        const backendInner = Object.fromEntries(
          Object.entries(vector.request).filter(
            ([field]) => !['sender', 'nonce', 'signature'].includes(field),
          ),
        );
        const canonical = canonicalizeMobileInner(inner);

        expect(bytesToHex(encode(canonical))).toBe(
          bytesToHex(encode(backendInner)),
        );
        expect(getMobilePayloadHash(canonical)).toBe(vector.payload_hash);
      },
    );

    it('rebuilds arbitrary outer and withdrawal key order without changing the input', () => {
      const reference = createConfirmedInner();
      const withdrawal = Object.freeze({
        appendix: reference.withdrawal.appendix,
        sendTo: reference.withdrawal.sendTo,
        nonce: reference.withdrawal.nonce,
        amount: reference.withdrawal.amount,
        productId: reference.withdrawal.productId,
        sender: reference.withdrawal.sender,
      });
      const inner = Object.freeze({
        expected_version: reference.expected_version,
        max_fee_x18: reference.max_fee_x18,
        withdrawal_signature: reference.withdrawal_signature,
        withdrawal,
        visibility: reference.visibility,
        background_id: reference.background_id,
        note: reference.note,
        origin_post_id: reference.origin_post_id,
        recipient_subaccount: reference.recipient_subaccount,
        chain_id: reference.chain_id,
        type: reference.type,
      });
      const original = { ...inner, withdrawal: { ...inner.withdrawal } };
      const canonical = canonicalizeMobileInner(inner);

      expect(Object.keys(canonical)).toEqual([
        'type',
        'chain_id',
        'recipient_subaccount',
        'origin_post_id',
        'note',
        'background_id',
        'visibility',
        'withdrawal',
        'withdrawal_signature',
        'max_fee_x18',
        'expected_version',
      ]);
      if (canonical.type !== 'submit_tip') throw new Error('Expected Tip');
      expect(Object.keys(canonical.withdrawal)).toEqual([
        'sender',
        'productId',
        'amount',
        'nonce',
        'sendTo',
        'appendix',
      ]);
      expect(getMobilePayloadHash(canonical)).toBe(
        fixture.confirmed.payload_hash,
      );
      expect(canonical.withdrawal).not.toBe(withdrawal);
      expect(inner).toEqual(original);
      expect(Object.keys(inner.withdrawal)[0]).toBe('appendix');
    });

    it('retains null metadata, an explicit zero fee, and exact large integer strings', () => {
      const inner = createInner({
        chain_id: '9007199254740993',
        origin_post_id: null,
        note: null,
        max_fee_x18: '0',
        expected_version: '9007199254740995',
        withdrawal: {
          ...createInner().withdrawal,
          productId: 0,
          amount: '9007199254740993',
          nonce: '9007199254740994',
          appendix: '0',
        },
      });
      const canonical = canonicalizeMobileInner(inner);

      expect(canonical).toEqual(inner);
      expect(getMobilePayloadHash(canonical)).not.toBe(
        getMobilePayloadHash(
          canonicalizeMobileInner({ ...inner, max_fee_x18: '1' }),
        ),
      );
      expect(getMobilePayloadHash(canonical)).not.toBe(
        getMobilePayloadHash(canonicalizeMobileInner({ ...inner, note: '' })),
      );
    });

    it('omits an absent expected_version while retaining a reconfirmed version', () => {
      const canonical = canonicalizeMobileInner(
        createInner({ expected_version: undefined }),
      );

      expect(canonical).not.toHaveProperty('expected_version');
      expect(getMobilePayloadHash(canonical)).toBe(fixture.first.payload_hash);
      const reconfirmed = canonicalizeMobileInner(
        createInner({ expected_version: '2' }),
      );
      expect(reconfirmed).toHaveProperty('expected_version', '2');
      expect(getMobilePayloadHash(reconfirmed)).not.toBe(
        fixture.first.payload_hash,
      );
    });

    it('preserves backend String fields, including hex casing and Unicode whitespace', () => {
      const inner = createInner({
        recipient_subaccount:
          '0xABCDEFabcdef000000000000000000000000000064656661756c740000000000',
        note: '  Thanks 中文 🚀\n',
        withdrawal: {
          ...createInner().withdrawal,
          sender: getValidatedHex(
            initial.withdrawal.sender.toUpperCase().replace('0X', '0x'),
          ),
          sendTo: '0xABcdEFabcdef0000000000000000000000000000',
        },
        withdrawal_signature: initial.withdrawal_signature
          .toUpperCase()
          .replace('0X', '0x'),
      });
      const canonical = canonicalizeMobileInner(inner);

      expect(canonical).toEqual(inner);
      const lowercase = createInner({
        ...inner,
        recipient_subaccount: getValidatedHex(
          inner.recipient_subaccount.toLowerCase(),
        ),
        withdrawal: {
          ...inner.withdrawal,
          sender: getValidatedHex(inner.withdrawal.sender.toLowerCase()),
          sendTo: getValidatedHex(inner.withdrawal.sendTo.toLowerCase()),
        },
        withdrawal_signature: inner.withdrawal_signature.toLowerCase(),
      });
      expect(getMobilePayloadHash(canonical)).not.toBe(
        getMobilePayloadHash(canonicalizeMobileInner(lowercase)),
      );
    });

    it.each([
      { chain_id: '31338' },
      { recipient_subaccount: getValidatedHex(initial.withdrawal.sender) },
      { origin_post_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      { note: null },
      { background_id: 'other' },
      { visibility: 'public' },
      { withdrawal_signature: fixture.linked_inner.withdrawal_signature },
      { max_fee_x18: '0' },
      { expected_version: '2' },
      { withdrawal: { ...createInner().withdrawal, amount: '5000001' } },
      { withdrawal: { ...createInner().withdrawal, nonce: '43' } },
      { withdrawal: { ...createInner().withdrawal, appendix: '1' } },
      { withdrawal: { ...createInner().withdrawal, productId: 1 } },
      {
        withdrawal: {
          ...createInner().withdrawal,
          sendTo: '0x7777777777777777777777777777777777777777',
        },
      },
      {
        withdrawal: {
          ...createInner().withdrawal,
          sender: getValidatedHex(initial.recipient_subaccount),
        },
      },
    ] satisfies Partial<SubmitTipInner>[])(
      'binds every business field and inner withdrawal field to the signed hash (%#)',
      (override) => {
        const hash = getMobilePayloadHash(
          canonicalizeMobileInner(createInner(override)),
        );
        expect(hash).not.toBe(fixture.first.payload_hash);
      },
    );
  });

  describe('EIP-712 authorization', () => {
    it.each([
      [fixture.first, createInner()],
      [fixture.confirmed, createConfirmedInner()],
    ] as const)(
      'recovers the backend owner or linked signer for nonce $0.request.nonce',
      async (vector, inner) => {
        expect(MOBILE_EIP712_METHOD_BY_TYPE.submit_tip).toBe(
          'mobile:execute_submit_tip',
        );
        const recovered = await recoverTypedDataAddress({
          domain: getNadoEIP712Domain(endpoint, fixture.chain_id),
          types: getNadoEIP712Types('nado_authentication'),
          primaryType: getNadoEIP712PrimaryType('nado_authentication'),
          message: {
            method: MOBILE_EIP712_METHOD_BY_TYPE.submit_tip,
            sender: getValidatedHex(vector.request.sender),
            payloadHash: getMobilePayloadHash(canonicalizeMobileInner(inner)),
            nonce: BigInt(vector.request.nonce),
          },
          signature: getValidatedHex(vector.request.signature),
        });

        expect(recovered.toLowerCase()).toBe(vector.signer.toLowerCase());
      },
    );

    it('keeps the same owner-signed withdrawal through linked-signer fee reconfirmation', async () => {
      const inner = createInner();
      const reconfirmed = createConfirmedInner();
      const typedData = withdrawalTypedData(inner.withdrawal);
      const owner = await recoverTypedDataAddress({
        ...typedData,
        signature: getValidatedHex(inner.withdrawal_signature),
      });

      expect(hashTypedData(typedData)).toBe(fixture.withdrawal_digest);
      expect(reconfirmed.withdrawal).toEqual(inner.withdrawal);
      expect(reconfirmed.withdrawal_signature).toBe(inner.withdrawal_signature);
      expect(owner.toLowerCase()).toBe(fixture.first.signer.toLowerCase());
      expect(fixture.confirmed.signer.toLowerCase()).not.toBe(
        owner.toLowerCase(),
      );
      const linkedInnerSigner = await recoverTypedDataAddress({
        ...typedData,
        signature: getValidatedHex(fixture.linked_inner.withdrawal_signature),
      });
      expect(linkedInnerSigner.toLowerCase()).toBe(
        fixture.confirmed.signer.toLowerCase(),
      );
      expect(linkedInnerSigner.toLowerCase()).not.toBe(owner.toLowerCase());
    });

    it.each(['owner', 'linked'] as const)(
      'builds an exact flattened request with an %s outer signer and owner withdrawal',
      async (role) => {
        const owner = privateKeyToAccount(
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        );
        const linked = privateKeyToAccount(
          '0x0000000000000000000000000000000000000000000000000000000000000002',
        );
        const account = role === 'owner' ? owner : linked;
        const subaccount = {
          subaccountOwner: owner.address,
          subaccountName: 'default',
        };
        const withdrawal = {
          ...createInner().withdrawal,
          sender: subaccountToHex(subaccount),
        };
        const withdrawalSignature = await owner.signTypedData(
          withdrawalTypedData(withdrawal),
        );
        const inner = createInner({
          withdrawal,
          withdrawal_signature: withdrawalSignature,
        });
        const original = { ...inner, withdrawal: { ...inner.withdrawal } };
        const nonce = BigInt(initial.nonce);
        const signed = await buildSignedMobileRequest({
          ...subaccount,
          chainId: fixture.chain_id,
          verifyingAddr: endpoint,
          walletClient: createWalletClient({
            account,
            chain: foundry,
            transport: http(),
          }),
          inner,
          nonce,
        });
        const recovered = await recoverTypedDataAddress({
          domain: getNadoEIP712Domain(endpoint, fixture.chain_id),
          types: getNadoEIP712Types('nado_authentication'),
          primaryType: getNadoEIP712PrimaryType('nado_authentication'),
          message: {
            method: 'mobile:execute_submit_tip',
            sender: signed.sender,
            payloadHash: getMobilePayloadHash(canonicalizeMobileInner(inner)),
            nonce,
          },
          signature: signed.signature,
        });

        expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
        expect(signed).toEqual({
          ...inner,
          sender: subaccountToHex(subaccount),
          nonce: nonce.toString(),
          signature: signed.signature,
        });
        expect(signed.withdrawal).not.toBe(inner.withdrawal);
        expect(signed.withdrawal_signature).toBe(withdrawalSignature);
        expect(signed).not.toHaveProperty('expected_version');
        expect(inner).toEqual(original);
      },
    );
  });
});
