import { EngineClient, EngineOrderParams } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  depositCollateral,
  getOrderDigest,
  getOrderNonce,
  getOrderVerifyingAddress,
  MOCK_ERC20_ABI,
  NADO_ABIS,
  packOrderAppendix,
  toBigDecimal,
  toBigInt,
} from '@nadohq/shared';
import {
  TriggerClient,
  TriggerPlaceOrderParams,
  TriggerServerStatusTypeFilter,
} from '@nadohq/trigger-client';
import test from 'node:test';
import { getContract } from 'viem';
import { debugPrint } from '../utils/debugPrint';
import { getExpiration } from '../utils/getExpiration';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';
import { waitForTransaction } from '../utils/waitForTransaction';

const PENDING_TRIGGER_STATUS_TYPES: TriggerServerStatusTypeFilter[] = [
  'triggering',
  'waiting_price',
  'waiting_dependency',
  'twap_executing',
];

async function fullSanity(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;
  const chainId = walletClient.chain.id;

  const engineClient = new EngineClient({
    url: context.endpoints.engine,
    walletClient,
  });

  const client = new TriggerClient({
    url: context.endpoints.trigger,
    walletClient,
  });

  const clearinghouse = getContract({
    abi: NADO_ABIS.clearinghouse,
    address: context.contracts.clearinghouse,
    client: walletClient,
  });
  const quote = getContract({
    abi: MOCK_ERC20_ABI,
    address: await clearinghouse.read.getQuote(),
    client: walletClient,
  });
  const endpointAddr = context.contracts.endpoint;
  const endpoint = getContract({
    abi: NADO_ABIS.endpoint,
    address: endpointAddr,
    client: walletClient,
  });

  const depositAmount = toBigInt(addDecimals(10000, 6));

  const subaccountOwner = walletClient.account.address;
  const subaccountName = 'default';

  await waitForTransaction(
    quote.write.mint([walletClient.account.address, depositAmount]),
    publicClient,
  );
  await waitForTransaction(
    quote.write.approve([context.contracts.endpoint, depositAmount]),
    publicClient,
  );
  await waitForTransaction(
    depositCollateral({
      amount: depositAmount,
      endpoint,
      productId: 0,
      subaccountName,
    }),
    publicClient,
  );

  console.log('Done depositing collateral, placing stop orders');

  const ethProductId = 3;
  const ethOrderVerifyingAddr = getOrderVerifyingAddress(ethProductId);
  const nonce = getOrderNonce();

  const shortStopOrder: EngineOrderParams & { nonce: string } = {
    amount: addDecimals(-0.1),
    expiration: getExpiration(),
    nonce,
    price: 1000,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      orderExecutionType: 'default',
    }),
  };

  const shortStopDigest = getOrderDigest({
    chainId,
    order: shortStopOrder,
    productId: ethProductId,
  });

  const shortTriggerParams: TriggerPlaceOrderParams = {
    chainId,
    order: shortStopOrder,
    productId: ethProductId,
    spotLeverage: true,
    triggerCriteria: {
      type: 'price',
      criteria: {
        type: 'oracle_price_above',
        triggerPrice: new BigDecimal(10000),
      },
    },
    verifyingAddr: ethOrderVerifyingAddr,
    nonce,
    id: 1000,
  };
  const shortStopResult = await client.placeTriggerOrder(shortTriggerParams);
  debugPrint('Short stop order result', shortStopResult.data);

  const btcPerpProductId = 2;
  const btcPerpOrderVerifyingAddr = getOrderVerifyingAddress(btcPerpProductId);

  const longStopNonce = getOrderNonce();

  const longStopOrder: EngineOrderParams & { nonce: string } = {
    nonce: longStopNonce,
    amount: addDecimals(0.01),
    expiration: getExpiration(),
    price: 60000,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      orderExecutionType: 'ioc',
    }),
  };

  const longStopDigest = getOrderDigest({
    chainId,
    order: longStopOrder,
    productId: btcPerpProductId,
  });

  const longStopParams: TriggerPlaceOrderParams = {
    chainId,
    order: longStopOrder,
    productId: btcPerpProductId,
    triggerCriteria: {
      type: 'price',
      criteria: {
        type: 'oracle_price_below',
        triggerPrice: toBigDecimal(60000),
      },
    },
    verifyingAddr: btcPerpOrderVerifyingAddr,
    nonce: longStopNonce,
  };

  const longStopResult = await client.placeTriggerOrder(longStopParams);

  debugPrint('Long stop order result', longStopResult);

  const shortStopMidBookNonce = getOrderNonce();

  const shortStopMidBookOrder: EngineOrderParams & { nonce: string } = {
    amount: addDecimals(-0.2),
    expiration: getExpiration(),
    nonce: shortStopMidBookNonce,
    price: 1000,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      orderExecutionType: 'default',
    }),
  };

  const shortStopMidBookDigest = getOrderDigest({
    chainId,
    order: shortStopMidBookOrder,
    productId: ethProductId,
  });

  const marketPrice = await engineClient.getMarketPrice({
    productId: ethProductId,
  });
  const midPrice = marketPrice.ask.plus(marketPrice.bid).div(2);

  const shortStopMidBookTriggerParams: TriggerPlaceOrderParams = {
    chainId,
    order: shortStopMidBookOrder,
    productId: ethProductId,
    spotLeverage: true,
    triggerCriteria: {
      type: 'price',
      criteria: {
        type: 'mid_price_above',
        triggerPrice: midPrice.multipliedBy(2),
      },
    },
    verifyingAddr: ethOrderVerifyingAddr,
    nonce,
    id: 1000,
  };
  const shortStopMidBookResult = await client.placeTriggerOrder(
    shortStopMidBookTriggerParams,
  );
  debugPrint('Short stop mid-book order result', shortStopMidBookResult.data);

  // Test reduce_only orders
  const reduceOnlyOrder: EngineOrderParams = {
    amount: addDecimals(-0.1),
    expiration: getExpiration(),
    price: 1000,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      reduceOnly: true,
      orderExecutionType: 'default',
    }),
  };
  const reduceOnlyTriggerParams: TriggerPlaceOrderParams = {
    chainId,
    order: reduceOnlyOrder,
    productId: ethProductId,
    spotLeverage: true,
    triggerCriteria: {
      type: 'price',
      criteria: {
        type: 'mid_price_above',
        triggerPrice: midPrice.multipliedBy(1.5),
      },
    },
    verifyingAddr: ethOrderVerifyingAddr,
  };

  const reduceOnlyResult = await client.placeTriggerOrder(
    reduceOnlyTriggerParams,
  );
  debugPrint('Reduce-only order result', reduceOnlyResult.data);

  // Test isolated orders
  const isolatedOrder: EngineOrderParams = {
    amount: addDecimals(0.15),
    expiration: getExpiration(),
    price: 3000,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      orderExecutionType: 'default',
      isolated: {
        margin: addDecimals(100),
      },
    }),
  };

  const isolatedTriggerParams: TriggerPlaceOrderParams = {
    chainId,
    order: isolatedOrder,
    productId: ethProductId,
    spotLeverage: true,
    triggerCriteria: {
      type: 'price',
      criteria: {
        type: 'mid_price_below',
        triggerPrice: midPrice.multipliedBy(0.8),
      },
    },
    verifyingAddr: ethOrderVerifyingAddr,
  };

  const isolatedResult = await client.placeTriggerOrder(isolatedTriggerParams);
  debugPrint('Isolated order result', isolatedResult.data);

  // Test TWAP orders
  const twapOrder: EngineOrderParams = {
    amount: addDecimals(1),
    expiration: getExpiration(),
    price: 950,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      orderExecutionType: 'default',
      triggerType: 'twap',
      twap: {
        numOrders: 5,
        slippageFrac: 0.01, // 1% slippage
      },
    }),
  };

  const twapTriggerParams: TriggerPlaceOrderParams = {
    chainId,
    order: twapOrder,
    productId: ethProductId,
    spotLeverage: true,
    triggerCriteria: {
      type: 'time',
      criteria: {
        interval: 30,
      },
    },
    verifyingAddr: ethOrderVerifyingAddr,
    id: 4000,
  };

  const twapResult = await client.placeTriggerOrder(twapTriggerParams);
  debugPrint('TWAP order result', twapResult.data);

  const twapExecutionsResult = await client.listTwapExecutions({
    digest: twapResult.data.digest,
  });
  debugPrint('TWAP executions result', twapExecutionsResult);

  const batchOrder1: EngineOrderParams = {
    amount: addDecimals(0.05),
    expiration: getExpiration(),
    price: 3100,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      orderExecutionType: 'default',
    }),
  };

  const batchOrder2: EngineOrderParams = {
    amount: addDecimals(0.05),
    expiration: getExpiration(),
    price: 3200,
    subaccountName,
    subaccountOwner,
    appendix: packOrderAppendix({
      orderExecutionType: 'default',
    }),
  };

  const batchTriggerParams: TriggerPlaceOrderParams[] = [
    {
      chainId,
      order: batchOrder1,
      productId: ethProductId,
      spotLeverage: true,
      triggerCriteria: {
        type: 'price',
        criteria: {
          type: 'oracle_price_below',
          triggerPrice: toBigDecimal(3100),
        },
      },
      verifyingAddr: ethOrderVerifyingAddr,
      id: 5000,
    },
    {
      chainId,
      order: batchOrder2,
      productId: ethProductId,
      spotLeverage: true,
      triggerCriteria: {
        type: 'price',
        criteria: {
          type: 'oracle_price_below',
          triggerPrice: toBigDecimal(3200),
        },
      },
      verifyingAddr: ethOrderVerifyingAddr,
      id: 5001,
    },
  ];

  const batchResult = await client.placeTriggerOrders({
    orders: batchTriggerParams,
    cancelOnFailure: false,
  });
  debugPrint('Batch place orders result', batchResult.data);

  const reduceOnlyOrdersResult = await client.listOrders({
    chainId,
    statusTypes: PENDING_TRIGGER_STATUS_TYPES,
    subaccountName,
    subaccountOwner,
    verifyingAddr: endpointAddr,
    reduceOnly: true,
  });
  debugPrint('Pending reduce-only orders result', reduceOnlyOrdersResult);

  const twapOrdersResult = await client.listOrders({
    chainId,
    statusTypes: PENDING_TRIGGER_STATUS_TYPES,
    subaccountName,
    subaccountOwner,
    verifyingAddr: endpointAddr,
    triggerTypes: ['time_trigger'],
  });
  debugPrint('Pending TWAP orders result', twapOrdersResult);

  const pendingListOrdersResult = await client.listOrders({
    chainId,
    statusTypes: PENDING_TRIGGER_STATUS_TYPES,
    subaccountName,
    subaccountOwner,
    verifyingAddr: endpointAddr,
  });
  debugPrint('Pending list all trigger orders result', pendingListOrdersResult);

  const pendingListOrdersForProductResult = await client.listOrders({
    chainId,
    statusTypes: PENDING_TRIGGER_STATUS_TYPES,
    subaccountName,
    subaccountOwner,
    verifyingAddr: endpointAddr,
    productIds: [ethProductId],
  });

  debugPrint(
    'Pending list orders for product result',
    pendingListOrdersForProductResult,
  );

  // Cancel ETH order via digest
  const cancelViaDigestResult = await client.cancelTriggerOrders({
    digests: [shortStopDigest],
    productIds: [ethProductId],
    subaccountName,
    subaccountOwner,
    verifyingAddr: endpointAddr,
    chainId,
  });

  debugPrint('Cancel via digest result', cancelViaDigestResult);

  // Cancel orders via product
  const cancelViaProductResult = await client.cancelProductOrders({
    productIds: [ethProductId, btcPerpProductId],
    subaccountName,
    subaccountOwner,
    verifyingAddr: endpointAddr,
    chainId,
  });

  debugPrint('Cancel via product result', cancelViaProductResult);

  const nonPendingListOrdersResult = await client.listOrders({
    chainId,
    statusTypes: PENDING_TRIGGER_STATUS_TYPES,
    subaccountName,
    subaccountOwner,
    verifyingAddr: endpointAddr,
  });

  debugPrint('Non-pending list orders result', nonPendingListOrdersResult);

  const ordersByDigest = await client.listOrders({
    chainId,
    verifyingAddr: endpointAddr,
    subaccountName,
    subaccountOwner,
    digests: [shortStopDigest, longStopDigest, shortStopMidBookDigest],
  });

  debugPrint('List orders by digest result', ordersByDigest);
}

void test('[trigger-client]: Running full sanity test', () =>
  runWithContext(fullSanity));
