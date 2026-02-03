import { EngineClient, EngineOrderParams } from '@nadohq/engine-client';
import { IndexerClient } from '@nadohq/indexer-client';
import {
  addDecimals,
  encodeClaimBuilderFeeTx,
  getOrderNonce,
  getOrderVerifyingAddress,
  NADO_ABIS,
  packOrderAppendix,
  subaccountToHex,
  unpackOrderAppendix,
} from '@nadohq/shared';
import test from 'node:test';
import { getContract } from 'viem';
import { debugPrint } from '../utils/debugPrint';
import { getExpiration } from '../utils/getExpiration';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function builderTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;
  const walletClientAddress = walletClient.account.address;
  const chainId = walletClient.chain.id;

  const client = new EngineClient({
    url: context.endpoints.engine,
    walletClient,
  });

  const indexerClient = new IndexerClient({
    url: context.endpoints.indexer,
  });

  const endpoint = getContract({
    abi: NADO_ABIS.endpoint,
    address: context.contracts.endpoint,
    client: { public: publicClient, wallet: walletClient },
  });

  const testBuilderId = 2;
  const testBuilderFeeRate = 500; // 50 bps

  // Test 1: Appendix encoding with builder fields
  console.log('Test 1: Testing appendix encoding with builder fields');

  const appendixWithBuilder = packOrderAppendix({
    orderExecutionType: 'default',
    builder: {
      builderId: testBuilderId,
      builderFeeRate: testBuilderFeeRate,
    },
  });
  debugPrint('Packed appendix with builder', appendixWithBuilder.toString());

  const unpackedAppendix = unpackOrderAppendix(appendixWithBuilder);
  debugPrint('Unpacked appendix', unpackedAppendix);

  if (unpackedAppendix.builder?.builderId !== testBuilderId) {
    throw new Error(
      `Builder ID mismatch: expected ${testBuilderId}, got ${unpackedAppendix.builder?.builderId}`,
    );
  }
  if (unpackedAppendix.builder?.builderFeeRate !== testBuilderFeeRate) {
    throw new Error(
      `Builder fee rate mismatch: expected ${testBuilderFeeRate}, got ${unpackedAppendix.builder?.builderFeeRate}`,
    );
  }
  console.log('✓ Appendix encoding test passed');

  // Test 2: ClaimBuilderFee encoding
  console.log('Test 2: Testing ClaimBuilderFee encoding');
  const senderSubaccount = subaccountToHex({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });

  const claimTx = encodeClaimBuilderFeeTx({
    sender: senderSubaccount,
    builderId: testBuilderId,
  });
  debugPrint('Encoded ClaimBuilderFee tx', claimTx);

  // Verify it starts with tx type 31 (0x1f)
  if (!claimTx.startsWith('0x1f')) {
    throw new Error(
      `ClaimBuilderFee tx should start with 0x1f (tx type 31), got ${claimTx.slice(0, 4)}`,
    );
  }
  console.log('✓ ClaimBuilderFee encoding test passed');

  // Test 3: Place order with builder info
  console.log('Test 3: Placing order with builder info');
  const products = await client.getAllMarkets();
  const perpProductId = 2;
  const perpOrderVerifyingAddr = getOrderVerifyingAddress(perpProductId);
  const market = products.find((m) => m.productId === perpProductId);
  if (!market) {
    throw new Error(`Market not found for product ID ${perpProductId}`);
  }
  const oraclePrice = market.product.oraclePrice;

  // Place a buy order well above market to ensure fill
  const buyPrice = oraclePrice.multipliedBy(1.1).decimalPlaces(0);

  const orderWithBuilder: EngineOrderParams = {
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    amount: addDecimals(0.01),
    expiration: getExpiration(),
    price: buyPrice,
    appendix: packOrderAppendix({
      orderExecutionType: 'default',
      builder: {
        builderId: testBuilderId,
        builderFeeRate: testBuilderFeeRate,
      },
    }),
  };

  let orderDigest: string | undefined;
  try {
    const placeResult = await client.placeOrder({
      verifyingAddr: perpOrderVerifyingAddr,
      chainId,
      productId: perpProductId,
      order: orderWithBuilder,
      nonce: getOrderNonce(),
    });
    debugPrint('Order placed with builder info', placeResult);
    orderDigest = placeResult.data.digest;
    console.log(`✓ Order with builder info placed, digest: ${orderDigest}`);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (
      errorMessage.includes('InvalidBuilder') ||
      errorMessage.includes('invalid builder')
    ) {
      console.log(
        `Builder ${testBuilderId} not configured in test environment. Skipping order-based tests.`,
      );
      console.log('✓ Builder tests complete (encoding tests passed)');
      return;
    }
    throw e;
  }

  // Wait for order to process
  console.log('Waiting for order to process...');
  await sleep(2000);

  // Test 4: Query historical order and check for builder fee
  console.log('Test 4: Querying historical order for builder fee');
  const orders = await indexerClient.getOrders({
    subaccounts: [
      {
        subaccountOwner: walletClientAddress,
        subaccountName: 'default',
      },
    ],
    productIds: [perpProductId],
    digests: [orderDigest],
    limit: 1,
  });
  debugPrint('Order query result', orders);

  if (orders.length > 0) {
    const order = orders[0];
    console.log(`Order found: digest=${order.digest}`);
    console.log(`  baseFilled: ${order.baseFilled.toString()}`);
    console.log(`  totalFee: ${order.totalFee.toString()}`);
    console.log(`  builderFee: ${order.builderFee.toString()}`);
    if (!order.builderFee.isZero()) {
      console.log('✓ Builder fee charged');
    }

    // Check appendix has builder info
    if (order.appendix.builder) {
      console.log(
        `  appendix.builder.builderId: ${order.appendix.builder.builderId}`,
      );
      console.log(
        `  appendix.builder.builderFeeRate: ${order.appendix.builder.builderFeeRate}`,
      );
      if (order.appendix.builder.builderId !== testBuilderId) {
        throw new Error(
          `Order appendix builderId mismatch: expected ${testBuilderId}, got ${order.appendix.builder.builderId}`,
        );
      }
      console.log('✓ Builder info verified in order appendix');
    }
  } else {
    console.log('Order not found in indexer yet');
  }

  // Test 5: Query match events
  console.log('Test 5: Querying match events');
  const matches = await indexerClient.getMatchEvents({
    subaccounts: [
      {
        subaccountOwner: walletClientAddress,
        subaccountName: 'default',
      },
    ],
    productIds: [perpProductId],
    limit: 10,
  });
  debugPrint('Match events', matches.slice(0, 3));

  const matchForOrder = matches.find((m) => m.digest === orderDigest);
  if (matchForOrder) {
    console.log(`Match found for order: digest=${matchForOrder.digest}`);
    console.log(`  baseFilled: ${matchForOrder.baseFilled.toString()}`);
    console.log(`  totalFee: ${matchForOrder.totalFee.toString()}`);
    console.log(`  sequencerFee: ${matchForOrder.sequencerFee.toString()}`);
    console.log(`  builderFee: ${matchForOrder.builderFee.toString()}`);
    if (!matchForOrder.builderFee.isZero()) {
      console.log('✓ Builder fee charged in match');
    }
  } else {
    console.log('No match found for order yet (order may be unfilled)');
  }

  // Test 6: Submit ClaimBuilderFee slow mode transaction
  console.log('Test 6: Submitting ClaimBuilderFee slow mode transaction');
  const claimBuilderFeeTx = encodeClaimBuilderFeeTx({
    sender: senderSubaccount,
    builderId: testBuilderId,
  });

  const claimSubmitTime = Math.floor(Date.now() / 1000);

  try {
    const txHash = await endpoint.write.submitSlowModeTransaction([
      claimBuilderFeeTx,
    ]);
    console.log(`✓ ClaimBuilderFee submitted, tx hash: ${txHash}`);

    // Test 7: Poll for claim_builder_fee event
    console.log('Test 7: Polling for claim_builder_fee event...');
    const maxAttempts = 10;
    const pollInterval = 2000;
    let found = false;

    for (let attempt = 1; attempt <= maxAttempts && !found; attempt++) {
      await sleep(pollInterval);
      const events = await indexerClient.getEvents({
        subaccounts: [
          {
            subaccountOwner: walletClientAddress,
            subaccountName: 'default',
          },
        ],
        eventTypes: ['claim_builder_fee'],
        limit: { type: 'txs', value: 5 },
      });

      const recentEvent = events.find(
        (e) => e.timestamp.toNumber() >= claimSubmitTime - 10,
      );
      if (recentEvent) {
        console.log(
          `Found claim_builder_fee event on attempt ${attempt} (timestamp: ${recentEvent.timestamp.toString()})`,
        );
        console.log('✓ ClaimBuilderFee event verified');
        found = true;
      } else {
        console.log(`Attempt ${attempt}/${maxAttempts}: not found yet...`);
      }
    }

    if (!found) {
      console.log(
        'No recent claim_builder_fee event found after polling (no fees accumulated or not builder owner)',
      );
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`ClaimBuilderFee note: ${errorMessage}`);
    // Not fatal - might not be builder owner or no fees accumulated
  }

  // Cleanup: Cancel the order if it wasn't filled
  console.log('Cleanup: Cancelling order if still open');
  try {
    await client.cancelOrders({
      subaccountName: 'default',
      subaccountOwner: walletClientAddress,
      productIds: [perpProductId],
      digests: [orderDigest],
      verifyingAddr: context.contracts.endpoint,
      chainId,
    });
    console.log('✓ Order cancelled');
  } catch {
    console.log('Order already filled or cancelled');
  }

  console.log('\n=== Builder E2E Tests Complete ===');
}

void test('[engine-client]: Running builder tests', () =>
  runWithContext(builderTests));
