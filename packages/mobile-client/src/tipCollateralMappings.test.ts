import { describe, expect, it } from '@jest/globals';
import { mapMobileTipCollateralMappingsParamsToServer } from './dataMappers';
import { GetMobileTipCollateralMappingsParams } from './types';

const subaccount = {
  subaccountOwner: '0x1111111111111111111111111111111111111111',
  subaccountName: 'default',
} as const;

function createParams(
  overrides: Partial<GetMobileTipCollateralMappingsParams> = {},
): GetMobileTipCollateralMappingsParams {
  return {
    ...subaccount,
    chainId: 31337,
    verifyingAddr: '0x0123456789012345678901234567890123456789',
    nonce: 1795000000000000001n,
    subaccount: { ...subaccount, subaccountName: 'trading' },
    productId: 0,
    direction: 'deposit',
    submissionIndices: ['9007199254740993', '18446744073709551615'],
    ...overrides,
  };
}

describe('tipCollateralMappings', () => {
  describe('mapMobileTipCollateralMappingsParamsToServer', () => {
    it('deduplicates exact u64 indices without rounding, sorting, or mutating caller-owned values', () => {
      const params = createParams({
        submissionIndices: [
          '18446744073709551615',
          '9007199254740993',
          '18446744073709551615',
          '0',
          '9007199254740993',
        ],
      });
      const original = [...params.submissionIndices];
      Object.freeze(params.submissionIndices);
      const mapped = mapMobileTipCollateralMappingsParamsToServer(params);
      const deduplicated = ['18446744073709551615', '9007199254740993', '0'];

      expect(mapped).toHaveProperty('submission_indices', deduplicated);
      expect(mapped).toEqual(
        mapMobileTipCollateralMappingsParamsToServer(
          createParams({ submissionIndices: deduplicated }),
        ),
      );
      expect(params.submissionIndices).toEqual(original);
    });

    it('accepts the one-unique-index boundary after deduplication', () => {
      const mapped = mapMobileTipCollateralMappingsParamsToServer(
        createParams({ submissionIndices: ['0', '0'] }),
      );
      expect(mapped).toHaveProperty('submission_indices', ['0']);
    });

    it('accepts one hundred unique indices even when duplicate inputs exceed the batch limit', () => {
      const uniqueIndices = Array.from({ length: 100 }, (_, index) =>
        index.toString(),
      );
      const params = createParams({
        submissionIndices: [...uniqueIndices, ...uniqueIndices],
      });
      const original = [...params.submissionIndices];
      const mapped = mapMobileTipCollateralMappingsParamsToServer(params);

      expect(mapped).toHaveProperty('submission_indices', uniqueIndices);
      expect(params.submissionIndices).toEqual(original);
    });

    it.each(
      [
        [],
        ['01'],
        ['01', '01'],
        ['-1'],
        ['1.5'],
        ['18446744073709551616'],
        [' 1'],
        ['1e2'],
        Array.from({ length: 101 }, (_, index) => index.toString()),
      ].map((submissionIndices) => ({ submissionIndices })),
    )(
      'rejects an empty, noncanonical, overflowing, or oversized index batch (%#)',
      ({ submissionIndices }) => {
        expect(() =>
          mapMobileTipCollateralMappingsParamsToServer(
            createParams({ submissionIndices }),
          ),
        ).toThrow(RangeError);
      },
    );

    it.each([-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
      'rejects an invalid product ID %s',
      (productId) => {
        expect(() =>
          mapMobileTipCollateralMappingsParamsToServer(
            createParams({ productId }),
          ),
        ).toThrow(RangeError);
      },
    );

    it.each([
      { subaccountOwner: '0x1234' as const, subaccountName: 'trading' },
      { ...subaccount, subaccountName: 'a'.repeat(13) },
    ])(
      'rejects a target identity that cannot encode to bytes32 (%#)',
      (target) => {
        expect(() =>
          mapMobileTipCollateralMappingsParamsToServer(
            createParams({ subaccount: target }),
          ),
        ).toThrow(Error);
      },
    );
  });
});
