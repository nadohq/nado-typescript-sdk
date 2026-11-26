import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileSubmitTipParams,
  MobileSubmitTipResult,
} from '@nadohq/mobile-client';
import { CHAIN_ENV_TO_CHAIN, subaccountToHex } from '@nadohq/shared';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createNadoClient } from '../../createNadoClient';
import { SendTipError } from './SendTipError';
import { SendTipParams } from './types';

const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);
const chain = CHAIN_ENV_TO_CHAIN.inkMainnet;
const recipientDda = '0x3333333333333333333333333333333333333333';

function createFixture() {
  const client = createNadoClient(
    { chainEnv: 'inkMainnet' },
    {
      walletClient: createWalletClient({ account, chain, transport: http() }),
      publicClient: createPublicClient({
        transport: http(chain.rpcUrls.default.http[0]),
      }),
    },
  );
  const params: SendTipParams = {
    subaccountName: 'default',
    recipientSubaccount: {
      subaccountOwner: '0x2222222222222222222222222222222222222222',
      subaccountName: 'default',
    },
    amount: '5000000',
    backgroundId: 'tip-plain',
    visibility: 'private',
    maxFeeX18: '0',
  };
  const payload: Awaited<
    ReturnType<
      typeof client.context.engineClient.payloadBuilder.buildWithdrawCollateralV2Payload
    >
  > = {
    tx: {
      sender: subaccountToHex({
        subaccountOwner: account.address,
        subaccountName: 'default',
      }),
      productId: 0,
      amount: '5000000',
      nonce: '12',
      sendTo: recipientDda,
      appendix: '0',
    },
    signature: `0x${'22'.repeat(65)}`,
    spot_leverage: false,
    max_fee_x18: '0',
  };
  const receipt: MobileSubmitTipResult = {
    tipId: '00000000-0000-4000-8000-000000000001',
    tipStatus: 'sending',
    version: '1',
    submittedAtMs: 1,
    gateway: { status: 'accepted', errorCode: null, errorName: null },
    processingReason: null,
  };
  const dda = jest
    .spyOn(client.context.indexerClient, 'getSubaccountDDA')
    .mockResolvedValue({ address: recipientDda });
  const build = jest
    .spyOn(
      client.context.engineClient.payloadBuilder,
      'buildWithdrawCollateralV2Payload',
    )
    .mockResolvedValue(payload);
  const submit = jest
    .spyOn(client.context.mobileClient, 'submitTip')
    .mockResolvedValue(receipt);
  return { client, params, payload, receipt, dda, build, submit };
}

function preAdmissionError(errorCode: number) {
  return new MobileServerFailureError(
    {
      status: 'failure',
      error: 'Rejected before admission',
      error_code: errorCode,
      request_type: 'execute_submit_tip',
    },
    400,
  );
}

describe('SpotExecuteAPI.sendTip', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('composes native-unit owner signing and Mobile submission while preserving a zero fee cap', async () => {
    const { client, params, payload, receipt, build, submit } = createFixture();
    await expect(client.spot.sendTip(params)).resolves.toBe(receipt);
    expect(build.mock.calls[0]?.[0]).toMatchObject({
      subaccountOwner: account.address,
      subaccountName: 'default',
      productId: 0,
      sendTo: recipientDda,
      appendix: 0,
      spotLeverage: false,
      maxFeeX18: '0',
    });
    expect(submit.mock.calls[0]?.[0].withdrawal).toBe(payload.tx);
    expect(submit.mock.calls[0]?.[0].withdrawalSignature).toBe(
      payload.signature,
    );
  });

  it('retains the signed request on an uncertain result and replays it without another DDA lookup or owner signature', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const cause = new Error('Response lost');
    submit.mockRejectedValueOnce(cause);
    let retryRequest: MobileSubmitTipParams | undefined;
    try {
      await client.spot.sendTip(params);
    } catch (error) {
      expect(error).toBeInstanceOf(SendTipError);
      if (!(error instanceof SendTipError)) throw error;
      expect(error.cause).toBe(cause);
      expect(Object.keys(error)).not.toContain('retryRequest');
      expect(Object.keys(error)).not.toContain('cause');
      retryRequest = error.retryRequest;
    }
    expect(retryRequest).toBeDefined();
    if (!retryRequest) throw new Error('Expected replay request');
    const originalWithdrawal = retryRequest.withdrawal;
    await client.spot.sendTip({ ...retryRequest, nonce: 1n });
    expect(dda).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[1]?.[0].withdrawal).toBe(originalWithdrawal);
    expect(submit.mock.calls[1]?.[0].withdrawalSignature).toBe(
      retryRequest.withdrawalSignature,
    );
    expect(submit.mock.calls[1]?.[0].nonce).toBeUndefined();
  });

  it.each([
    MOBILE_ERROR_CODES.INVALID_TIP_REQUEST,
    MOBILE_ERROR_CODES.INSUFFICIENT_TIP_BALANCE,
    MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE,
  ])(
    'keeps a new Tip pre-admission failure %s available for normal input correction',
    async (code) => {
      const { client, params, submit } = createFixture();
      const error = preAdmissionError(code);
      submit.mockRejectedValue(error);
      await expect(client.spot.sendTip(params)).rejects.toBe(error);
    },
  );

  it('retains replay authorization even if the replay receives a pre-admission error', async () => {
    const { client, params, submit } = createFixture();
    await client.spot.sendTip(params);
    const request = submit.mock.calls[0]?.[0];
    if (!request) throw new Error('Expected signed request');
    const cause = preAdmissionError(MOBILE_ERROR_CODES.INVALID_TIP_REQUEST);
    submit.mockRejectedValue(cause);
    await expect(client.spot.sendTip(request)).rejects.toMatchObject({
      cause,
      retryRequest: request,
    });
  });

  it('does not turn a rejected owner-signing prompt into a pending submission', async () => {
    const { client, params, build, submit } = createFixture();
    const rejection = { code: 4001 };
    build.mockRejectedValue(rejection);
    await expect(client.spot.sendTip(params)).rejects.toBe(rejection);
    expect(submit).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '0.5', 'NaN', 'Infinity'])(
    'rejects invalid native amount %s before resolving a DDA or signing',
    async (amount) => {
      const { client, params, dda, build } = createFixture();
      await expect(client.spot.sendTip({ ...params, amount })).rejects.toThrow(
        'positive integer',
      );
      expect(dda).not.toHaveBeenCalled();
      expect(build).not.toHaveBeenCalled();
    },
  );

  it('rejects a different owner before lookup or signing', async () => {
    const { client, params, dda, build } = createFixture();
    await expect(
      client.spot.sendTip({
        ...params,
        subaccountOwner: params.recipientSubaccount.subaccountOwner,
      }),
    ).rejects.toThrow('owner wallet');
    expect(dda).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
  });

  it('rejects replay on a different chain or endpoint without submitting', async () => {
    const { client, params, submit } = createFixture();
    await client.spot.sendTip(params);
    const request = submit.mock.calls[0]?.[0];
    if (!request) throw new Error('Expected signed request');
    submit.mockClear();
    await expect(
      client.spot.sendTip({ ...request, chainId: 1 }),
    ).rejects.toThrow('original Tip chain');
    await expect(
      client.spot.sendTip({ ...request, verifyingAddr: recipientDda }),
    ).rejects.toThrow('original Tip chain');
    expect(submit).not.toHaveBeenCalled();
  });
});
