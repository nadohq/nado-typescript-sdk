import { toIntegerString } from '@nadohq/shared';
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

  async withdrawCollateralV2(
    params: EngineExecuteRequestParamsByType['withdraw_collateral_v2'],
  ) {
    return this.execute(
      'withdraw_collateral_v2',
      await this.payloadBuilder.buildWithdrawCollateralV2Payload(params),
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

  async placeOrders(params: EngineExecuteRequestParamsByType['place_orders']) {
    return this.execute(
      'place_orders',
      await this.payloadBuilder.buildPlaceOrdersPayload(params),
    );
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
      required_unfilled_amount: params.requiredUnfilledAmount
        ? toIntegerString(params.requiredUnfilledAmount)
        : undefined,
      place_requires_unfilled: params.placeRequiresUnfilled,
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

  /**
   * Transfers quote between subaccounts under the same wallet, charged a dynamic fee of at most
   * the V1 transfer fee. The fee is priced at execution: if it exceeds `maxFeeX18`, the request
   * fails with `FEE_TOO_LOW` (2135). Use {@link EngineQueryClient.getDynamicFeeQuote} for the
   * current fee.
   * @param params
   * @returns The execute result, throwing an `EngineServerFailureError` on failure.
   */
  async transferQuoteV2(
    params: EngineExecuteRequestParamsByType['transfer_quote_v2'],
  ) {
    return this.execute(
      'transfer_quote_v2',
      await this.payloadBuilder.buildTransferQuoteV2Payload(params),
    );
  }

  async mintNlp(params: EngineExecuteRequestParamsByType['mint_nlp']) {
    return this.execute(
      'mint_nlp',
      await this.payloadBuilder.buildMintNlpPayload(params),
    );
  }

  async burnNlp(params: EngineExecuteRequestParamsByType['burn_nlp']) {
    return this.execute(
      'burn_nlp',
      await this.payloadBuilder.buildBurnNlpPayload(params),
    );
  }
}
