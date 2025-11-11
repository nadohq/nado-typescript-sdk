import {
  addDecimals,
  createNadoClient,
  NadoClient,
  PlaceOrderParams,
} from '@nadohq/client';
import {
  getOrderDigest,
  getOrderNonce,
  packOrderAppendix,
} from '@nadohq/shared';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';
import { getExpiration } from '../utils/getExpiration';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';

async function orderTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;

  const nadoClient: NadoClient = createNadoClient(context.env.chainEnv, {
    walletClient,
    publicClient,
  });

  const chainId = walletClient.chain.id;
  const walletClientAddress = walletClient.account.address;

  // Query all markets for price information
  const allMarkets = await nadoClient.market.getAllMarkets();

  const spotOrderProductId = 3;
  const perpOrderProductId = 4;

  // Place spot order
  const spotOrderProductOraclePrice = allMarkets.find(
    (market) => market.productId === spotOrderProductId,
  )!.product.oraclePrice;

  const shortLimitPrice = spotOrderProductOraclePrice
    .multipliedBy(1.1)
    .decimalPlaces(0);
  const shortMarketPrice = spotOrderProductOraclePrice
    .multipliedBy(0.9)
    .decimalPlaces(0);

  // This can be shared with spot & perp because 3 & 4 are both BTC
  const orderParams: PlaceOrderParams['order'] = {
    subaccountName: 'default',
    expiration: getExpiration(),
    price: shortLimitPrice,
    amount: addDecimals(-3.5),
    appendix: packOrderAppendix({
      orderExecutionType: 'post_only',
    }),
  };
  const orderResult = await nadoClient.market.placeOrder({
    order: orderParams,
    productId: spotOrderProductId,
  });

  debugPrint('Place order result', orderResult);

  const orderCustomIdResult = await nadoClient.market.placeOrder({
    id: 100,
    order: {
      ...orderParams,
      appendix: packOrderAppendix({
        isolated: {
          margin: addDecimals(1000),
        },
        orderExecutionType: 'post_only',
      }),
    },
    productId: perpOrderProductId,
  });

  debugPrint('Place iso order w/ custom id result', orderCustomIdResult);

  const subaccountOrders =
    await nadoClient.context.engineClient.getSubaccountOrders({
      productId: spotOrderProductId,
      subaccountName: 'default',
      subaccountOwner: walletClientAddress,
    });

  debugPrint('Subaccount orders', subaccountOrders);

  console.log(`Cancelling order`);
  const cancelResult = await nadoClient.market.cancelOrders({
    digests: subaccountOrders.orders.map((order) => order.digest),
    productIds: subaccountOrders.orders.map((order) => order.productId),
    subaccountName: 'default',
  });

  debugPrint('Cancel order result', cancelResult);

  const perpOrderResult = await nadoClient.market.placeOrder({
    order: orderParams,
    productId: perpOrderProductId,
  });

  debugPrint('Place perp order result', perpOrderResult);

  const perpOrderDigest = getOrderDigest({
    order: perpOrderResult.orderParams,
    chainId,
    productId: perpOrderProductId,
  });

  const cancelAndPlaceResult = await nadoClient.market.cancelAndPlace({
    cancelOrders: {
      digests: [perpOrderDigest],
      productIds: [perpOrderProductId],
      subaccountName: 'default',
    },
    placeOrder: {
      // Place a market order
      order: {
        ...orderParams,
        appendix: packOrderAppendix({
          orderExecutionType: 'ioc',
        }),
        price: shortMarketPrice,
      },
      productId: perpOrderProductId,
      nonce: getOrderNonce(),
    },
  });

  debugPrint('Cancel and place order result', cancelAndPlaceResult);

  // Place multiple orders
  console.log('Placing multiple orders');
  const placeOrdersResult = await nadoClient.market.placeOrders({
    stopOnFailure: true,
    orders: [
      {
        order: {
          ...orderParams,
          price: shortLimitPrice,
          amount: addDecimals(-1),
          appendix: packOrderAppendix({
            orderExecutionType: 'post_only',
          }),
        },
        productId: spotOrderProductId,
      },
      {
        order: {
          ...orderParams,
          price: shortLimitPrice,
          amount: addDecimals(-2),
          appendix: packOrderAppendix({
            orderExecutionType: 'post_only',
          }),
        },
        productId: spotOrderProductId,
      },
    ],
  });
  debugPrint('Place orders result', placeOrdersResult);
}

void test('[client]: Running order tests', () => runWithContext(orderTests));
