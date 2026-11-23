import { describe, expect, it } from '@jest/globals';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
  getValidatedHex,
  subaccountToHex,
  WalletNotProvidedError,
} from '@nadohq/shared';
import { createWalletClient, http, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { MobileClient } from './MobileClient';
import { getMobilePayloadHash, MobileSignedInnerByType } from './signing';
import {
  GetMobileTipCollateralMappingsParams,
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileServerTipCollateralMapping,
} from './types';

const owner = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907',
);
const walletClient = createWalletClient({
  account: owner,
  chain: foundry,
  transport: http(),
});
const subaccount = {
  subaccountOwner: owner.address,
  subaccountName: 'default',
};

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

function createMapping(
  overrides: Partial<MobileServerTipCollateralMapping> = {},
): MobileServerTipCollateralMapping {
  return {
    subaccount: subaccountToHex(createParams().subaccount),
    product_id: 0,
    direction: 'deposit',
    submission_idx: '9007199254740993',
    mapping_state: 'pending',
    classification: 'pending',
    deposit_total_x18: '900719925474099312345678901234567890',
    tip_total_x18: null,
    ordinary_amount_x18: null,
    ...overrides,
  };
}

function mockClient(data: unknown, status = 200) {
  const client = new MobileClient({
    url: 'https://mobile.example/v1/mobile',
    walletClient,
  });
  const requests: Array<{
    url: string | undefined;
    body: Record<string, unknown>;
  }> = [];
  client.axiosInstance.defaults.adapter = (config) => {
    requests.push({
      url: config.url,
      body: JSON.parse(String(config.data)) as Record<string, unknown>,
    });
    return Promise.resolve({
      data,
      status,
      statusText: 'mock',
      headers: {},
      config,
    });
  };
  return { client, requests };
}

describe('MobileClient', () => {
  describe('getTipCollateralMappings', () => {
    it('signs a flat query with exact indices, a distinct target, and no list pagination', async () => {
      const { client, requests } = mockClient({
        status: 'success',
        mappings: [],
      });
      const params = createParams();
      const original = [...params.submissionIndices];
      await client.getTipCollateralMappings(params);

      expect(requests).toHaveLength(1);
      expect(requests[0]).toEqual({
        url: 'https://mobile.example/v1/mobile/query',
        body: {
          type: 'tips_history',
          mode: 'collateral_mapping',
          subaccount: subaccountToHex(params.subaccount),
          product_id: 0,
          direction: 'deposit',
          submission_indices: original,
          sender: subaccountToHex(params),
          nonce: params.nonce?.toString(),
          signature: expect.stringMatching(/^0x[0-9a-f]{130}$/),
        },
      });
      expect(params.submissionIndices).toEqual(original);
    });

    it('deduplicates exact indices before signing without changing their first-occurrence order or input', async () => {
      const { client, requests } = mockClient({
        status: 'success',
        mappings: [],
      });
      const submissionIndices = [
        '18446744073709551615',
        '9007199254740993',
        '18446744073709551615',
        '0',
        '9007199254740993',
      ];
      const original = [...submissionIndices];
      await client.getTipCollateralMappings(
        createParams({ submissionIndices }),
      );
      await client.getTipCollateralMappings(
        createParams({
          submissionIndices: ['18446744073709551615', '9007199254740993', '0'],
        }),
      );

      expect(requests).toHaveLength(2);
      expect(requests[0]?.body.submission_indices).toEqual([
        '18446744073709551615',
        '9007199254740993',
        '0',
      ]);
      expect(requests[0]).toEqual(requests[1]);
      expect(submissionIndices).toEqual(original);
    });

    it('applies the batch limit to unique indices after deduplication', async () => {
      const { client, requests } = mockClient({
        status: 'success',
        mappings: [],
      });
      const uniqueIndices = Array.from({ length: 100 }, (_, index) =>
        index.toString(),
      );
      await client.getTipCollateralMappings(
        createParams({
          submissionIndices: [...uniqueIndices, ...uniqueIndices],
        }),
      );

      expect(requests).toHaveLength(1);
      expect(requests[0]?.body.submission_indices).toEqual(uniqueIndices);
    });

    it('uses the linked signer while retaining the owner sender and distinct target subaccount', async () => {
      const linked = privateKeyToAccount(
        '0x0123456789012345678901234567890123456789012345678901234567890123',
      );
      const { client, requests } = mockClient({
        status: 'success',
        mappings: [],
      });
      client.setLinkedSigner(
        createWalletClient({
          account: linked,
          chain: foundry,
          transport: http(),
        }),
      );
      const params = createParams();
      await client.getTipCollateralMappings(params);

      expect(requests).toHaveLength(1);
      const body = requests[0]?.body;
      if (
        !body ||
        typeof body.sender !== 'string' ||
        typeof body.nonce !== 'string' ||
        typeof body.signature !== 'string'
      ) {
        throw new Error('Expected a signed collateral mapping query.');
      }
      const expectedInner: MobileSignedInnerByType<'tips_history'> = {
        type: 'tips_history',
        mode: 'collateral_mapping',
        subaccount: subaccountToHex(params.subaccount),
        product_id: params.productId,
        direction: params.direction,
        submission_indices: params.submissionIndices,
      };
      expect(body).toMatchObject({
        ...expectedInner,
        sender: subaccountToHex(params),
        nonce: params.nonce?.toString(),
      });
      expect(body.sender).not.toBe(expectedInner.subaccount);
      const recovered = await recoverTypedDataAddress({
        domain: getNadoEIP712Domain(params.verifyingAddr, params.chainId),
        types: getNadoEIP712Types('nado_authentication'),
        primaryType: getNadoEIP712PrimaryType('nado_authentication'),
        message: {
          method: 'mobile:query_tips_history',
          sender: getValidatedHex(body.sender),
          payloadHash: getMobilePayloadHash(expectedInner),
          nonce: BigInt(body.nonce),
        },
        signature: getValidatedHex(body.signature),
      });
      expect(recovered.toLowerCase()).toBe(linked.address.toLowerCase());
      expect(recovered.toLowerCase()).not.toBe(owner.address.toLowerCase());
    });

    it('preserves partial results, exact amounts, known zeros, and request order without retries', async () => {
      const first = createMapping();
      const second = createMapping({
        submission_idx: '18446744073709551615',
        mapping_state: 'complete',
        classification: 'ordinary',
        deposit_total_x18: '123',
        tip_total_x18: '0',
        ordinary_amount_x18: '123',
      });
      const { client, requests } = mockClient({
        status: 'success',
        mappings: [first, second],
      });
      const { mappings } =
        await client.getTipCollateralMappings(createParams());

      expect(mappings.map((mapping) => mapping.submissionIdx)).toEqual(
        createParams().submissionIndices,
      );
      expect(mappings[0]?.depositTotalX18?.toFixed()).toBe(
        first.deposit_total_x18,
      );
      expect(mappings[0]?.tipTotalX18).toBeNull();
      expect(mappings[0]?.ordinaryAmountX18).toBeNull();
      expect(mappings[1]?.tipTotalX18?.toFixed()).toBe('0');
      expect(mappings[1]?.ordinaryAmountX18?.toFixed()).toBe('123');
      expect(requests).toHaveLength(1);
    });

    it('retains review-required principal and withdrawal nulls', async () => {
      const { client } = mockClient({
        status: 'success',
        mappings: [
          createMapping({
            mapping_state: 'review_required',
            deposit_total_x18: '42',
          }),
          createMapping({
            direction: 'withdrawal',
            mapping_state: 'complete',
            classification: 'tip_only',
            deposit_total_x18: null,
            tip_total_x18: '5000000000000000000',
            ordinary_amount_x18: null,
          }),
        ],
      });
      const { mappings } =
        await client.getTipCollateralMappings(createParams());
      expect(mappings[0]?.mappingState).toBe('review_required');
      expect(mappings[0]?.depositTotalX18?.toFixed()).toBe('42');
      expect(mappings[1]?.depositTotalX18).toBeNull();
      expect(mappings[1]?.ordinaryAmountX18).toBeNull();
    });

    it.each([
      [],
      ['01'],
      ['01', '01'],
      ['-1'],
      ['1.5'],
      ['18446744073709551616'],
      [' 1'],
      ['1e2'],
      Array.from({ length: 101 }, (_, index) => index.toString()),
    ])(
      'rejects invalid submission indices before transport (%#)',
      async (...submissionIndices) => {
        const { client, requests } = mockClient({
          status: 'success',
          mappings: [],
        });
        await expect(
          client.getTipCollateralMappings(createParams({ submissionIndices })),
        ).rejects.toThrow(RangeError);
        expect(requests).toHaveLength(0);
      },
    );

    it.each([-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
      'rejects invalid productId %s',
      async (productId) => {
        const { client, requests } = mockClient({
          status: 'success',
          mappings: [],
        });
        await expect(
          client.getTipCollateralMappings(createParams({ productId })),
        ).rejects.toThrow(RangeError);
        expect(requests).toHaveLength(0);
      },
    );

    it('throws typed authorization failures without retrying', async () => {
      const { client, requests } = mockClient(
        {
          status: 'failure',
          error: 'Not authorized',
          error_code: MOBILE_ERROR_CODES.INVALID_SIGNER,
          request_type: 'query_tips_history',
        },
        401,
      );
      await expect(
        client.getTipCollateralMappings(createParams()),
      ).rejects.toMatchObject({
        errorCode: MOBILE_ERROR_CODES.INVALID_SIGNER,
        requestType: 'query_tips_history',
        httpStatus: 401,
      } satisfies Partial<MobileServerFailureError>);
      expect(requests).toHaveLength(1);
    });

    it('requires an owner or linked signer', async () => {
      const client = new MobileClient({
        url: 'https://mobile.example/v1/mobile',
      });
      await expect(
        client.getTipCollateralMappings(createParams()),
      ).rejects.toThrow(WalletNotProvidedError);
    });
  });
});
