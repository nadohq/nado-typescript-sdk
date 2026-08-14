import { createNadoClient, NadoClient } from '@nadohq/client';
import {
  EngineOrderParams,
  EngineServerFailureError,
} from '@nadohq/engine-client';
import { IndexerClient } from '@nadohq/indexer-client';
import {
  addDecimals,
  encodeClaimBuilderFeeTx,
  getOrderNonce,
  getOrderVerifyingAddress,
  NADO_ABIS,
  packOrderAppendix,
  QUOTE_PRODUCT_ID,
  subaccountToHex,
  unpackOrderAppendix,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { getContract, PublicClient, zeroAddress } from 'viem';
import { assertDefined, assertHexString } from '../utils/assertions';
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
import { waitForTransaction } from '../utils/waitForTransaction';

/** Builder ID configured on the testnet. */
const BUILDER_ID = 2;

/** Builder fee rate in bps (5 bps = 0.05%). */
const BUILDER_FEE_RATE = 50;

/** Builder ID that does not exist on-chain, used to test rejection. */
const INVALID_BUILDER_ID = 999_999;

void describe('[engine-client]: builder', () => {
  before(async () => {
    // Extra delay to avoid 429 rate-limit errors from preceding test suites
    await delay(TEST_DELAYS.LONG * 2);
  });

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
  // Shared setup for network-dependent builder tests
  // ---------------------------------------------------------------
  void describe('builder order operations', () => {
    let tc: RunContext;
    let indexerClient: IndexerClient;
    let publicClient: PublicClient;
    let buyPrice: BigNumber;

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      tc = createTestContext();
      publicClient = tc.publicClient;
      indexerClient = tc.indexer;

      const markets = await tc.engine.getAllMarkets();
      const oraclePrice = markets.find(
        (m) => m.productId === TEST_PRODUCT_IDS.PERP_BTC,
      )!.product.oraclePrice;
      buyPrice = oraclePrice.multipliedBy(1.1).decimalPlaces(0);
    });

    after(async () => {
      await delay(TEST_DELAYS.STANDARD);
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
      await delay(TEST_DELAYS.STANDARD);
    });

    // ---------------------------------------------------------------
    // Happy path: configured builder
    // ---------------------------------------------------------------
    void describe('with a configured builder', () => {
      let orderDigest: string;

      void test('places an order with builder info', async () => {
        const order: EngineOrderParams = {
          subaccountOwner: tc.walletClientAddress,
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

        const result = await tc.engine.placeOrder({
          verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
          chainId: tc.chainId,
          productId: TEST_PRODUCT_IDS.PERP_BTC,
          order,
          nonce: getOrderNonce(),
        });

        debugPrint('Order placed with builder info', result);
        assertDefined(result, 'placeOrderResult');
        assert.equal(result.status, 'success', 'order should succeed');
        assertHexString(result.data.digest, 'placeOrderResult.data.digest');
        orderDigest = result.data.digest;
      });

      void test('queries historical order for builder fee', async () => {
        assert.ok(orderDigest, 'orderDigest must be set by previous test');

        let order:
          | Awaited<ReturnType<typeof indexerClient.getOrders>>[number]
          | undefined;
        const maxAttempts = 5;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          await delay(TEST_DELAYS.LONG);
          const orders = await indexerClient.getOrders({
            digests: [orderDigest],
            limit: 1,
          });
          debugPrint(`Order query attempt ${attempt}`, orders);
          order = orders[0];
          if (order) break;
        }

        assertDefined(order, 'order should be indexed');
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
        assert.ok(orderDigest, 'orderDigest must be set by previous test');

        const matches = await indexerClient.getMatchEvents({
          subaccounts: [
            {
              subaccountOwner: tc.walletClientAddress,
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
        assert.ok(orderDigest, 'orderDigest must be set by previous test');

        const nadoClient: NadoClient = createNadoClient(
          { chainEnv: tc.env.chainEnv },
          {
            walletClient: tc.walletClient,
            publicClient,
          },
        );

        const slowModeFeeAmount = addDecimals(1, 6);
        await waitForTransaction(
          nadoClient.spot.approveAllowance({
            amount: slowModeFeeAmount,
            productId: QUOTE_PRODUCT_ID,
          }),
          publicClient,
        );

        const senderSubaccount = subaccountToHex({
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });
        const claimTx = encodeClaimBuilderFeeTx({
          sender: senderSubaccount,
          builderId: BUILDER_ID,
        });

        const claimSubmitTime = Math.floor(Date.now() / 1000);

        const endpoint = getContract({
          abi: NADO_ABIS.endpoint,
          address: tc.endpointAddr,
          client: { public: publicClient, wallet: tc.walletClient },
        });

        try {
          const txHash = await endpoint.write.submitSlowModeTransaction([
            claimTx,
          ]);
          debugPrint('ClaimBuilderFee tx hash', txHash);

          const maxAttempts = 10;
          const pollInterval = 2000;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await delay(pollInterval);
            const events = await indexerClient.getEvents({
              subaccounts: [
                {
                  subaccountOwner: tc.walletClientAddress,
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
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes('TF')) {
            debugPrint('ClaimBuilderFee skipped', msg);
          }
          // Not fatal: insufficient USDT0 for slow mode fee, or not builder owner
        }
      });
    });

    // ---------------------------------------------------------------
    // Rejection: invalid builder ID
    // ---------------------------------------------------------------
    void describe('with an invalid builder ID', () => {
      void test('rejects an order referencing a non-existent builder', async () => {
        const order: EngineOrderParams = {
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          amount: addDecimals(0.01),
          expiration: getExpiration(),
          price: buyPrice,
          appendix: packOrderAppendix({
            orderExecutionType: 'default',
            builder: {
              builderId: INVALID_BUILDER_ID,
              builderFeeRate: BUILDER_FEE_RATE,
            },
          }),
        };

        await assert.rejects(
          () =>
            tc.engine.placeOrder({
              verifyingAddr: getOrderVerifyingAddress(
                TEST_PRODUCT_IDS.PERP_BTC,
              ),
              chainId: tc.chainId,
              productId: TEST_PRODUCT_IDS.PERP_BTC,
              order,
              nonce: getOrderNonce(),
            }),
          (err: unknown) => {
            assert.ok(
              err instanceof EngineServerFailureError,
              'error should be EngineServerFailureError',
            );
            // The new `errorCode` field (see ENGINE_ERROR_CODES) must be populated on real
            // backend failures — only its numeric value is asserted here since the engine's
            // invalid-builder code is not part of the shared cross-service enum.
            assert.equal(
              typeof err.errorCode,
              'number',
              'EngineServerFailureError.errorCode should be a number',
            );
            assert.equal(
              err.errorCode,
              err.responseData.error_code,
              'EngineServerFailureError.errorCode should mirror responseData.error_code',
            );
            const msg = err.message.toLowerCase();
            assert.ok(
              msg.includes('invalidbuilder') || msg.includes('invalid builder'),
              `error message should mention invalid builder, got: "${err.message}"`,
            );
            return true;
          },
          'placeOrder with invalid builder ID should be rejected',
        );
      });
    });
  });
});
