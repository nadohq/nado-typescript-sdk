import {
  EngineServerSubscriptionRequest,
  EngineServerSubscriptionRequestByType,
  EngineServerSubscriptionRequestType,
  EngineServerSubscriptionStream,
  EngineServerSubscriptionStreamParamsByType,
  EngineServerSubscriptionStreamParamsType,
} from '@nadohq/engine-client';
import { BaseNadoAPI } from '../base';

/**
 * Builds subscription messages as expected by the server to send over Websocket.
 *
 * @example
 * const tradeSubscriptionParams = nadoClient.ws.subscription.buildSubscriptionParams('trade', ...);
 * const tradeSubscriptionMessage = nadoClient.ws.subscription.buildSubscriptionMessage(
 *    'subscribe', tradeSubscriptionParams);
 */
export class WebSocketSubscriptionAPI extends BaseNadoAPI {
  /**
   * Builds a subscription request message as expected by the server via Websocket.
   * @param requestType name of request to build message for.
   * @param id identifier to associate messages with responses.
   * @param params request message params.
   * @returns subscription request message.
   */
  public buildSubscriptionMessage<
    TRequestType extends EngineServerSubscriptionRequestType,
  >(
    id: number,
    requestType: TRequestType,
    params: EngineServerSubscriptionRequestByType[TRequestType],
  ): EngineServerSubscriptionRequest<TRequestType> {
    return {
      id,
      method: requestType,
      ...params,
    };
  }

  /**
   * Builds a subscription stream param as expected by the server via Websocket.
   * @param streamType name of stream to build params for.
   * @param params
   * @returns subscription stream params.
   */
  public buildSubscriptionParams<
    TStreamType extends EngineServerSubscriptionStreamParamsType,
  >(
    streamType: TStreamType,
    params: EngineServerSubscriptionStreamParamsByType[TStreamType],
  ): {
    stream: EngineServerSubscriptionStream<TStreamType>;
  } {
    return {
      stream: {
        type: streamType,
        ...params,
      },
    };
  }
}
