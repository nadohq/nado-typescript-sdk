import { getOrderVerifyingAddress } from '@nadohq/contracts';
import { BaseNadoAPI } from '../base';
import {
  CancelAndPlaceOrderParams,
  CancelOrdersParams,
  CancelProductOrdersParams,
  CancelTriggerOrdersParams,
  CancelTriggerProductOrdersParams,
  PlaceOrderParams,
  PlaceTriggerOrderParams,
} from './types';

export class MarketExecuteAPI extends BaseNadoAPI {
  /**
   * Places an order through the engine
   * @param params
   */
  async placeOrder(params: PlaceOrderParams) {
    const { id: orderId, productId, order, nonce } = params;

    return this.context.engineClient.placeOrder({
      id: orderId,
      order: {
        ...order,
        subaccountOwner: this.getSubaccountOwnerIfNeeded(params.order),
      },
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: getOrderVerifyingAddress(params.productId),
      productId,
      spotLeverage: params.spotLeverage,
      nonce,
    });
  }

  /**
   * Cancels orders through the engine
   * @param params
   */
  async cancelOrders(params: CancelOrdersParams) {
    return this.context.engineClient.cancelOrders({
      ...params,
      chainId: this.getWalletClientChainIdIfNeeded(params),
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: this.getEndpointAddress(),
    });
  }

  /**
   * Cancels orders through the engine and places a new one
   * @param params
   */
  async cancelAndPlace(params: CancelAndPlaceOrderParams) {
    const { productId, order, nonce, spotLeverage } = params.placeOrder;
    const subaccountOwner = this.getSubaccountOwnerIfNeeded(
      params.cancelOrders,
    );
    const chainId = this.getWalletClientChainIdIfNeeded(params.cancelOrders);

    return this.context.engineClient.cancelAndPlace({
      cancelOrders: {
        ...params.cancelOrders,
        subaccountOwner,
        verifyingAddr:
          params.cancelOrders.verifyingAddr ?? this.getEndpointAddress(),
        chainId,
      },
      placeOrder: {
        order: {
          ...order,
          subaccountOwner,
        },
        verifyingAddr: getOrderVerifyingAddress(productId),
        chainId,
        productId,
        spotLeverage,
        nonce,
      },
    });
  }

  /**
   * Cancels all orders for provided products through the engine.
   * @param params
   */
  async cancelProductOrders(params: CancelProductOrdersParams) {
    return this.context.engineClient.cancelProductOrders({
      ...params,
      chainId: this.getWalletClientChainIdIfNeeded(params),
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: this.getEndpointAddress(),
    });
  }

  /**
   * Places a trigger order through the trigger service
   * @param params
   */
  async placeTriggerOrder(params: PlaceTriggerOrderParams) {
    return this.context.triggerClient.placeTriggerOrder({
      ...params,
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: getOrderVerifyingAddress(params.productId),
      order: {
        subaccountOwner: this.getSubaccountOwnerIfNeeded(params.order),
        ...params.order,
      },
    });
  }

  /**
   * Cancels all trigger orders for provided digests through the trigger service.
   * @param params
   */
  async cancelTriggerOrders(params: CancelTriggerOrdersParams) {
    return this.context.triggerClient.cancelTriggerOrders({
      ...params,
      chainId: this.getWalletClientChainIdIfNeeded(params),
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  /**
   * Cancels all trigger orders for provided products through the trigger service.
   * @param params
   */
  async cancelTriggerProductOrders(params: CancelTriggerProductOrdersParams) {
    return this.context.triggerClient.cancelProductOrders({
      ...params,
      chainId: this.getWalletClientChainIdIfNeeded(params),
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }
}
