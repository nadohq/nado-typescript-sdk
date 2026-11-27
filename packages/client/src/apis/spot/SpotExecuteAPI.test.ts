import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  INDEXER_ERROR_CODES,
  IndexerServerFailureError,
} from '@nadohq/indexer-client';
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
  createPublicClient,
  createWalletClient,
  http,
  zeroAddress,
} from 'viem';
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
      amount: params.amount,
      sendTo: recipientDda,
      appendix: 0,
      spotLeverage: false,
      maxFeeX18: '0',
      chainId: chain.id,
      verifyingAddr: client.context.contractAddresses.endpoint,
    });
    expect(submit.mock.calls[0]?.[0].withdrawal).toBe(payload.tx);
    expect(submit.mock.calls[0]?.[0].withdrawalSignature).toBe(
      payload.signature,
    );
  });

  it('signs the inner withdrawal with the owner wallet even when a linked signer is configured', async () => {
    const { client, params, payload, build, submit } = createFixture();
    build.mockRestore();
    jest
      .spyOn(
        client.context.engineClient.payloadBuilder.engineClient,
        'getTxNonce',
      )
      .mockResolvedValue(payload.tx.nonce);
    const ownerWallet = client.context.walletClient;
    if (!ownerWallet) throw new Error('Expected owner wallet fixture');
    const ownerSign = jest.spyOn(ownerWallet, 'signTypedData');
    const linkedWallet = createWalletClient({
      account: privateKeyToAccount(`0x${'22'.repeat(32)}`),
      chain,
      transport: http(),
    });
    const linkedSign = jest.spyOn(linkedWallet, 'signTypedData');
    client.setLinkedSigner(linkedWallet);

    await client.spot.sendTip(params);

    expect(ownerSign).toHaveBeenCalledTimes(1);
    expect(linkedSign).not.toHaveBeenCalled();
    expect(submit.mock.calls[0]?.[0].withdrawal).toEqual(payload.tx);
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

  it('preserves a DDA lookup failure without prompting the owner', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const failure = new Error('Indexer unavailable');
    dda.mockRejectedValue(failure);
    await expect(client.spot.sendTip(params)).rejects.toBe(failure);
    expect(build).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('preserves an Indexer server failure without creating replay authorization', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const failure = new IndexerServerFailureError(
      {
        status: 'failure',
        error: 'Indexer unavailable',
        error_code: INDEXER_ERROR_CODES.SERVICE_UNAVAILABLE,
        request_type: 'direct_deposit_address',
      },
      503,
    );
    dda.mockRejectedValue(failure);
    await expect(client.spot.sendTip(params)).rejects.toBe(failure);
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

  it('passes explicit sender and signing overrides through like withdrawV2', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const overrides = {
      subaccountOwner: params.recipientSubaccount.subaccountOwner,
      chainId: 1,
      verifyingAddr: recipientDda,
    };
    await client.spot.sendTip({
      ...params,
      ...overrides,
    });
    expect(dda).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(build.mock.calls[0]?.[0]).toMatchObject(overrides);
    expect(submit.mock.calls[0]?.[0]).toMatchObject(overrides);
  });

  it('rejects a zero recipient DDA before signing an owner-directed withdrawal', async () => {
    const { client, params, dda, build, submit } = createFixture();
    dda.mockResolvedValue({ address: zeroAddress });
    await expect(client.spot.sendTip(params)).rejects.toThrow(
      'The Tip recipient deposit address is unavailable.',
    );
    expect(build).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('retains the original signing context on replay after the client context changes', async () => {
    const { client, params, dda, build, submit } = createFixture();
    const result = await client.spot.sendTip(params);
    const request = result.retryRequest;
    dda.mockClear();
    build.mockClear();
    submit.mockClear();
    client.context.contractAddresses = {
      ...client.context.contractAddresses,
      endpoint: recipientDda,
    };
    client.context.walletClient = createWalletClient({
      account,
      chain: { ...chain, id: 1 },
      transport: http(),
    });
    await client.spot.sendTip(request);
    expect(dda).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith(request);
  });
});
