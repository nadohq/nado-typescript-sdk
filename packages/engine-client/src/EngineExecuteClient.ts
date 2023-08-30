import {
  EngineExecutePlaceOrderResult,
  EngineExecuteRequestParamsByType,
} from './types';
import { EngineExecuteBuilder } from './EngineExecuteBuilder';
import { EngineBaseClient, EngineClientOpts } from './EngineBaseClient';
import { getOrderDigest, OrderParams } from '@vertex-protocol/contracts';
import { BigNumberish } from 'ethers';

export class EngineExecuteClient extends EngineBaseClient {
  readonly payloadBuilder: EngineExecuteBuilder;

  constructor(opts: EngineClientOpts) {
    super(opts);
    this.payloadBuilder = new EngineExecuteBuilder(this);
  }

  async liquidateSubaccount(
    params: EngineExecuteRequestParamsByType['liquidate_subaccount'],
  ) {
    return this.execute(
      'liquidate_subaccount',
      await this.payloadBuilder.buildLiquidateSubaccountPayload(params),
    );
  }

  async withdrawCollateral(
    params: EngineExecuteRequestParamsByType['withdraw_collateral'],
  ) {
    return this.execute(
      'withdraw_collateral',
      await this.payloadBuilder.buildWithdrawCollateralPayload(params),
    );
  }

  async mintLp(params: EngineExecuteRequestParamsByType['mint_lp']) {
    return this.execute(
      'mint_lp',
      await this.payloadBuilder.buildMintLpPayload(params),
    );
  }

  async burnLp(params: EngineExecuteRequestParamsByType['burn_lp']) {
    return this.execute(
      'burn_lp',
      await this.payloadBuilder.buildBurnLpPayload(params),
    );
  }

  async placeOrder(
    params: EngineExecuteRequestParamsByType['place_order'],
  ): Promise<EngineExecutePlaceOrderResult> {
    const placeOrderPayload = await this.payloadBuilder.buildPlaceOrderPayload(
      params,
    );
    return {
      ...(await this.execute('place_order', placeOrderPayload.payload)),
      orderParams: placeOrderPayload.orderParams,
    };
  }

  async cancelOrders(
    params: EngineExecuteRequestParamsByType['cancel_orders'],
  ) {
    return this.execute(
      'cancel_orders',
      await this.payloadBuilder.buildCancelOrdersPayload(params),
    );
  }

  async cancelAndPlace(
    params: EngineExecuteRequestParamsByType['cancel_and_place'],
  ) {
    const cancelOrdersPayload =
      await this.payloadBuilder.buildCancelOrdersPayload(params.cancelOrders);
    const placeOrderPayload = await this.payloadBuilder.buildPlaceOrderPayload(
      params.placeOrder,
    );
    return this.execute('cancel_and_place', {
      cancel_tx: cancelOrdersPayload.tx,
      cancel_signature: cancelOrdersPayload.signature,
      place_order: placeOrderPayload.payload,
    });
  }

  async cancelProductOrders(
    params: EngineExecuteRequestParamsByType['cancel_product_orders'],
  ) {
    return this.execute(
      'cancel_product_orders',
      await this.payloadBuilder.buildCancelProductOrdersPayload(params),
    );
  }

  async linkSigner(params: EngineExecuteRequestParamsByType['link_signer']) {
    return this.execute(
      'link_signer',
      await this.payloadBuilder.buildLinkSignerPayload(params),
    );
  }

  getOrderDigest(
    order: OrderParams,
    verifyingAddr: string,
    chainId: BigNumberish,
  ): string {
    return getOrderDigest({
      chainId,
      order,
      verifyingAddr,
    });
  }

  // TODO: settle PNL
}
