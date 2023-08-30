import { RunContext } from '../utils/types';
import {
  getChainIdFromSigner,
  getOrderNonce,
} from '@vertex-protocol/contracts';
import { toFixedPoint } from '@vertex-protocol/utils';
import { runWithContext } from '../utils/runWithContext';
import {
  createVertexClient,
  getProductMetadataByProductId,
  PlaceOrderParams,
} from '@vertex-protocol/client';
import { getExpiration } from '../utils/getExpiration';
import { prettyPrint } from '../utils/prettyPrint';

async function fullSanity(context: RunContext) {
  const signer = context.getWallet();
  const vertexClient = await createVertexClient(context.env.chainEnv, {
    signerOrProvider: signer,
  });

  const chainId = await getChainIdFromSigner(signer);

  console.log('Minting tokens...');
  const mintTx = await vertexClient.spot._mintMockERC20({
    // 20000 tokens
    amount: toFixedPoint(20000, 6),
    productId: 0,
  });
  await mintTx.wait();

  console.log('Approving allowance...');
  const approveTx = await vertexClient.spot.approveAllowance({
    amount: toFixedPoint(20000, 6),
    productId: 0,
  });
  await approveTx.wait();

  console.log('Depositing tokens with referral code...');
  const depositWithReferralTx = await vertexClient.spot.deposit({
    subaccountName: 'default',
    productId: 0,
    amount: toFixedPoint(10000, 6),
    referralCode: 'Blk23MeZU3',
  });
  await depositWithReferralTx.wait();

  const referralCode =
    await vertexClient.context.contracts.endpoint.referralCodes(
      await signer.getAddress(),
    );

  prettyPrint('Referral code', referralCode);

  console.log('Depositing tokens...');
  const depositTx = await vertexClient.spot.deposit({
    subaccountName: 'default',
    productId: 0,
    amount: toFixedPoint(10000, 6),
  });
  await depositTx.wait();

  console.log('Placing order...');
  const orderNonce = getOrderNonce();

  const orderParams: PlaceOrderParams['order'] = {
    subaccountName: 'default',
    expiration: getExpiration('post_only', 60).toString(),
    // Limit price
    price: 2000,
    amount: toFixedPoint(-3.5).toString(),
  };

  const orderResult = await vertexClient.market.placeOrder({
    order: orderParams,
    // Product you're sending the order for
    productId: 3,
    nonce: orderNonce,
  });

  prettyPrint('Place order result', orderResult);

  const subaccountOrders =
    await vertexClient.context.engineClient.getSubaccountOrders({
      productId: 3,
      subaccountName: 'default',
      subaccountOwner: signer.address,
    });

  prettyPrint('Subaccount orders', subaccountOrders);

  const verifyingAddr =
    await vertexClient.context.engineClient.getOrderbookAddress(3);

  const digest = vertexClient.context.engineClient.getOrderDigest(
    orderResult.orderParams,
    verifyingAddr,
    chainId,
  );

  prettyPrint('Order digest', digest);

  console.log(`Cancelling order`);
  const cancelResult = await vertexClient.market.cancelOrders({
    digests: [digest],
    productIds: [3],
    subaccountName: 'default',
  });

  prettyPrint('Cancel order result', cancelResult);

  const perpOrderResult = await vertexClient.market.placeOrder({
    order: orderParams,
    productId: 4,
    nonce: getOrderNonce(),
  });

  prettyPrint('Place perp order result', perpOrderResult);

  const perpOrderDigest = vertexClient.context.engineClient.getOrderDigest(
    perpOrderResult.orderParams,
    await vertexClient.context.engineClient.getOrderbookAddress(4),
    chainId,
  );

  console.log(`Cancelling and placing orders in single request`);
  const cancelAndPlaceResult = await vertexClient.market.cancelAndPlace({
    cancelOrders: {
      digests: [perpOrderDigest],
      productIds: [4],
      subaccountName: 'default',
    },
    placeOrder: {
      order: orderParams,
      productId: 3,
      nonce: getOrderNonce(),
    },
  });

  prettyPrint('Cancel and place order result', cancelAndPlaceResult);

  // Fetches state from offchain sequencer
  await vertexClient.market.getAllEngineMarkets();
  await vertexClient.market.getLatestMarketPrices({ productIds: [1, 2, 3] });

  // Fetches state from Arbitrum
  await vertexClient.market.getAllMarkets();
  await vertexClient.market.getLatestMarketPrice({ productId: 3 });
  await vertexClient.market.getMarketLiquidity({
    productId: 3,
    // Per side of the book
    depth: 100,
  });

  // Subaccount state from engine
  await vertexClient.subaccount.getEngineSubaccountSummary({
    subaccountOwner: await signer.getAddress(),
    subaccountName: 'default',
  });
  // Subaccount state from Arbitrum
  await vertexClient.subaccount.getSubaccountSummary({
    subaccountOwner: await signer.getAddress(),
    subaccountName: 'default',
  });

  await vertexClient.market.getOpenSubaccountOrders({
    subaccountOwner: await signer.getAddress(),
    subaccountName: 'default',
    productId: 3,
  });
  await vertexClient.market.getOpenSubaccountMultiProductOrders({
    subaccountOwner: await signer.getAddress(),
    subaccountName: 'default',
    productIds: [1, 2, 3],
  });
  await vertexClient.spot.withdraw({
    subaccountName: 'default',
    productId: 0,
    amount: toFixedPoint(1000, 6),
  });

  const spotProductId = 1;
  prettyPrint(
    'Spot product metadata (testnet)',
    getProductMetadataByProductId('testnet', spotProductId),
  );
  prettyPrint(
    'Spot product metadata (mainnet)',
    getProductMetadataByProductId('mainnet', spotProductId),
  );

  const perpProductId = 2;
  prettyPrint(
    'Perp product metadata (testnet)',
    getProductMetadataByProductId('testnet', perpProductId),
  );
  prettyPrint(
    'Spot product metadata (mainnet)',
    getProductMetadataByProductId('mainnet', perpProductId),
  );

  const invalidProductId = 10000;
  prettyPrint(
    'Invalid product metadata (testnet)',
    getProductMetadataByProductId('testnet', invalidProductId),
  );
  prettyPrint(
    'Spot product metadata (mainnet)',
    getProductMetadataByProductId('mainnet', invalidProductId),
  );

  const nSubmissions =
    await vertexClient.context.contracts.endpoint.nSubmissions();

  prettyPrint('nSubmissions', nSubmissions);

  const engineTime = await vertexClient.context.engineClient.getTime();

  prettyPrint('Engine time', engineTime);
}

runWithContext(fullSanity);
