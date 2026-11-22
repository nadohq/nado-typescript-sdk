import { describe, expect, it } from '@jest/globals';
import {
  subaccountToHex,
  toBigNumber,
  WalletNotProvidedError,
} from '@nadohq/shared';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { MobileClient } from './MobileClient';
import {
  MOBILE_ERROR_CODES,
  MOBILE_TIP_STATUSES,
  MobileServerFailureError,
  MobileServerSubmitTipResponse,
  MobileSubmitTipParams,
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
const tipId = '33333333-3333-4333-8333-333333333333';

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

function createResponse(
  overrides: Partial<MobileServerSubmitTipResponse> = {},
): MobileServerSubmitTipResponse {
  return {
    tip_id: tipId,
    tip_status: 'failed',
    version: '9007199254740993',
    submitted_at_ms: 1794992400000,
    processing_reason: 'FEE_TOO_LOW',
    gateway: {
      status: 'rejected',
      error_code: 2135,
      error_name: 'FEE_TOO_LOW',
    },
    ...overrides,
  };
}

function mockClient(
  data: unknown = { status: 'success', ...createResponse() },
  httpStatus = 200,
) {
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
      status: httpStatus,
      statusText: 'mock',
      headers: {},
      config,
    });
  };
  return { client, requests };
}

describe('MobileClient', () => {
  describe('submitTip', () => {
    it('signs a Mobile execute while preserving the owner-signed Engine withdrawal', async () => {
      const { client, requests } = mockClient();
      const params = createParams({ maxFeeX18: toBigNumber(0) });
      const originalWithdrawal = { ...params.withdrawal };

      const result = await client.submitTip(params);

      expect(requests).toHaveLength(1);
      expect(requests[0]).toEqual({
        url: 'https://mobile.example/v1/mobile/execute',
        body: {
          type: 'submit_tip',
          chain_id: '31337',
          recipient_subaccount: subaccountToHex(params.recipientSubaccount),
          origin_post_id: null,
          note: null,
          background_id: 'celebration',
          visibility: 'private',
          withdrawal: originalWithdrawal,
          withdrawal_signature: params.withdrawalSignature,
          max_fee_x18: '0',
          sender: subaccountToHex(subaccount),
          nonce: params.nonce?.toString(),
          signature: expect.stringMatching(/^0x[0-9a-f]{130}$/),
        },
      });
      expect(params.withdrawal).toEqual(originalWithdrawal);
      expect(result).toEqual({
        tipId,
        tipStatus: 'failed',
        version: '9007199254740993',
        submittedAtMs: 1794992400000,
        processingReason: 'FEE_TOO_LOW',
        gateway: {
          status: 'rejected',
          errorCode: 2135,
          errorName: 'FEE_TOO_LOW',
        },
      });
    });

    it('accepts the Engine builder transaction types without changing integer precision', async () => {
      const { client, requests } = mockClient();
      const params = createParams();
      params.withdrawal = {
        ...params.withdrawal,
        amount: toBigNumber('9007199254740993'),
        appendix: toBigNumber(0),
      };
      await client.submitTip(params);
      expect(requests[0]?.body.withdrawal).toEqual({
        ...params.withdrawal,
        amount: '9007199254740993',
        appendix: '0',
      });
    });

    it('changes only the confirmed cap and outer authorization after an explicit fee reconfirmation', async () => {
      const { client, requests } = mockClient();
      const params = createParams({
        originPostId: '11111111-1111-4111-8111-111111111111',
        note: ' Thank you! 🥳 ',
      });
      const original = { ...params, withdrawal: { ...params.withdrawal } };
      const rejected = await client.submitTip(params);
      expect(requests).toHaveLength(1);
      expect(rejected.tipStatus).toBe('failed');
      expect(rejected.processingReason).toBe('FEE_TOO_LOW');

      await client.submitTip({
        ...params,
        nonce: 1795000000000000002n,
        maxFeeX18: '30000000000000000',
        expectedVersion: rejected.version,
      });
      expect(requests).toHaveLength(2);
      expect(requests[0]?.body).not.toHaveProperty('expected_version');
      expect(requests[1]?.body).toMatchObject({
        ...requests[0]?.body,
        origin_post_id: params.originPostId,
        note: params.note,
        max_fee_x18: '30000000000000000',
        expected_version: rejected.version,
        nonce: '1795000000000000002',
        signature: expect.stringMatching(/^0x[0-9a-f]{130}$/),
        withdrawal: params.withdrawal,
        withdrawal_signature: params.withdrawalSignature,
      });
      expect(requests[1]?.body.signature).not.toBe(requests[0]?.body.signature);
      expect(params).toEqual(original);
    });

    it('keeps the inner nonce, signature, and cap when renewing only outer authentication', async () => {
      const { client, requests } = mockClient({
        status: 'success',
        ...createResponse({
          tip_status: 'reconciling',
          processing_reason: 'NONCE_OUTCOME_UNVERIFIED',
          gateway: { status: 'unknown', error_code: null, error_name: null },
        }),
      });
      const params = createParams();
      await client.submitTip(params);
      expect(requests).toHaveLength(1);
      await client.submitTip({ ...params, nonce: 1795000000000000002n });
      expect(requests).toHaveLength(2);
      for (const { body } of requests) {
        expect(body).toMatchObject({
          withdrawal: params.withdrawal,
          withdrawal_signature: params.withdrawalSignature,
          max_fee_x18: params.maxFeeX18,
        });
        expect(body).not.toHaveProperty('expected_version');
      }
      expect(requests[0]?.body.nonce).not.toEqual(requests[1]?.body.nonce);
    });

    it.each(MOBILE_TIP_STATUSES)(
      'returns the %s business state without retrying or throwing',
      async (tipStatus) => {
        const { client, requests } = mockClient({
          status: 'success',
          ...createResponse({
            tip_status: tipStatus,
            processing_reason: null,
            gateway: {
              status: 'not_submitted',
              error_code: null,
              error_name: null,
            },
          }),
        });
        await expect(client.submitTip(createParams())).resolves.toMatchObject({
          tipStatus,
          processingReason: null,
          gateway: {
            status: 'not_submitted',
            errorCode: null,
            errorName: null,
          },
        });
        expect(requests).toHaveLength(1);
      },
    );

    it.each([
      {
        tip_status: 'failed',
        processing_reason: 'NONCE_SPENT_AFTER_FEE_REJECTION',
        gateway: {
          status: 'rejected',
          error_code: 2135,
          error_name: 'FEE_TOO_LOW',
        },
      },
      {
        tip_status: 'review_required',
        processing_reason: 'FEE_REJECTION_AFTER_UNKNOWN',
        gateway: {
          status: 'rejected',
          error_code: 2135,
          error_name: 'FEE_TOO_LOW',
        },
      },
      {
        tip_status: 'review_required',
        processing_reason: 'RECIPIENT_DEPOSIT_ADDRESS_CHANGED',
        gateway: {
          status: 'unknown',
          error_code: null,
          error_name: null,
        },
      },
      {
        tip_status: 'reconciling',
        processing_reason: 'ADDRESS_SCREENING_PENDING',
        gateway: {
          status: 'unknown',
          error_code: null,
          error_name: null,
        },
      },
    ] satisfies Partial<MobileServerSubmitTipResponse>[])(
      'preserves $processing_reason without interpreting a historical rejection as a retry',
      async (response) => {
        const { client, requests } = mockClient({
          status: 'success',
          ...createResponse(response),
        });
        await expect(client.submitTip(createParams())).resolves.toMatchObject({
          tipStatus: response.tip_status,
          processingReason: response.processing_reason,
          gateway: {
            status: response.gateway.status,
            errorCode: response.gateway.error_code,
            errorName: response.gateway.error_name,
          },
        });
        expect(requests).toHaveLength(1);
        expect(requests[0]?.body).not.toHaveProperty('expected_version');
      },
    );

    it.each([
      [400, MOBILE_ERROR_CODES.INVALID_TIP_REQUEST],
      [409, MOBILE_ERROR_CODES.TIP_SUBMISSION_CONFLICT],
      [400, MOBILE_ERROR_CODES.INSUFFICIENT_TIP_BALANCE],
    ])(
      'preserves pre-admission failures (%i/%i)',
      async (httpStatus, errorCode) => {
        const failure = {
          status: 'failure',
          error: 'Tip admission rejected',
          error_code: errorCode,
          request_type: 'execute_submit_tip',
        };
        const { client, requests } = mockClient(failure, httpStatus);
        const result = client.submitTip(createParams());
        await expect(result).rejects.toBeInstanceOf(MobileServerFailureError);
        await expect(result).rejects.toMatchObject({
          errorCode,
          httpStatus,
          requestType: 'execute_submit_tip',
          responseData: failure,
        });
        expect(requests).toHaveLength(1);
      },
    );

    it('surfaces unavailable reconfirmation evidence without retrying or changing the saved inputs', async () => {
      const failure = {
        status: 'failure',
        error: 'Withdrawal evidence is not indexed yet',
        error_code: MOBILE_ERROR_CODES.SERVICE_UNAVAILABLE,
        request_type: 'execute_submit_tip',
      };
      const { client, requests } = mockClient(failure, 503);
      const params = createParams({
        maxFeeX18: '30000000000000000',
        expectedVersion: '9007199254740993',
      });
      const original = { ...params, withdrawal: { ...params.withdrawal } };

      await expect(client.submitTip(params)).rejects.toMatchObject({
        errorCode: MOBILE_ERROR_CODES.SERVICE_UNAVAILABLE,
        httpStatus: 503,
        requestType: 'execute_submit_tip',
        responseData: failure,
      });
      expect(requests).toHaveLength(1);
      expect(params).toEqual(original);
    });

    it.each([-1, '1.5', 'NaN', Infinity, 9_007_199_254_740_992])(
      'rejects the invalid confirmed cap %s before sending',
      async (maxFeeX18) => {
        const { client, requests } = mockClient();
        await expect(
          client.submitTip(createParams({ maxFeeX18 })),
        ).rejects.toBeInstanceOf(RangeError);
        expect(requests).toHaveLength(0);
      },
    );

    it.each(['-1', '1.5', '01', '1e6'])(
      'rejects a noncanonical owner-signed amount %s before sending',
      async (amount) => {
        const { client, requests } = mockClient();
        const params = createParams();
        params.withdrawal = { ...params.withdrawal, amount };
        await expect(client.submitTip(params)).rejects.toBeInstanceOf(
          RangeError,
        );
        expect(requests).toHaveLength(0);
      },
    );

    it.each(['amount', 'appendix'] as const)(
      'rejects an unsafe numeric withdrawal %s before signing',
      async (field) => {
        const { client, requests } = mockClient();
        const params = createParams();
        params.withdrawal = {
          ...params.withdrawal,
          [field]: 9_007_199_254_740_992,
        };
        await expect(client.submitTip(params)).rejects.toBeInstanceOf(
          RangeError,
        );
        expect(requests).toHaveLength(0);
      },
    );

    it.each([0, -1, 9_007_199_254_740_992])(
      'rejects the invalid chain ID %s before signing',
      async (chainId) => {
        const { client, requests } = mockClient();
        await expect(
          client.submitTip(createParams({ chainId })),
        ).rejects.toBeInstanceOf(RangeError);
        expect(requests).toHaveLength(0);
      },
    );

    it('requires a wallet for outer Mobile authentication', async () => {
      const client = new MobileClient({
        url: 'https://mobile.example/v1/mobile',
      });
      await expect(client.submitTip(createParams())).rejects.toBeInstanceOf(
        WalletNotProvidedError,
      );
    });
  });
});
