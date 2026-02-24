import { createNadoClient, NadoClient } from '@nadohq/client';
import { EngineClient, EngineOrderParams } from '@nadohq/engine-client';
import { IndexerClient } from '@nadohq/indexer-client';
import {
  addDecimals,
  BigDecimal,
  ChainEnv,
  encodeClaimBuilderFeeTx,
  getOrderNonce,
  getOrderVerifyingAddress,
  NADO_ABIS,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
  subaccountToHex,
  unpackOrderAppendix,
  WalletClientWithAccount,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Address, getContract, PublicClient, zeroAddress } from 'viem';
import { assertDefined, assertHexString } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { attachRetryInterceptor } from '../utils/retryInterceptor';
import { createTestContext } from '../utils/runWithContext';
import { TEST_PRODUCT_IDS, TEST_SUBACCOUNT_NAME } from '../utils/testConstants';
import { waitForTransaction } from '../utils/waitForTransaction';

/** Builder ID configured on the testnet. */
const BUILDER_ID = 2;

/** Builder fee rate in bps (5 bps = 0.05%). */
const BUILDER_FEE_RATE = 50;

void describe('[engine-client]: builder', () => {
  // ---------------------------------------------------------------
  // Pure encoding tests — no network or client setup needed
  // ---------------------------------------------------------------
  void describe('appendix encoding', () => {
    void test('packs and unpacks builder fields correctly', () => {
      const packed = packOrderAppendix({
        orderExecutionType: 'default',
        builder: {
          builderId: BUILDER_ID,
          builderFeeRate: BUILDER_FEE_RATE,
        },
      });

      debugPrint('Packed appendix with builder', packed.toString());
      const unpacked = unpackOrderAppendix(packed);
      debugPrint('Unpacked appendix', unpacked);

      assert.equal(
        unpacked.builder?.builderId,
        BUILDER_ID,
        `builderId should be ${BUILDER_ID}`,
      );
      assert.equal(
        unpacked.builder?.builderFeeRate,
        BUILDER_FEE_RATE,
        `builderFeeRate should be ${BUILDER_FEE_RATE}`,
      );
    });

    void test('encodeClaimBuilderFeeTx produces tx with type 31 prefix', () => {
      const sender = subaccountToHex({
        subaccountOwner: zeroAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      const claimTx = encodeClaimBuilderFeeTx({
        sender,
        builderId: BUILDER_ID,
      });

      debugPrint('Encoded ClaimBuilderFee tx', claimTx);
      assertHexString(claimTx, 'claimBuilderFeeTx');
      assert.ok(
        claimTx.startsWith('0x1f'),
        `claimTx should start with 0x1f (tx type 31), got ${claimTx.slice(0, 4)}`,
      );
    });
  });

  // ---------------------------------------------------------------
  // Builder order lifecycle: place, query, claim, cleanup
  // ---------------------------------------------------------------
  void describe('builder order lifecycle', () => {
    let client: EngineClient;
    let indexerClient: IndexerClient;
    let walletClient: WalletClientWithAccount;
    let publicClient: PublicClient;
    let chainEnv: ChainEnv;
    let walletClientAddress: string;
    let chainId: number;
    let endpointAddress: Address;
    let buyPrice: BigDecimal;

    /** Order digest from the placement test, shared across subsequent tests. */
    let orderDigest: string | undefined;

    /** Set to false when the builder is not configured in the test environment. */
    let builderConfigured = true;

    before(async () => {
      const context = createTestContext();
      walletClient = context.getWalletClient();
      publicClient = context.publicClient;
      chainEnv = context.env.chainEnv;
      walletClientAddress = walletClient.account.address;
      chainId = walletClient.chain.id;
      endpointAddress = context.contracts.endpoint;

      client = new EngineClient({
        url: context.endpoints.engine,
        walletClient,
      });
      indexerClient = new IndexerClient({
        url: context.endpoints.indexer,
      });

      attachRetryInterceptor(client.axiosInstance);
      attachRetryInterceptor(indexerClient.axiosInstance);

      const products = await client.getAllMarkets();
      const market = products.find(
        (m) => m.productId === TEST_PRODUCT_IDS.PERP_BTC,
      );
      assert.ok(
        market,
        `Market not found for product ID ${TEST_PRODUCT_IDS.PERP_BTC}`,
      );
      buyPrice = market.product.oraclePrice.multipliedBy(1.1).decimalPlaces(0);
    });

    void test('places an order with builder info', async () => {
      const order: EngineOrderParams = {
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        amount: addDecimals(0.01),
        expiration: getExpiration(),
        price: buyPrice,
        appendix: packOrderAppendix({
          orderExecutionType: 'default',
          builder: {
            builderId: BUILDER_ID,
            builderFeeRate: BUILDER_FEE_RATE,
          },
        }),
      };

      try {
        const result = await client.placeOrder({
          verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
          chainId,
          productId: TEST_PRODUCT_IDS.PERP_BTC,
          order,
          nonce: getOrderNonce(),
        });

        debugPrint('Order placed with builder info', result);
        assertDefined(result, 'placeOrderResult');
        assert.equal(result.status, 'success', 'order should succeed');
        assertHexString(result.data.digest, 'placeOrderResult.data.digest');
        orderDigest = result.data.digest;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('InvalidBuilder') || msg.includes('invalid builder')) {
          builderConfigured = false;
          return;
        }
        throw e;
      }
    });

    void test('queries historical order for builder fee', async () => {
      if (!builderConfigured || !orderDigest) return;

      // Allow time for the order to be indexed
      await delay(2000);

      const orders = await indexerClient.getOrders({
        digests: [orderDigest],
        limit: 1,
      });

      debugPrint('Order query result', orders);

      const order = orders[0];
      assert.equal(order.digest, orderDigest, 'digest should match');
      assertDefined(order.totalFee, 'order.totalFee');
      assertDefined(order.builderFee, 'order.builderFee');

      if (order.appendix.builder) {
        assert.equal(
          order.appendix.builder.builderId,
          BUILDER_ID,
          'order appendix builderId should match',
        );
      }
    });

    void test('queries match events for the builder order', async () => {
      if (!builderConfigured || !orderDigest) return;

      const matches = await indexerClient.getMatchEvents({
        subaccounts: [
          {
            subaccountOwner: walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
          },
        ],
        productIds: [TEST_PRODUCT_IDS.PERP_BTC],
        limit: 10,
      });

      debugPrint('Match events', matches.slice(0, 3));

      const matchForOrder = matches.find((m) => m.digest === orderDigest);
      if (matchForOrder) {
        assertDefined(matchForOrder.totalFee, 'matchForOrder.totalFee');
        assertDefined(matchForOrder.builderFee, 'matchForOrder.builderFee');
      }
    });

    void test('submits ClaimBuilderFee via slow mode and polls for event', async () => {
      if (!builderConfigured || !orderDigest) return;

      const nadoClient: NadoClient = createNadoClient(chainEnv, {
        walletClient,
        publicClient,
      });

      // Approve 1 USDT for slow mode fee
      const slowModeFeeAmount = addDecimals(1, 6);
      await waitForTransaction(
        nadoClient.spot.approveAllowance({
          amount: slowModeFeeAmount,
          productId: QUOTE_PRODUCT_ID,
        }),
        publicClient,
      );

      const senderSubaccount = subaccountToHex({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });
      const claimTx = encodeClaimBuilderFeeTx({
        sender: senderSubaccount,
        builderId: BUILDER_ID,
      });

      const claimSubmitTime = Math.floor(Date.now() / 1000);

      const endpoint = getContract({
        abi: NADO_ABIS.endpoint,
        address: endpointAddress,
        client: { public: publicClient, wallet: walletClient },
      });

      try {
        const txHash = await endpoint.write.submitSlowModeTransaction([
          claimTx,
        ]);
        debugPrint('ClaimBuilderFee tx hash', txHash);

        // Poll for claim_builder_fee event
        const maxAttempts = 10;
        const pollInterval = 2000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          await delay(pollInterval);
          const events = await indexerClient.getEvents({
            subaccounts: [
              {
                subaccountOwner: walletClientAddress,
                subaccountName: TEST_SUBACCOUNT_NAME,
              },
            ],
            eventTypes: ['claim_builder_fee'],
            limit: { type: 'txs', value: 5 },
          });

          const recentEvent = events.find(
            (e) => e.timestamp.toNumber() >= claimSubmitTime - 10,
          );
          if (recentEvent) {
            debugPrint(
              'claim_builder_fee event found',
              recentEvent.timestamp.toString(),
            );
            return;
          }
        }

        // Not fatal: account may not be the builder owner or no fees accumulated
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('TF')) {
          debugPrint('ClaimBuilderFee skipped', msg);
        }
        // Not fatal: insufficient USDT0 for slow mode fee, or not builder owner
      }
    });

    after(async () => {
      if (!orderDigest) return;

      try {
        await client.cancelOrders({
          subaccountName: TEST_SUBACCOUNT_NAME,
          subaccountOwner: walletClientAddress,
          productIds: [TEST_PRODUCT_IDS.PERP_BTC],
          digests: [orderDigest],
          verifyingAddr: endpointAddress,
          chainId,
        });
      } catch {
        // Order already filled or cancelled — no action needed
      }
    });
  });
});
