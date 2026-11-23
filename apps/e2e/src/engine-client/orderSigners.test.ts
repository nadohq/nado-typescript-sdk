import {
  ENGINE_ERROR_CODES,
  EngineExecuteRequestParamsByType,
  EngineOrderParams,
  EngineServerFailureError,
} from '@nadohq/engine-client';
import {
  addDecimals,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  subaccountToHex,
  WalletClientWithAccount,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import {
  after,
  before,
  beforeEach,
  describe,
  test,
  TestContext,
} from 'node:test';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { assertDefined } from '../utils/assertions';
import { cleanupTestState } from '../utils/cleanup';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

/**
 * Order signers are trading-only keys: they can place and cancel orders for a subaccount but
 * cannot withdraw, transfer or manage signers. Adds are rate limited per week, so this suite adds
 * a single throwaway signer, deletes it again, and skips when the shared account has no adds left.
 */
void describe(
  '[engine-client]: order signer lifecycle',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;
    let farBidPrice: BigNumber;
    let orderSignerWalletClient: WalletClientWithAccount;
    let orderSignerParams: EngineExecuteRequestParamsByType['add_order_signer'];
    let hasRemainingAdds: boolean;

    const includesOrderSigner = (orderSigners: string[]) =>
      orderSigners.some(
        (signer) =>
          signer.toLowerCase() ===
          orderSignerWalletClient.account.address.toLowerCase(),
      );

    // Data-dependent skip: the weekly add limit is shared by every CI run against this account
    const skipIfAddLimitReached = (context: TestContext) => {
      if (!hasRemainingAdds) {
        context.skip('weekly order signer add limit reached');
      }
      return !hasRemainingAdds;
    };

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      tc = createTestContext();

      orderSignerWalletClient = createWalletClient({
        chain: tc.walletClient.chain,
        account: privateKeyToAccount(generatePrivateKey()),
        transport: http(),
      });
      debugPrint(
        'Order signer address',
        orderSignerWalletClient.account.address,
      );
      orderSignerParams = {
        chainId: tc.chainId,
        signer: subaccountToHex({
          subaccountOwner: orderSignerWalletClient.account.address,
          subaccountName: '',
        }),
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        verifyingAddr: tc.endpointAddr,
      };

      const rateLimit = await tc.indexer.getOrderSignerRateLimit({
        subaccount: {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        },
      });
      debugPrint('Order signer rate limit', rateLimit);
      hasRemainingAdds = rateLimit.remainingTxs.gt(0);

      const markets = await tc.engine.getAllMarkets();
      const oraclePrice = markets.find(
        (m) => m.productId === TEST_PRODUCT_IDS.SPOT_BTC,
      )!.product.oraclePrice;
      // Far below the market so the resting bid never fills
      farBidPrice = oraclePrice.multipliedBy(0.85).decimalPlaces(0);
    });

    after(async () => {
      tc.engine.setLinkedSigner(null);

      // Best-effort delete so a failed run doesn't leave the signer on the shared subaccount;
      // the 15-signer cap would otherwise block every later run
      try {
        await tc.engine.deleteOrderSigner(orderSignerParams);
      } catch (error) {
        const isAlreadyDeleted =
          error instanceof EngineServerFailureError &&
          error.errorCode === ENGINE_ERROR_CODES.ORDER_SIGNER_NOT_FOUND;
        if (!isAlreadyDeleted) {
          debugPrint('Order signer cleanup failed', error);
        }
      }

      await cleanupTestState(
        { engine: tc.engine, trigger: tc.trigger },
        {
          subaccountOwner: tc.walletClientAddress,
          endpointAddr: tc.endpointAddr,
          chainId: tc.chainId,
        },
      );
    });

    beforeEach(async () => {
      // Tests that sign with the order signer opt in explicitly; a failed assertion must not
      // leave it installed for the next test
      tc.engine.setLinkedSigner(null);
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('addOrderSigner adds the signer', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      const result = await tc.engine.addOrderSigner(orderSignerParams);

      debugPrint('Add order signer result', result);
      assertDefined(result, 'addOrderSignerResult');
      assert.equal(result.status, 'success', 'addOrderSigner should succeed');
    });

    void test('getOrderSigners lists the new signer', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      const result = await tc.engine.getOrderSigners({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('Order signers', result);
      assert.ok(
        includesOrderSigner(result.orderSigners),
        'order signers should include the added signer',
      );
    });

    void test('the order signer can place and cancel an order', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      // Wait for the engine to propagate before signing with the order signer
      await delay(TEST_DELAYS.LONG);
      tc.engine.setLinkedSigner(orderSignerWalletClient);

      const order: EngineOrderParams = {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(0.01),
        expiration: getExpiration(),
        price: farBidPrice,
        appendix: packOrderAppendix({ orderExecutionType: 'default' }),
      };

      const placeResult = await tc.engine.placeOrder({
        verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.SPOT_BTC),
        chainId: tc.chainId,
        productId: TEST_PRODUCT_IDS.SPOT_BTC,
        order,
        nonce: getOrderNonce(),
      });

      debugPrint('Place order result', placeResult);
      assert.equal(
        placeResult.status,
        'success',
        'order signed by the order signer should succeed',
      );

      await delay(TEST_DELAYS.STANDARD);

      const cancelResult = await tc.engine.cancelOrders({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        productIds: [TEST_PRODUCT_IDS.SPOT_BTC],
        digests: [placeResult.data.digest],
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Cancel order result', cancelResult);
      assert.equal(
        cancelResult.status,
        'success',
        'cancel signed by the order signer should succeed',
      );
    });

    void test('the order signer cannot manage order signers', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      tc.engine.setLinkedSigner(orderSignerWalletClient);

      await assert.rejects(
        tc.engine.deleteOrderSigner(orderSignerParams),
        (error: unknown) => {
          debugPrint('Order signer self-delete error', error);
          // The engine must refuse the signer; a transport error would not prove that
          return error instanceof EngineServerFailureError;
        },
        'an order signer must not be able to delete itself',
      );

      const orderSigners = await tc.engine.getOrderSigners({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });
      assert.ok(
        includesOrderSigner(orderSigners.orderSigners),
        'the refused delete must leave the signer in place',
      );
    });

    void test('deleteOrderSigner removes the signer', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      const result = await tc.engine.deleteOrderSigner(orderSignerParams);

      debugPrint('Delete order signer result', result);
      assert.equal(
        result.status,
        'success',
        'deleteOrderSigner should succeed',
      );

      await delay(TEST_DELAYS.LONG);

      const orderSigners = await tc.engine.getOrderSigners({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });
      assert.ok(
        !includesOrderSigner(orderSigners.orderSigners),
        'order signers should no longer include the deleted signer',
      );
    });
  },
);
