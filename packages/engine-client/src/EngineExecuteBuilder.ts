import {
  EIP712IsolatedOrderParams,
  EIP712OrderParams,
  getNadoEIP712Values,
  getOrderNonce,
  SignableRequestType,
  SignableRequestTypeToParams,
} from '@nadohq/contracts';
import { EngineBaseClient } from './EngineBaseClient';
import {
  EngineExecuteRequestParamsByType,
  EngineServerExecutePlaceIsolatedOrderPayload,
  EngineServerExecutePlaceOrderPayload,
  EngineServerExecuteRequestByType,
  SignatureParams,
  WithBaseEngineExecuteParams,
  WithSignature,
} from './types';

/**
 * Builds execute payloads as expected by the server.
 * @param nonce A nonce is computed when one is not provided.
 * @param signature A signature is computed when one is not provided.
 */
export class EngineExecuteBuilder {
  readonly engineClient: EngineBaseClient;

  constructor(engineClient: EngineBaseClient) {
    this.engineClient = engineClient;
  }

  /**
   * Builds server payload for the `liquidate_subaccount` execute action.
   * @param clientParams Client LiquidateSubaccount params.
   * @returns `liquidate_subaccount` payload
   */
  async buildLiquidateSubaccountPayload(
    clientParams: EngineExecuteRequestParamsByType['liquidate_subaccount'],
  ): Promise<EngineServerExecuteRequestByType['liquidate_subaccount']> {
    const nonce = await this.getTxNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };

    const tx = getNadoEIP712Values('liquidate_subaccount', paramsWithNonce);
    const signature = await this.getSignatureIfNeeded(
      'liquidate_subaccount',
      paramsWithNonce,
    );

    return {
      signature,
      tx,
    };
  }

  /**
   * Builds server payload for the `withdraw_collateral` execute action.
   * @param clientParams Client WithdrawCollateral params.
   * @returns `liquidate_subaccount` payload
   */
  async buildWithdrawCollateralPayload(
    clientParams: EngineExecuteRequestParamsByType['withdraw_collateral'],
  ): Promise<EngineServerExecuteRequestByType['withdraw_collateral']> {
    const nonce = await this.getTxNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };

    const signature = await this.getSignatureIfNeeded(
      'withdraw_collateral',
      paramsWithNonce,
    );

    const tx = getNadoEIP712Values('withdraw_collateral', paramsWithNonce);
    return {
      signature,
      tx,
      spot_leverage: clientParams.spotLeverage ?? null,
    };
  }

  /**
   * Builds server payload for the `place_order` execute action.
   *
   * @param clientParams Client PlaceOrder params.
   * @returns `place_order` payload
   */
  async buildPlaceOrderPayload(
    clientParams: EngineExecuteRequestParamsByType['place_order'],
  ): Promise<EngineServerExecutePlaceOrderPayload> {
    const nonce = this.getOrderNonceIfNeeded(clientParams);
    const orderWithNonce = { ...clientParams.order, nonce };

    const signature = await this.getSignatureIfNeeded('place_order', {
      // Gets expected type
      ...clientParams,
      ...orderWithNonce,
    });

    return this.buildPlaceOrderPayloadSync({
      ...clientParams,
      order: orderWithNonce,
      signature,
    });
  }

  /**
   * Synchronously builds server payload for the `place_order` execute action.
   *
   * @param clientParams Client PlaceOrder params.
   * @returns `place_order` payload
   */
  buildPlaceOrderPayloadSync(
    clientParams: WithSignature<
      EngineExecuteRequestParamsByType['place_order'] & {
        order: EIP712OrderParams;
      }
    >,
  ): EngineServerExecutePlaceOrderPayload {
    const orderEIP712Values = getNadoEIP712Values(
      'place_order',
      clientParams.order,
    );

    return {
      payload: {
        id: clientParams.id ?? null,
        product_id: clientParams.productId,
        order: orderEIP712Values,
        signature: clientParams.signature,
        spot_leverage: clientParams.spotLeverage ?? null,
      },
      orderParams: clientParams.order,
    };
  }

  /**
   * Builds server payload for the `place_isolated_order` execute action.
   *
   * @param clientParams Client PlaceIsolatedOrder params.
   * @returns `place_isolated_order` payload
   */
  async buildIsolatedPlaceOrderPayload(
    clientParams: EngineExecuteRequestParamsByType['place_isolated_order'],
  ): Promise<EngineServerExecutePlaceIsolatedOrderPayload> {
    const nonce = this.getOrderNonceIfNeeded(clientParams);
    const orderWithNonce = { ...clientParams.order, nonce };

    const signature = await this.getSignatureIfNeeded('place_isolated_order', {
      // Gets expected type
      ...clientParams,
      ...orderWithNonce,
    });

    return this.buildPlaceIsolatedOrderPayloadSync({
      ...clientParams,
      order: orderWithNonce,
      signature,
    });
  }

  /**
   * Synchronously builds server payload for the `place_isolated_order` execute action.
   *
   * @param clientParams Client PlaceIsolatedOrder params.
   * @returns `place_isolated_order` payload
   */
  buildPlaceIsolatedOrderPayloadSync(
    clientParams: WithSignature<
      EngineExecuteRequestParamsByType['place_isolated_order'] & {
        order: EIP712IsolatedOrderParams;
      }
    >,
  ): EngineServerExecutePlaceIsolatedOrderPayload {
    const isolatedOrderEIP712Values = getNadoEIP712Values(
      'place_isolated_order',
      clientParams.order,
    );

    return {
      payload: {
        id: clientParams.id ?? null,
        product_id: clientParams.productId,
        isolated_order: isolatedOrderEIP712Values,
        signature: clientParams.signature,
        borrow_margin: clientParams.borrowMargin ?? null,
      },
      orderParams: clientParams.order,
    };
  }

  /**
   * Builds server payload for the `cancel_orders` execute action. As such, requires a signature to be given
   *
   * @param clientParams Client CancelOrders params.
   * @returns `cancel_orders` payload
   */
  async buildCancelOrdersPayload(
    clientParams: EngineExecuteRequestParamsByType['cancel_orders'],
  ): Promise<EngineServerExecuteRequestByType['cancel_orders']> {
    const nonce = this.getOrderNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };
    const signature = await this.getSignatureIfNeeded(
      'cancel_orders',
      paramsWithNonce,
    );

    return this.buildCancelOrdersPayloadSync({
      ...paramsWithNonce,
      signature,
    });
  }

  /**
   * Synchronously builds server payload for the `cancel_orders` execute action.
   *
   * @param clientParams Client CancelOrders params.
   * @returns `cancel_orders` payload
   */
  buildCancelOrdersPayloadSync(
    clientParams: WithSignature<
      EngineExecuteRequestParamsByType['cancel_orders'] & { nonce: string }
    >,
  ): EngineServerExecuteRequestByType['cancel_orders'] {
    const tx = getNadoEIP712Values('cancel_orders', clientParams);

    return {
      tx,
      signature: clientParams.signature,
    };
  }

  /**
   * Builds server payload for the `cancel_product_orders` execute action.
   * @param clientParams Client CancelProductOrders params.
   * @returns `cancel_product_orders` payload
   */
  async buildCancelProductOrdersPayload(
    clientParams: EngineExecuteRequestParamsByType['cancel_product_orders'],
  ): Promise<EngineServerExecuteRequestByType['cancel_product_orders']> {
    const nonce = this.getOrderNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };

    const tx = getNadoEIP712Values('cancel_product_orders', paramsWithNonce);
    const signature = await this.getSignatureIfNeeded(
      'cancel_product_orders',
      paramsWithNonce,
    );

    return {
      tx,
      signature,
    };
  }

  /**
   * Builds server payload for the `link_signer` execute action.
   *
   * @param clientParams Client LinkSigner params.
   * @returns `link_signer` payload
   */
  async buildLinkSignerPayload(
    clientParams: EngineExecuteRequestParamsByType['link_signer'],
  ): Promise<EngineServerExecuteRequestByType['link_signer']> {
    const nonce = await this.getTxNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };

    const tx = getNadoEIP712Values('link_signer', paramsWithNonce);
    const signature = await this.getSignatureIfNeeded(
      'link_signer',
      paramsWithNonce,
    );

    return {
      tx,
      signature,
    };
  }

  /**
   * Builds server payload for the `transfer_quote` execute action.
   *
   * @param clientParams Client TransferQuote params.
   * @returns `transfer_quote` payload
   */
  async buildTransferQuotePayload(
    clientParams: EngineExecuteRequestParamsByType['transfer_quote'],
  ): Promise<EngineServerExecuteRequestByType['transfer_quote']> {
    const nonce = await this.getTxNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };

    const tx = getNadoEIP712Values('transfer_quote', paramsWithNonce);
    const signature = await this.getSignatureIfNeeded(
      'transfer_quote',
      paramsWithNonce,
    );

    return {
      tx,
      signature,
    };
  }

  /**
   * Builds server payload for the `mint_vlp` execute action.
   * @param clientParams Client MintVlp params.
   * @returns `mint_vlp` payload
   */
  async buildMintVlpPayload(
    clientParams: EngineExecuteRequestParamsByType['mint_vlp'],
  ): Promise<EngineServerExecuteRequestByType['mint_vlp']> {
    const nonce = await this.getTxNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };

    const tx = getNadoEIP712Values('mint_vlp', paramsWithNonce);
    const signature = await this.getSignatureIfNeeded(
      'mint_vlp',
      paramsWithNonce,
    );

    return {
      signature,
      tx,
      spot_leverage: clientParams.spotLeverage ?? null,
    };
  }

  /**
   * Builds server payload for the `burn_vlp` execute action.
   * @param clientParams Client BurnVlp params.
   * @returns `burn_vlp` payload
   */
  async buildBurnVlpPayload(
    clientParams: EngineExecuteRequestParamsByType['burn_vlp'],
  ): Promise<EngineServerExecuteRequestByType['burn_vlp']> {
    const nonce = await this.getTxNonceIfNeeded(clientParams);
    const paramsWithNonce = { ...clientParams, nonce };

    const tx = getNadoEIP712Values('burn_vlp', paramsWithNonce);
    const signature = await this.getSignatureIfNeeded(
      'burn_vlp',
      paramsWithNonce,
    );

    return {
      signature,
      tx,
    };
  }

  protected async getSignatureIfNeeded<T extends SignableRequestType>(
    requestType: T,
    paramsWithNonce: SignatureParams & SignableRequestTypeToParams[T],
  ) {
    if ('signature' in paramsWithNonce) {
      return paramsWithNonce.signature;
    }

    return await this.engineClient.sign(
      requestType,
      paramsWithNonce.verifyingAddr,
      paramsWithNonce.chainId,
      paramsWithNonce,
    );
  }

  protected async getTxNonceIfNeeded(
    params: WithBaseEngineExecuteParams<{ subaccountOwner: string }>,
  ) {
    if (params.nonce) {
      return params.nonce;
    }
    return await this.engineClient.getTxNonce(params.subaccountOwner);
  }

  protected getOrderNonceIfNeeded(
    params: WithBaseEngineExecuteParams<unknown>,
  ) {
    if (params.nonce) {
      return params.nonce;
    }
    return getOrderNonce();
  }
}
