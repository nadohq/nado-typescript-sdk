import { describe, expect, it, jest } from '@jest/globals';
import { getOrderVerifyingAddress, toBigNumber } from '@nadohq/shared';
import { NadoClientContext } from '../../context';
import { MarketExecuteAPI } from './MarketExecuteAPI';
import {
  CancelAndPlaceOrderParams,
  PlaceOrderParams,
  PlaceOrdersParams,
} from './types';

describe('MarketExecuteAPI', () => {
  const mockEngineClient = {
    placeOrder: jest.fn(),
    placeOrders: jest.fn(),
    cancelOrders: jest.fn(),
    cancelAndPlace: jest.fn(),
  };

  const walletAddress = '0x1111111111111111111111111111111111111111';
  const customOwner = '0x2222222222222222222222222222222222222222';
  const endpointAddress = '0x3333333333333333333333333333333333333333';

  const mockContext = {
    engineClient: mockEngineClient,
    walletClient: {
      account: { address: walletAddress },
      chain: { id: 763373 },
    },
    contractAddresses: {
      endpoint: endpointAddress,
    },
  } as unknown as NadoClientContext;

  const api = new MarketExecuteAPI(mockContext);

  it('forwards borrowMargin in placeOrder', async () => {
    const params: PlaceOrderParams = {
      id: 101,
      productId: 1,
      order: {
        subaccountName: 'default',
        amount: toBigNumber(100),
        price: toBigNumber(2000),
        expiration: toBigNumber(1000),
        appendix: 0n,
      },
      nonce: '12345',
      spotLeverage: false,
      borrowMargin: true,
    };

    await api.placeOrder(params);

    expect(mockEngineClient.placeOrder).toHaveBeenCalledWith({
      id: 101,
      order: {
        ...params.order,
        subaccountOwner: walletAddress,
      },
      chainId: 763373,
      verifyingAddr: getOrderVerifyingAddress(1),
      productId: 1,
      spotLeverage: false,
      borrowMargin: true,
      nonce: '12345',
    });
  });

  it('forwards borrowMargin in placeOrders', async () => {
    const orders: PlaceOrderParams[] = [
      {
        id: 1,
        productId: 1,
        order: {
          subaccountName: 'default',
          amount: toBigNumber(100),
          price: toBigNumber(2000),
          expiration: toBigNumber(1000),
          appendix: 0n,
        },
        nonce: '111',
        borrowMargin: true,
      },
      {
        id: 2,
        productId: 2,
        order: {
          subaccountName: 'default',
          amount: toBigNumber(50),
          price: toBigNumber(100),
          expiration: toBigNumber(1000),
          appendix: 0n,
        },
        nonce: '222',
        spotLeverage: true,
        borrowMargin: false,
      },
    ];

    const params: PlaceOrdersParams = { orders, stopOnFailure: true };
    await api.placeOrders(params);

    expect(mockEngineClient.placeOrders).toHaveBeenCalledWith({
      orders: [
        {
          id: 1,
          order: {
            ...orders[0].order,
            subaccountOwner: walletAddress,
          },
          chainId: 763373,
          verifyingAddr: getOrderVerifyingAddress(1),
          productId: 1,
          spotLeverage: undefined,
          borrowMargin: true,
          nonce: '111',
        },
        {
          id: 2,
          order: {
            ...orders[1].order,
            subaccountOwner: walletAddress,
          },
          chainId: 763373,
          verifyingAddr: getOrderVerifyingAddress(2),
          productId: 2,
          spotLeverage: true,
          borrowMargin: false,
          nonce: '222',
        },
      ],
      stopOnFailure: true,
    });
  });

  it('forwards id and borrowMargin and preserves placeOrder subaccountOwner in cancelAndPlace', async () => {
    const params: CancelAndPlaceOrderParams = {
      cancelOrders: {
        digests: ['0xaaa'],
        productIds: [1],
        subaccountName: 'default',
      },
      placeOrder: {
        id: 999,
        productId: 1,
        order: {
          subaccountOwner: customOwner,
          subaccountName: 'isolated',
          amount: toBigNumber(10),
          price: toBigNumber(3000),
          expiration: toBigNumber(2000),
          appendix: 0n,
        },
        nonce: '555',
        spotLeverage: false,
        borrowMargin: true,
      },
      requiredUnfilledAmount: toBigNumber(500),
      placeRequiresUnfilled: true,
    };

    await api.cancelAndPlace(params);

    expect(mockEngineClient.cancelAndPlace).toHaveBeenCalledWith({
      cancelOrders: {
        digests: ['0xaaa'],
        productIds: [1],
        subaccountName: 'default',
        subaccountOwner: walletAddress,
        verifyingAddr: endpointAddress,
        chainId: 763373,
      },
      placeOrder: {
        id: 999,
        order: {
          ...params.placeOrder.order,
          subaccountOwner: customOwner,
        },
        verifyingAddr: getOrderVerifyingAddress(1),
        chainId: 763373,
        productId: 1,
        spotLeverage: false,
        borrowMargin: true,
        nonce: '555',
      },
      requiredUnfilledAmount: toBigNumber(500),
      placeRequiresUnfilled: true,
    });
  });
});
