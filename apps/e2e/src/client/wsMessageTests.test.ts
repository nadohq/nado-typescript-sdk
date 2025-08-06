import {
  createVertexClient,
  PlaceOrderParams,
  VertexClient,
} from '@vertex-protocol/client';
import {
  getOrderDigest,
  getOrderNonce,
  QUOTE_PRODUCT_ID,
  subaccountToHex,
} from '@vertex-protocol/contracts';
import { addDecimals, nowInSeconds } from '@vertex-protocol/utils';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';

async function wsMessageTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;
  const vertexClient: VertexClient = createVertexClient(context.env.chainEnv, {
    walletClient,
    publicClient,
  });

  const chainId = walletClient.chain.id;
  const walletClientAddress = walletClient.account.address;

  const orderParams: PlaceOrderParams['order'] = {
    subaccountName: 'default',
    expiration: nowInSeconds() + 60,
    price: 28000,
    amount: addDecimals(0.01),
  };

  const contracts = await vertexClient.context.engineClient.getContracts();
  // Address for product ID of 1
  const verifyingAddr = contracts.orderbookAddrs[1];

  const wsOrder = {
    ...orderParams,
    subaccountOwner: walletClientAddress,
    nonce: getOrderNonce(),
  };
  const wsOrderSig = await vertexClient.context.engineClient.sign(
    'place_order',
    verifyingAddr,
    chainId,
    wsOrder,
  );

  const wsPlaceOrderReq = vertexClient.ws.execute.buildPlaceOrderMessage({
    productId: 1,
    order: wsOrder,
    signature: wsOrderSig,
  }).payload;

  debugPrint('Place Order WS request', wsPlaceOrderReq);

  const wsOrderDigest = getOrderDigest({
    order: wsOrder,
    verifyingAddr,
    chainId,
  });

  const wsCancelOrdersReq = vertexClient.ws.execute.buildCancelOrdersMessage({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    productIds: [1],
    digests: [wsOrderDigest],
    signature: '',
    nonce: getOrderNonce(),
  });

  debugPrint('Cancel Order WS request', wsCancelOrdersReq);

  const wsWithdrawCollateralReq =
    await vertexClient.ws.execute.buildWithdrawCollateralMessage({
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
      productId: QUOTE_PRODUCT_ID,
      amount: addDecimals(4999),
      signature: '',
    });

  debugPrint('Withdraw Collateral WS request', wsWithdrawCollateralReq);

  const wsQuerySubaccountInfoReq = vertexClient.ws.query.buildQueryMessage(
    'subaccount_info',
    {
      subaccount: subaccountToHex({
        subaccountOwner: walletClientAddress,
        subaccountName: 'default',
      }),
    },
  );

  debugPrint('Query subaccount info WS request', wsQuerySubaccountInfoReq);

  const wsTradeStream = vertexClient.ws.subscription.buildSubscriptionParams(
    'trade',
    {
      product_id: QUOTE_PRODUCT_ID,
    },
  );
  const wsTradeSubscriptionReq =
    vertexClient.ws.subscription.buildSubscriptionMessage(
      1,
      'subscribe',
      wsTradeStream,
    );
  debugPrint('Trade subscription WS request', wsTradeSubscriptionReq);

  const wsFillStream = vertexClient.ws.subscription.buildSubscriptionParams(
    'fill',
    {
      product_id: 1,
      subaccount:
        '0x3b69d1a1021a1979cc6e16987ce0fcfa8875484064656661756c740000000000',
    },
  );
  const wsFillUnsubscribeReq =
    vertexClient.ws.subscription.buildSubscriptionMessage(
      1,
      'unsubscribe',
      wsFillStream,
    );

  debugPrint('Fill unsubscribe WS request', wsFillUnsubscribeReq);

  const wsListSubscriptionsReq =
    vertexClient.ws.subscription.buildSubscriptionMessage(1, 'list', {});

  debugPrint('List subscriptions WS request', wsListSubscriptionsReq);
}

void test('[client]: Running WS message tests', () =>
  runWithContext(wsMessageTests));
