import {
  createDeterministicLinkedSignerPrivateKey,
  getIsolatedOrderDigest,
  getOrderDigest,
  getOrderNonce,
  subaccountToHex,
  VERTEX_ABIS,
} from '@vertex-protocol/contracts';
import {
  EngineClient,
  EngineOrderParams,
  EngineIsolatedOrderParams,
} from '@vertex-protocol/engine-client';
import { addDecimals, toBigDecimal } from '@vertex-protocol/utils';
import { createWalletClient, getContract, http, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getExpiration } from '../utils/getExpiration';
import { prettyPrint } from '../utils/prettyPrint';
import { RunContext } from '../utils/types';
import { runWithContext } from '../utils/runWithContext';
import { delay } from '../utils/delay';

export async function signerAndOrderTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const walletClientAddress = walletClient.account.address;
  const chainId = walletClient.chain.id;

  const client = new EngineClient({
    url: context.endpoints.engine,
    walletClient,
  });

  const clearinghouse = getContract({
    abi: VERTEX_ABIS.clearinghouse,
    address: context.contracts.clearinghouse,
    client: walletClient,
  });

  const endpointAddr = await clearinghouse.read.getEndpoint();
  const products = await client.getAllMarkets();
  prettyPrint('All products', products);

  console.log('Placing order');
  const spotProductId = 1;
  const spotOrderbookAddr = await client.getOrderbookAddress(spotProductId);
  const spotOraclePrice = products.find(
    (market) => market.productId === spotProductId,
  )!.product.oraclePrice;
  const shortLimitPrice = spotOraclePrice.multipliedBy(1.1).decimalPlaces(0);

  const spotOrder: EngineOrderParams = {
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    amount: addDecimals(-0.03),
    expiration: getExpiration(),
    price: shortLimitPrice,
  };
  const spotPlaceOrderResult = await client.placeOrder({
    verifyingAddr: spotOrderbookAddr,
    chainId,
    productId: spotProductId,
    order: spotOrder,
    nonce: getOrderNonce(),
  });
  const spotOrderDigest = getOrderDigest({
    order: spotPlaceOrderResult.orderParams,
    verifyingAddr: spotOrderbookAddr,
    chainId,
  });
  prettyPrint('Done placing spot order', spotPlaceOrderResult);

  if (spotOrderDigest !== spotPlaceOrderResult.data.digest) {
    throw Error(
      `Computed and returned order digests do not match. Computed: ${spotOrderDigest}. Returned: ${spotPlaceOrderResult.data.digest}`,
    );
  }

  console.log('Placing isolated order');
  const perpProductId = 2;
  const perpOrderbookAddr = await client.getOrderbookAddress(perpProductId);
  const isolatedOrder: EngineIsolatedOrderParams = {
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    amount: addDecimals(-0.03),
    expiration: getExpiration(),
    price: shortLimitPrice,
    // 10x leverage
    margin: addDecimals(shortLimitPrice.multipliedBy(0.03).div(10)),
  };
  const perpPlaceIsolatedOrderResult = await client.placeIsolatedOrder({
    verifyingAddr: perpOrderbookAddr,
    chainId,
    productId: perpProductId,
    order: isolatedOrder,
    nonce: getOrderNonce(),
  });
  prettyPrint('Done placing isolated order', perpPlaceIsolatedOrderResult);
  const perpIsolatedOrderDigest = getIsolatedOrderDigest({
    order: perpPlaceIsolatedOrderResult.orderParams,
    verifyingAddr: perpOrderbookAddr,
    chainId,
  });

  if (perpIsolatedOrderDigest !== perpPlaceIsolatedOrderResult.data.digest) {
    throw Error(
      `Computed and returned isolated order digests do not match. Computed: ${perpIsolatedOrderDigest}. Returned: ${perpPlaceIsolatedOrderResult.data.digest}`,
    );
  }

  const subaccountOrders = await client.getSubaccountOrders({
    productId: 2,
    subaccountName: 'default',
    subaccountOwner: walletClientAddress,
  });
  prettyPrint('Subaccount orders', subaccountOrders);

  const marketLiquidity = await client.getMarketLiquidity({
    depth: 10,
    productId: spotProductId,
  });
  prettyPrint('Market liquidity', marketLiquidity);

  const marketPrice = await client.getMarketPrice({
    productId: spotProductId,
  });
  prettyPrint('Market price', marketPrice);

  const marketPrices = await client.getMarketPrices({
    productIds: [spotProductId, 2, 3],
  });
  prettyPrint('Market prices', marketPrices);

  const feeRates = await client.getSubaccountFeeRates({
    subaccountName: 'default',
    subaccountOwner: walletClientAddress,
  });
  prettyPrint('Fee rates', feeRates);

  const maxOrderSize = await client.getMaxOrderSize({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    productId: spotProductId,
    price: toBigDecimal(70000),
    side: 'long',
  });
  prettyPrint('Max order size', maxOrderSize);

  const maxWithdrawable = await client.getMaxWithdrawable({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    productId: 0,
  });
  prettyPrint('Max withdrawable', maxWithdrawable);

  const maxWithdrawableNoSpotLeverage = await client.getMaxWithdrawable({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    productId: 0,
    spotLeverage: false,
  });
  prettyPrint(
    'Max withdrawable no spot leverage',
    maxWithdrawableNoSpotLeverage,
  );

  const queriedOrder = await client.getOrder({
    digest: spotOrderDigest,
    productId: spotProductId,
  });
  prettyPrint('Queried spot order', queriedOrder);

  const queriedIsolatedOrder = await client.getOrder({
    digest: perpIsolatedOrderDigest,
    productId: perpProductId,
  });
  prettyPrint('Queried perp isolated order', queriedIsolatedOrder);

  const queriedOrders = await client.getSubaccountMultiProductOrders({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    productIds: [spotProductId, perpProductId],
  });
  prettyPrint('Queried orders', queriedOrders);

  console.log('Cancelling orders');
  const cancelResult = await client.cancelOrders({
    subaccountName: 'default',
    subaccountOwner: walletClientAddress,
    productIds: [spotProductId, perpProductId],
    digests: [spotOrderDigest, perpIsolatedOrderDigest],
    verifyingAddr: endpointAddr,
    chainId,
  });
  prettyPrint('Done cancelling orders', cancelResult);

  const subaccountOrdersAfterCancel = await client.getSubaccountOrders({
    productId: spotProductId,
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });
  prettyPrint('Subaccount orders after cancel', subaccountOrdersAfterCancel);

  const maxWithdrawableAfterCancel = await client.getMaxWithdrawable({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    productId: 0,
  });
  prettyPrint('Max withdrawable after cancel', maxWithdrawableAfterCancel);

  const linkedSignerWalletPrivKey =
    await createDeterministicLinkedSignerPrivateKey({
      chainId,
      endpointAddress: endpointAddr,
      walletClient,
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
    });
  const linkedSignerWalletClient = createWalletClient({
    chain: walletClient.chain,
    account: privateKeyToAccount(linkedSignerWalletPrivKey),
    transport: http(),
  });
  console.log(
    "Linked signer's wallet",
    linkedSignerWalletClient.account.address,
    linkedSignerWalletPrivKey,
  );

  const linkSignerResult = await client.linkSigner({
    chainId,
    signer: subaccountToHex({
      subaccountOwner: linkedSignerWalletClient.account.address,
      subaccountName: '',
    }),
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    verifyingAddr: endpointAddr,
  });
  prettyPrint('Done linking signer', linkSignerResult);

  const linkedSignerQueryResponse = await client.getLinkedSigner({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });
  prettyPrint(
    'Linked signer, setting engine client to use the new signer',
    linkedSignerQueryResponse,
  );

  client.setLinkedSigner(linkedSignerWalletClient);

  // Open an iso position
  const createIsoPositionOrder: EngineIsolatedOrderParams = {
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    amount: addDecimals(0.03),
    expiration: getExpiration('fok'),
    // Use the short limit price here to ensure a fill when opening a long
    price: shortLimitPrice,
    // 10x leverage
    margin: addDecimals(shortLimitPrice.multipliedBy(0.03).div(10)),
  };
  const createIsoPositionOrderResult = await client.placeIsolatedOrder({
    verifyingAddr: perpOrderbookAddr,
    chainId,
    productId: perpProductId,
    order: createIsoPositionOrder,
    nonce: getOrderNonce(),
  });
  prettyPrint('Done creating isolated position', createIsoPositionOrderResult);

  const isoPositions = await client.getIsolatedPositions({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });
  prettyPrint('Isolated positions', isoPositions);

  // Revoke signer
  const revokeSignerResult = await client.linkSigner({
    chainId,
    signer: subaccountToHex({
      subaccountOwner: zeroAddress,
      subaccountName: '',
    }),
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    verifyingAddr: endpointAddr,
  });
  client.setLinkedSigner(null);
  prettyPrint('Done revoking signer', revokeSignerResult);

  // Delay for rate limit
  await delay(5000);

  // places order for multiple products
  for (const productId of [spotProductId, perpProductId]) {
    console.log('Placing order for product', productId);
    const orderbookAddr = await client.getOrderbookAddress(productId);
    const order: EngineOrderParams = {
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
      amount: addDecimals(-0.01),
      expiration: getExpiration(),
      price: shortLimitPrice,
    };
    const placeResult = await client.placeOrder({
      verifyingAddr: orderbookAddr,
      productId,
      order,
      nonce: getOrderNonce(),
      chainId,
    });
    prettyPrint('Done placing order', placeResult);

    const subaccountOrdersAfterPlace = await client.getSubaccountOrders({
      productId,
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
    });

    prettyPrint('Subaccount Orders after place', subaccountOrdersAfterPlace);

    // Delay for rate limit
    await delay(5000);
  }

  // cancels orders for all products
  const cancelProductOrdersRes = await client.cancelProductOrders({
    subaccountName: 'default',
    subaccountOwner: walletClientAddress,
    productIds: [spotProductId, perpProductId],
    verifyingAddr: endpointAddr,
    chainId,
  });
  prettyPrint('Cancel Product Orders', cancelProductOrdersRes);

  for (const productId of [spotProductId, perpProductId]) {
    const subaccountOrdersAfterCancel = await client.getSubaccountOrders({
      productId,
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
    });

    prettyPrint(
      `Subaccount Orders after cancel for product ${productId}`,
      subaccountOrdersAfterCancel,
    );
  }
}

console.log('Running order tests');
runWithContext(signerAndOrderTests);
