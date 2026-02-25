import { EngineClient, EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  createDeterministicLinkedSignerPrivateKey,
  getOrderNonce,
  getOrderVerifyingAddress,
  NADO_ABIS,
  packOrderAppendix,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/shared';
import { TriggerClient } from '@nadohq/trigger-client';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  Address,
  createWalletClient,
  getContract,
  http,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { assertArray, assertDefined } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import { TEST_PRODUCT_IDS, TEST_SUBACCOUNT_NAME } from '../utils/testConstants';

void describe('[engine-client]: linked signer lifecycle', () => {
  let client: EngineClient;
  let triggerClient: TriggerClient;
  let walletClient: WalletClientWithAccount;
  let walletClientAddress: string;
  let chainId: number;
  let endpointAddr: Address;
  let shortLimitPrice: BigDecimal;
  let linkedSignerWalletClient: WalletClientWithAccount;

  before(async () => {
    await delay(1500);

    const context = createTestContext();
    walletClient = context.getWalletClient();
    walletClientAddress = walletClient.account.address;
    chainId = walletClient.chain.id;

    client = new EngineClient({
      url: context.endpoints.engine,
      walletClient,
    });

    triggerClient = new TriggerClient({
      url: context.endpoints.trigger,
      walletClient,
    });

    const clearinghouse = getContract({
      abi: NADO_ABIS.clearinghouse,
      address: context.contracts.clearinghouse,
      client: walletClient,
    });
    endpointAddr = await clearinghouse.read.getEndpoint();

    const products = await client.getAllMarkets();
    const spotMarket = products.find(
      (m) => m.productId === TEST_PRODUCT_IDS.SPOT_BTC,
    );
    assert.ok(spotMarket, 'spot BTC market should exist');
    shortLimitPrice = spotMarket.product.oraclePrice
      .multipliedBy(1.1)
      .decimalPlaces(0);
  });

  after(async () => {
    await cleanupTestState(
      { engine: client, trigger: triggerClient },
      {
        subaccountOwner: walletClientAddress,
        verifyingAddr: endpointAddr,
        chainId,
      },
    );
  });

  beforeEach(async () => {
    await delay(500);
  });

  void test('creates and links a deterministic signer', async () => {
    const linkedSignerPrivKey = await createDeterministicLinkedSignerPrivateKey(
      {
        chainId,
        endpointAddress: endpointAddr,
        walletClient,
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      },
    );

    linkedSignerWalletClient = createWalletClient({
      chain: walletClient.chain,
      account: privateKeyToAccount(linkedSignerPrivKey),
      transport: http(),
    });
    debugPrint(
      'Linked signer address',
      linkedSignerWalletClient.account.address,
    );

    const result = await client.linkSigner({
      chainId,
      signer: subaccountToHex({
        subaccountOwner: linkedSignerWalletClient.account.address,
        subaccountName: '',
      }),
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      verifyingAddr: endpointAddr,
    });

    debugPrint('Link signer result', result);
    assertDefined(result, 'linkSignerResult');
    assert.equal(result.status, 'success', 'linkSigner should succeed');
  });

  void test('getLinkedSigner returns the linked signer address', async () => {
    const result = await client.getLinkedSigner({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Linked signer query', result);
    assertDefined(result, 'linkedSignerQuery');
    assertDefined(result.signer, 'linkedSignerQuery.signer');

    client.setLinkedSigner(linkedSignerWalletClient);
  });

  void test('places an isolated position using the linked signer', async () => {
    const iocOrder: EngineOrderParams = {
      subaccountOwner: walletClientAddress,
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

    const result = await client.placeOrder({
      verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
      chainId,
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
    const result = await client.getIsolatedPositions({
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
    });

    debugPrint('Isolated positions', result);
    assertArray(result, 'isolatedPositions');
  });

  void test('revokes the linked signer', async () => {
    const result = await client.linkSigner({
      chainId,
      signer: subaccountToHex({
        subaccountOwner: zeroAddress,
        subaccountName: '',
      }),
      subaccountOwner: walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      verifyingAddr: endpointAddr,
    });

    client.setLinkedSigner(null);

    debugPrint('Revoke signer result', result);
    assertDefined(result, 'revokeSignerResult');
    assert.equal(result.status, 'success', 'revoke signer should succeed');
  });
});
