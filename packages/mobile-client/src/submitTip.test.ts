import { describe, expect, it } from '@jest/globals';
import { subaccountToHex, toBigNumber } from '@nadohq/shared';
import { mapMobileSubmitTipParamsToServer } from './dataMappers';
import { MobileSubmitTipParams } from './types';

const subaccount = {
  subaccountOwner: '0x1111111111111111111111111111111111111111',
  subaccountName: 'default',
} as const;

function createParams(
  overrides: Partial<MobileSubmitTipParams> = {},
): MobileSubmitTipParams {
  return {
    ...subaccount,
    chainId: 31337,
    verifyingAddr: '0x0123456789012345678901234567890123456789',
    nonce: 1795000000000000001n,
    recipientSubaccount: {
      subaccountOwner: '0x2222222222222222222222222222222222222222',
      subaccountName: 'trading',
    },
    backgroundId: 'celebration',
    visibility: 'private',
    withdrawal: {
      sender: subaccountToHex(subaccount),
      productId: 0,
      amount: '5000000',
      nonce: '42',
      sendTo: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      appendix: '0',
    },
    withdrawalSignature: `0x${'11'.repeat(65)}`,
    maxFeeX18: '20000000000000000',
    ...overrides,
  };
}

describe('submitTip', () => {
  describe('mapMobileSubmitTipParamsToServer', () => {
    it('encodes integers beyond the safe number range without rounding native or x18 units', () => {
      const preciseInteger = '900719925474099312345678901234567890';
      const params = createParams({ maxFeeX18: toBigNumber(preciseInteger) });
      params.withdrawal = {
        ...params.withdrawal,
        amount: toBigNumber(preciseInteger),
        appendix: 0n,
      };

      const mapped = mapMobileSubmitTipParamsToServer(params);
      expect(mapped.max_fee_x18).toBe(preciseInteger);
      expect(mapped.withdrawal.amount).toBe(preciseInteger);
      expect(mapped.withdrawal.appendix).toBe('0');
    });

    it.each([0, '0', 0n, toBigNumber(0)])(
      'accepts the zero confirmed fee boundary %s',
      (maxFeeX18) => {
        expect(
          mapMobileSubmitTipParamsToServer(createParams({ maxFeeX18 }))
            .max_fee_x18,
        ).toBe('0');
      },
    );

    it.each([-1, '1.5', 'NaN', Infinity, Number.MAX_SAFE_INTEGER + 1])(
      'rejects the invalid confirmed cap %s',
      (maxFeeX18) => {
        expect(() =>
          mapMobileSubmitTipParamsToServer(createParams({ maxFeeX18 })),
        ).toThrow(RangeError);
      },
    );

    describe.each(['amount', 'appendix'] as const)('withdrawal.%s', (field) => {
      it.each([
        '-1',
        '1.5',
        '01',
        '1e6',
        Number.MAX_SAFE_INTEGER + 1,
        Number.NaN,
        Infinity,
      ])('rejects the noncanonical or unsafe integer %s', (value) => {
        const params = createParams();
        params.withdrawal = { ...params.withdrawal, [field]: value };
        expect(() => mapMobileSubmitTipParamsToServer(params)).toThrow(
          RangeError,
        );
      });
    });

    it.each([0, -1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
      'rejects an invalid chain ID %s',
      (chainId) => {
        expect(() =>
          mapMobileSubmitTipParamsToServer(createParams({ chainId })),
        ).toThrow(RangeError);
      },
    );

    it.each([
      { subaccountOwner: '0x1234' as const, subaccountName: 'trading' },
      { ...subaccount, subaccountName: 'a'.repeat(13) },
    ])(
      'rejects a recipient identity that cannot encode to bytes32 (%#)',
      (recipientSubaccount) => {
        expect(() =>
          mapMobileSubmitTipParamsToServer(
            createParams({ recipientSubaccount }),
          ),
        ).toThrow(Error);
      },
    );

    it('retains the owner-signed withdrawal and fee cap when only the outer nonce changes for recovery', () => {
      const params = createParams({
        originPostId: '11111111-1111-4111-8111-111111111111',
        note: ' Thank you! 🥳 ',
      });
      const original = { ...params, withdrawal: { ...params.withdrawal } };
      Object.freeze(params.withdrawal);
      Object.freeze(params);

      const initial = mapMobileSubmitTipParamsToServer(params);
      const replay = mapMobileSubmitTipParamsToServer({
        ...params,
        nonce: 1795000000000000002n,
      });
      expect(replay).toEqual(initial);
      expect(replay.withdrawal).toEqual(original.withdrawal);
      expect(replay.withdrawal).not.toBe(params.withdrawal);
      expect(replay.withdrawal_signature).toBe(original.withdrawalSignature);
      expect(replay).not.toHaveProperty('expected_version');
      expect(params).toEqual(original);
    });

    it('changes only the explicitly reconfirmed cap and expected version while retaining the original inner nonce', () => {
      const params = createParams();
      const original = { ...params, withdrawal: { ...params.withdrawal } };
      const initial = mapMobileSubmitTipParamsToServer(params);
      const reconfirmed = mapMobileSubmitTipParamsToServer({
        ...params,
        nonce: 1795000000000000002n,
        maxFeeX18: '30000000000000000',
        expectedVersion: '9007199254740993',
      });

      expect(initial).not.toHaveProperty('expected_version');
      expect(reconfirmed).toEqual({
        ...initial,
        max_fee_x18: '30000000000000000',
        expected_version: '9007199254740993',
      });
      expect(reconfirmed.withdrawal.nonce).toBe(original.withdrawal.nonce);
      expect(reconfirmed.withdrawal_signature).toBe(
        original.withdrawalSignature,
      );
      expect(params).toEqual(original);
    });
  });
});
