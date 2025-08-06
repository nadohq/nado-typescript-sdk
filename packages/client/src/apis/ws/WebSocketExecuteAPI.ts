import { EIP712OrderParams } from '@nadohq/contracts';
import {
  EngineExecuteRequestParamsByType,
  WithSignature,
} from '@nadohq/engine-client';
import { BaseNadoAPI } from '../base';

/**
 * Builds execute messages as expected by the server to send over Websocket.
 * @example nadoClient.ws.execute.buildPlaceOrderMessage(...)
 */
export class WebSocketExecuteAPI extends BaseNadoAPI {
  /**
   * Builds ws message for the `liquidate_subaccount` execute action.
   * @param params LiquidateSubaccount params.
   * @returns `liquidate_subaccount` execute message
   */
  async buildLiquidateSubaccountMessage(
    params: EngineExecuteRequestParamsByType['liquidate_subaccount'],
  ) {
    return this.context.engineClient.payloadBuilder.buildLiquidateSubaccountPayload(
      params,
    );
  }

  /**
   * Builds ws message for the `withdraw_collateral` execute action.
   * @param params WithdrawCollateral params.
   * @returns `liquidate_subaccount` execute message
   */
  async buildWithdrawCollateralMessage(
    params: EngineExecuteRequestParamsByType['withdraw_collateral'],
  ) {
    return this.context.engineClient.payloadBuilder.buildWithdrawCollateralPayload(
      params,
    );
  }

  /**
   * Builds ws message for the `place_order` execute action.
   * @param params PlaceOrder params.
   * @returns `place_order` execute message
   */
  buildPlaceOrderMessage(
    params: WithSignature<
      EngineExecuteRequestParamsByType['place_order'] & {
        order: EIP712OrderParams;
      }
    >,
  ) {
    return this.context.engineClient.payloadBuilder.buildPlaceOrderPayloadSync(
      params,
    );
  }

  /**
   * Builds ws message for the `cancel_orders` execute action.
   * @param params PlaceOrder params.
   * @returns `cancel_orders` execute message
   */
  buildCancelOrdersMessage(
    params: WithSignature<
      EngineExecuteRequestParamsByType['cancel_orders'] & { nonce: string }
    >,
  ) {
    return this.context.engineClient.payloadBuilder.buildCancelOrdersPayloadSync(
      params,
    );
  }
}
