import {
  EngineServerQueryRequest,
  EngineServerQueryRequestByType,
  EngineServerQueryRequestType,
} from '@nadohq/engine-client';
import { BaseNadoAPI } from '../base';

/**
 * Builds query messages as expected by the server to send over Websocket.
 * @example nadoClient.ws.query.buildQueryMessage('all_products', {})
 */
export class WebSocketQueryAPI extends BaseNadoAPI {
  /**
   * Builds a query request message as expected by the server via Websocket.
   * @param requestType
   * @param params
   * @returns query request message.
   */
  public buildQueryMessage<TRequestType extends EngineServerQueryRequestType>(
    requestType: TRequestType,
    params: EngineServerQueryRequestByType[TRequestType],
  ): EngineServerQueryRequest<TRequestType> {
    return this.context.engineClient.getQueryRequest(requestType, params);
  }
}
