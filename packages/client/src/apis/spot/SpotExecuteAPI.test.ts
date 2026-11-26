import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GetIndexerSubaccountDDAResponse } from '@nadohq/indexer-client';
import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileSubmitTipParams,
  MobileSubmitTipResult,
} from '@nadohq/mobile-client';
import {
  CHAIN_ENV_TO_CHAIN,
  subaccountToHex,
  WalletNotProvidedError,
} from '@nadohq/shared';
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createNadoClient } from '../../createNadoClient';
import { SendTipError } from './SendTipError';
import {
  SEND_TIP_VALIDATION_REASONS,
  SendTipValidationError,
  SendTipValidationReason,
} from './SendTipValidationError';
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

async function expectValidationFailure(
  operation: () => Promise<unknown>,
  reason: SendTipValidationReason,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(SendTipValidationError);
    if (!(error instanceof SendTipValidationError)) throw error;
    expect(error.reason).toBe(reason);
    return;
  }
  throw new Error('Expected SendTipValidationError.');
}

describe('SpotExecuteAPI.sendTip', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('composes native-unit owner signing and Mobile submission while preserving a zero fee cap', async () => {
    const { client, params, payload, receipt, build, submit } = createFixture();
    Object.freeze(receipt);
    const result = await client.spot.sendTip(params);
    expect(result).toEqual(receipt);
    expect(result).not.toBe(receipt);
    expect(result.retryRequest).toBe(submit.mock.calls[0]?.[0]);
    expect(
      Object.getOwnPropertyDescriptor(result, 'retryRequest'),
    ).toMatchObject({
      enumerable: false,
      writable: false,
    });
    expect(Object.keys(result)).toEqual(Object.keys(receipt));
    expect(JSON.stringify(result)).toBe(JSON.stringify(receipt));
    expect(Object.hasOwn(receipt, 'retryRequest')).toBe(false);
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

  it('retains a fee-rejected receipt for an explicitly confirmed cap replay without rebuilding authorization', async () => {
    const { client, params, payload, receipt, dda, build, submit } =
      createFixture();
    const failedReceipt: MobileSubmitTipResult = {
      ...receipt,
      tipStatus: 'failed',
      version: '9007199254740993',
      gateway: {
        status: 'rejected',
        errorCode: 2135,
        errorName: 'FEE_TOO_LOW',
      },
      processingReason: 'FEE_TOO_LOW',
    };
    const failedSnapshot = JSON.stringify(failedReceipt);
    Object.freeze(failedReceipt);
    submit.mockResolvedValueOnce(failedReceipt);
    const result = await client.spot.sendTip(params);
    expect(result).toEqual(failedReceipt);
    expect(Object.hasOwn(failedReceipt, 'retryRequest')).toBe(false);
    expect(JSON.stringify(result)).toBe(failedSnapshot);
    const savedRequest = result.retryRequest;
    const savedSnapshot = JSON.stringify(savedRequest);
    const confirmedCap = '20000000000000000';
    const replayParams = {
      ...savedRequest,
      maxFeeX18: confirmedCap,
      expectedVersion: result.version,
      nonce: 1n,
    };
    const replayResult = await client.spot.sendTip(replayParams);
    const replay = submit.mock.calls[1]?.[0];
    expect(dda).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(2);
    expect(replay).toEqual({
      ...savedRequest,
      maxFeeX18: confirmedCap,
      expectedVersion: result.version,
    });
    expect(replay?.withdrawal).toBe(payload.tx);
    expect(replay?.withdrawalSignature).toBe(payload.signature);
    expect(replay?.nonce).toBeUndefined();
    expect(replayParams.nonce).toBe(1n);
    expect(JSON.stringify(savedRequest)).toBe(savedSnapshot);
    expect(replayResult.retryRequest).toBe(replay);
    expect(replayResult).toEqual(receipt);
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

  it('preserves a failed DDA lookup without creating replay authorization or prompting the owner', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const failure = new Error('Indexer unavailable');
    dda.mockRejectedValue(failure);
    await expect(client.spot.sendTip(params)).rejects.toBe(failure);
    expect(build).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '0.5', 'NaN', 'Infinity'])(
    'rejects invalid native amount %s before resolving a DDA or signing',
    async (amount) => {
      const { client, params, dda, build, submit } = createFixture();
      await expectValidationFailure(
        () => client.spot.sendTip({ ...params, amount }),
        SEND_TIP_VALIDATION_REASONS.INVALID_AMOUNT,
      );
      expect(dda).not.toHaveBeenCalled();
      expect(build).not.toHaveBeenCalled();
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it('rejects a different owner before lookup or signing', async () => {
    const { client, params, dda, build, submit } = createFixture();
    await expectValidationFailure(
      () =>
        client.spot.sendTip({
          ...params,
          subaccountOwner: params.recipientSubaccount.subaccountOwner,
        }),
      SEND_TIP_VALIDATION_REASONS.OWNER_WALLET_REQUIRED,
    );
    expect(dda).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('requires the owner wallet before lookup or signing even when a linked signer is configured', async () => {
    const { client, params, dda, build, submit } = createFixture();
    client.context.linkedSignerWalletClient = client.context.walletClient;
    client.context.walletClient = undefined;
    await expect(
      client.spot.sendTip({ ...params, subaccountOwner: account.address }),
    ).rejects.toBeInstanceOf(WalletNotProvidedError);
    expect(dda).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    ['different chain', { chainId: 1 }],
    ['zero chain', { chainId: 0 }],
    ['different endpoint', { verifyingAddr: recipientDda }],
  ] as const)(
    'rejects fresh inputs with %s before lookup or signing',
    async (_name, overrides) => {
      const { client, params, dda, build, submit } = createFixture();
      await expectValidationFailure(
        () => client.spot.sendTip({ ...params, ...overrides }),
        SEND_TIP_VALIDATION_REASONS.SIGNING_CONTEXT_MISMATCH,
      );
      expect(dda).not.toHaveBeenCalled();
      expect(build).not.toHaveBeenCalled();
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it('accepts an explicitly matching owner, chain and case-insensitive endpoint', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const endpoint = client.context.contractAddresses.endpoint;
    const explicitEndpoint = `0x${endpoint.slice(2).toUpperCase()}`;
    await client.spot.sendTip({
      ...params,
      subaccountOwner: account.address.toLowerCase(),
      chainId: chain.id,
      verifyingAddr: explicitEndpoint,
    });
    expect(dda).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(build.mock.calls[0]?.[0]).toMatchObject({
      chainId: chain.id,
      verifyingAddr: explicitEndpoint,
    });
    expect(submit.mock.calls[0]?.[0].verifyingAddr.toLowerCase()).toBe(
      endpoint.toLowerCase(),
    );
  });

  it.each([
    ['missing', {} as GetIndexerSubaccountDDAResponse],
    ['zero', { address: zeroAddress }],
    ['short hex', { address: '0x' }],
    ['invalid', { address: 'not-an-address' as Address }],
  ] as const)(
    'rejects a %s DDA with a stable reason before signing',
    async (_name, response) => {
      const { client, params, dda, build, submit } = createFixture();
      dda.mockResolvedValue(response);
      await expectValidationFailure(
        () => client.spot.sendTip(params),
        SEND_TIP_VALIDATION_REASONS.RECIPIENT_DDA_UNAVAILABLE,
      );
      expect(build).not.toHaveBeenCalled();
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it('rejects replay on a different chain or endpoint without submitting', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const result = await client.spot.sendTip(params);
    const request = result.retryRequest;
    dda.mockClear();
    build.mockClear();
    submit.mockClear();
    await expectValidationFailure(
      () => client.spot.sendTip({ ...request, chainId: 1 }),
      SEND_TIP_VALIDATION_REASONS.SIGNING_CONTEXT_MISMATCH,
    );
    await expectValidationFailure(
      () => client.spot.sendTip({ ...request, verifyingAddr: recipientDda }),
      SEND_TIP_VALIDATION_REASONS.SIGNING_CONTEXT_MISMATCH,
    );
    expect(dda).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});
