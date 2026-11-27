import {
  CHAIN_ENV_TO_CHAIN,
  createNadoClient,
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  SendTipError,
  subaccountToHex,
} from '@nadohq/client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  createPublicClient,
  createWalletClient,
  http,
  zeroAddress,
} from 'viem';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[client]: Tip submission admission',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: ReturnType<typeof createNadoClient>;

    before(() => {
      const tc = createTestContext();
      const chain = CHAIN_ENV_TO_CHAIN.inkMainnet;
      client = createNadoClient(
        { chainEnv: 'inkMainnet' },
        {
          walletClient: createWalletClient({
            account: tc.walletClient.account,
            chain,
            transport: http(),
          }),
          publicClient: createPublicClient({
            transport: http(chain.rpcUrls.default.http[0]),
          }),
        },
      );
    });

    void test('preserves a malformed replay after production Mobile rejects its empty withdrawal signature', async () => {
      const owner = client.context.walletClient?.account.address;
      assert.ok(owner);
      // The empty inner signature cannot authorize or dispatch a withdrawal; only Mobile authentication is signed.
      await assert.rejects(
        client.spot.sendTip({
          subaccountOwner: owner,
          subaccountName: 'default',
          chainId: CHAIN_ENV_TO_CHAIN.inkMainnet.id,
          verifyingAddr: client.context.contractAddresses.endpoint,
          recipientSubaccount: {
            subaccountOwner: '0x2222222222222222222222222222222222222222',
            subaccountName: 'default',
          },
          backgroundId: 'sdk-validation-only',
          visibility: 'private',
          withdrawal: {
            sender: subaccountToHex({
              subaccountOwner: owner,
              subaccountName: 'default',
            }),
            productId: 0,
            amount: '5000000',
            nonce: '0',
            sendTo: zeroAddress,
            appendix: '0',
          },
          withdrawalSignature: '0x',
          maxFeeX18: '0',
        }),
        (error: unknown) => {
          assert.ok(error instanceof SendTipError);
          assert.ok(error.cause instanceof MobileServerFailureError);
          assert.equal(
            error.cause.errorCode,
            MOBILE_ERROR_CODES.INVALID_TIP_REQUEST,
          );
          assert.equal(error.retryRequest.withdrawalSignature, '0x');
          return true;
        },
      );
    });
  },
);
