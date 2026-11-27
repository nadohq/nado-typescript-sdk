import { EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  createDeterministicLinkedSignerPrivateKey,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { createWalletClient, http, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { assertArray, assertDefined } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe('[engine-client]: linked signer lifecycle', () => {
  let ctx: RunContext;
  let shortLimitPrice: BigNumber;
  let linkedSignerWalletClient: WalletClientWithAccount;

  before(async () => {
    // Extra delay to avoid 429 rate-limit errors from preceding test suites
    await delay(TEST_DELAYS.LONG * 3);

    ctx = createTestContext();

    const markets = await ctx.engine.getAllMarkets();
    const oraclePrice = markets.find(
      (m) => m.productId === TEST_PRODUCT_IDS.SPOT_BTC,
    )!.product.oraclePrice;
    shortLimitPrice = oraclePrice.multipliedBy(1.1).decimalPlaces(0);
  });

  after(async () => {
    await cleanupTestState(
      { engine: ctx.engine, trigger: ctx.trigger },
      {
        subaccountOwner: ctx.walletClientAddress,
        endpointAddr: ctx.endpointAddr,
        chainId: ctx.chainId,
      },
    );
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.STANDARD);
  });

  void test('creates and links a deterministic signer', async () => {
    const linkedSignerPrivKey = await createDeterministicLinkedSignerPrivateKey(
      {
        chainId: ctx.chainId,
        endpointAddress: ctx.endpointAddr,
        walletClient: ctx.walletClient,
        subaccountOwner: ctx.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      },
    );

    linkedSignerWalletClient = createWalletClient({
      chain: ctx.walletClient.chain,
      account: privateKeyToAccount(linkedSignerPrivKey),
      transport: http(),
    });
    debugPrint(
      'Linked signer address',
      linkedSignerWalletClient.account.address,
    );

    const result = await ctx.engine.linkSigner({
      chainId: ctx.chainId,
      signer: subaccountToHex({
        subaccountOwner: linkedSignerWalletClient.account.address,
        subaccountName: '',
      }),
      subaccountOwner: ctx.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      verifyingAddr: ctx.endpointAddr,
    });

    debugPrint('Link signer result', result);
    assertDefined(result, 'linkSignerResult');
    assert.equal(result.status, 'success', 'linkSigner should succeed');
  });

  void test('getLinkedSigner returns the linked signer address', async () => {
    const result = await ctx.engine.getLinkedSigner({
      subaccountOwner: ctx.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Linked signer query', result);
    assertDefined(result, 'linkedSignerQuery');
    assertDefined(result.signer, 'linkedSignerQuery.signer');

    // Wait for engine to propagate before signing with the linked signer
    await delay(TEST_DELAYS.LONG);
    ctx.engine.setLinkedSigner(linkedSignerWalletClient);
  });

  void test('places an isolated position using the linked signer', async () => {
    const iocOrder: EngineOrderParams = {
      subaccountOwner: ctx.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      amount: addDecimals(0.03),
      expiration: getExpiration(),
      price: shortLimitPrice,
      appendix: packOrderAppendix({
        orderExecutionType: 'ioc',
        isolated: {
          margin: addDecimals(shortLimitPrice.multipliedBy(0.03).div(10)),
        },
      }),
    };

    const result = await ctx.engine.placeOrder({
      verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
      chainId: ctx.chainId,
      productId: TEST_PRODUCT_IDS.PERP_BTC,
      order: iocOrder,
      nonce: getOrderNonce(),
    });

    debugPrint('Isolated position result', result);
    assertDefined(result, 'isolatedPositionResult');
    assert.equal(
      result.status,
      'success',
      'isolated position order should succeed',
    );
  });

  void test('getIsolatedPositions returns positions for the subaccount', async () => {
    const result = await ctx.engine.getIsolatedPositions({
      subaccountOwner: ctx.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Isolated positions', result);
    assertArray(result, 'isolatedPositions');
  });

  void test('revokes the linked signer', async () => {
    const result = await ctx.engine.linkSigner({
      chainId: ctx.chainId,
      signer: subaccountToHex({
        subaccountOwner: zeroAddress,
        subaccountName: '',
      }),
      subaccountOwner: ctx.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      verifyingAddr: ctx.endpointAddr,
    });

    ctx.engine.setLinkedSigner(null);

    debugPrint('Revoke signer result', result);
    assertDefined(result, 'revokeSignerResult');
    assert.equal(result.status, 'success', 'revoke signer should succeed');
  });
});
