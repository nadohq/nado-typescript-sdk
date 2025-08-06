import { NadoClientContext } from '../../context';
import { BaseNadoAPI } from '../base';
import { WebSocketExecuteAPI } from './WebSocketExecuteAPI';
import { WebSocketQueryAPI } from './WebSocketQueryAPI';
import { WebSocketSubscriptionAPI } from './WebSocketSubscriptionAPI';

/**
 * Builds ws messages as expected by the server to send over Websocket.
 */
export class WebsocketAPI extends BaseNadoAPI {
  readonly query: WebSocketQueryAPI;
  readonly execute: WebSocketExecuteAPI;
  readonly subscription: WebSocketSubscriptionAPI;

  constructor(context: NadoClientContext) {
    super(context);
    this.query = new WebSocketQueryAPI(context);
    this.execute = new WebSocketExecuteAPI(context);
    this.subscription = new WebSocketSubscriptionAPI(context);
  }
}
