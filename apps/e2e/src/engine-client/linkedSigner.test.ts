import { EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  createDeterministicLinkedSignerPrivateKey,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { createWalletClient, http, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { assertArray, assertDefined } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import {
  getCachedOraclePrice,
  getSharedClients,
  TestClients,
} from '../utils/sharedTestSetup';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
} from '../utils/testConstants';

void describe('[engine-client]: linked signer lifecycle', () => {
  let tc: TestClients;
  let shortLimitPrice: BigDecimal;
  let linkedSignerWalletClient: WalletClientWithAccount;

  before(async () => {
    await delay(TEST_DELAYS.BETWEEN_SUITES);

    tc = getSharedClients();

    const oraclePrice = await getCachedOraclePrice(TEST_PRODUCT_IDS.SPOT_BTC);
    shortLimitPrice = oraclePrice.multipliedBy(1.1).decimalPlaces(0);
  });

  after(async () => {
    await cleanupTestState(
      { engine: tc.engine, trigger: tc.trigger },
      {
        subaccountOwner: tc.walletClientAddress,
        endpointAddr: tc.endpointAddr,
        chainId: tc.chainId,
      },
      { hasEngineOrders: true, hasPerpPositions: true },
    );
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.RATE_LIMIT_LONG);
  });

  void test('creates and links a deterministic signer', async () => {
    const linkedSignerPrivKey = await createDeterministicLinkedSignerPrivateKey(
      {
        chainId: tc.chainId,
        endpointAddress: tc.endpointAddr,
        walletClient: tc.walletClient,
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      },
    );

    linkedSignerWalletClient = createWalletClient({
      chain: tc.walletClient.chain,
      account: privateKeyToAccount(linkedSignerPrivKey),
      transport: http(),
    });
    debugPrint(
      'Linked signer address',
      linkedSignerWalletClient.account.address,
    );

    const result = await tc.engine.linkSigner({
      chainId: tc.chainId,
      signer: subaccountToHex({
        subaccountOwner: linkedSignerWalletClient.account.address,
        subaccountName: '',
      }),
      subaccountOwner: tc.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      verifyingAddr: tc.endpointAddr,
    });

    debugPrint('Link signer result', result);
    assertDefined(result, 'linkSignerResult');
    assert.equal(result.status, 'success', 'linkSigner should succeed');
  });

  void test('getLinkedSigner returns the linked signer address', async () => {
    const result = await tc.engine.getLinkedSigner({
      subaccountOwner: tc.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Linked signer query', result);
    assertDefined(result, 'linkedSignerQuery');
    assertDefined(result.signer, 'linkedSignerQuery.signer');

    tc.engine.setLinkedSigner(linkedSignerWalletClient);
  });

  void test('places an isolated position using the linked signer', async () => {
    const iocOrder: EngineOrderParams = {
      subaccountOwner: tc.walletClientAddress,
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

    const result = await tc.engine.placeOrder({
      verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
      chainId: tc.chainId,
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
    const result = await tc.engine.getIsolatedPositions({
      subaccountOwner: tc.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Isolated positions', result);
    assertArray(result, 'isolatedPositions');
  });

  void test('revokes the linked signer', async () => {
    const result = await tc.engine.linkSigner({
      chainId: tc.chainId,
      signer: subaccountToHex({
        subaccountOwner: zeroAddress,
        subaccountName: '',
      }),
      subaccountOwner: tc.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      verifyingAddr: tc.endpointAddr,
    });

    tc.engine.setLinkedSigner(null);

    debugPrint('Revoke signer result', result);
    assertDefined(result, 'revokeSignerResult');
    assert.equal(result.status, 'success', 'revoke signer should succeed');
  });
});
