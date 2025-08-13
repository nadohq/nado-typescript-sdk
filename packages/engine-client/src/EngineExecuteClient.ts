import { EngineBaseClient, EngineClientOpts } from './EngineBaseClient';
import { EngineExecuteBuilder } from './EngineExecuteBuilder';
import {
  EngineExecuteRequestParamsByType,
  EnginePlaceOrderResult,
} from './types';

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

  async placeOrder(
    params: EngineExecuteRequestParamsByType['place_order'],
  ): Promise<EnginePlaceOrderResult> {
    const placeOrderPayload =
      await this.payloadBuilder.buildPlaceOrderPayload(params);
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

  async transferQuote(
    params: EngineExecuteRequestParamsByType['transfer_quote'],
  ) {
    return this.execute(
      'transfer_quote',
      await this.payloadBuilder.buildTransferQuotePayload(params),
    );
  }

  async mintVlp(params: EngineExecuteRequestParamsByType['mint_vlp']) {
    return this.execute(
      'mint_vlp',
      await this.payloadBuilder.buildMintVlpPayload(params),
    );
  }

  async burnVlp(params: EngineExecuteRequestParamsByType['burn_vlp']) {
    return this.execute(
      'burn_vlp',
      await this.payloadBuilder.buildBurnVlpPayload(params),
    );
  }

  async placeOrders(params: EngineExecuteRequestParamsByType['place_orders']) {
    return this.execute(
      'place_orders',
      await this.payloadBuilder.buildPlaceOrdersPayload(params),
    );
  }
}
