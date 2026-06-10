export interface EngineServerOrderUpdateStreamParams {
  /** when not provided, subscribes to all products */
  product_id?: number;
  subaccount: string;
}

export interface EngineServerTradeStreamParams {
  product_id: number;
}

export interface EngineServerBestBidOfferStreamParams {
  product_id: number;
}

export interface EngineServerFillStreamParams {
  /** when not provided, subscribes to all products */
  product_id?: number;
  subaccount: string;
}

export interface EngineServerPositionChangeStreamParams {
  /** when not provided, subscribes to all products */
  product_id?: number;
  subaccount: string;
}

export interface EngineServerBookDepthStreamParams {
  product_id: number;
}

export interface EngineServerLatestCandlestickStreamParams {
  product_id: number;
  granularity: number;
}

export interface EngineServerLiquidationStreamParams {
  /** when not provided, subscribes to all products */
  product_id?: number;
}

export interface EngineServerFundingPaymentStreamParams {
  product_id: number;
}

export interface EngineServerFundingRateStreamParams {
  /** when not provided, subscribes to all products */
  product_id?: number;
}

/**
 * The `all_bbo` stream pushes a full-market top-of-book snapshot on a fixed
 * cadence, so it takes no params.
 */
export type EngineServerAllBboStreamParams = Record<string, never>;

/**
 * Available subscription streams
 */
export interface EngineServerSubscriptionStreamParamsByType {
  order_update: EngineServerOrderUpdateStreamParams;
  trade: EngineServerTradeStreamParams;
  best_bid_offer: EngineServerBestBidOfferStreamParams;
  fill: EngineServerFillStreamParams;
  position_change: EngineServerPositionChangeStreamParams;
  book_depth: EngineServerBookDepthStreamParams;
  liquidation: EngineServerLiquidationStreamParams;
  latest_candlestick: EngineServerLatestCandlestickStreamParams;
  funding_payment: EngineServerFundingPaymentStreamParams;
  funding_rate: EngineServerFundingRateStreamParams;
  all_bbo: EngineServerAllBboStreamParams;
}

export type EngineServerSubscriptionStreamParamsType =
  keyof EngineServerSubscriptionStreamParamsByType;

/**
 * Describes a stream that can be subscribed to.
 */
export type EngineServerSubscriptionStream<
  TStreamType extends EngineServerSubscriptionStreamParamsType,
> = {
  type: TStreamType;
} & EngineServerSubscriptionStreamParamsByType[TStreamType];

/**
 * Params to provide to a `subscribe` / `unsubscribe` action.
 */
export interface EngineServerSubscriptionParams {
  stream: EngineServerSubscriptionStream<EngineServerSubscriptionStreamParamsType>;
}

/**
 * Params to provide to a `ping` control message.
 */
export interface EngineServerPingParams {
  /**
   * Optional client timestamp (epoch milliseconds, as a string). When provided,
   * it is echoed back in the `pong` response so round-trip latency and clock
   * offset can be measured.
   */
  client_time?: string;
}

/**
 * Available actions on the subscription API.
 *
 * Alongside the `subscribe` / `unsubscribe` / `list` actions, the socket also
 * answers two control messages - `ping` and `time` - for measuring latency and
 * aligning clocks. These are request/response (not streams) and require no
 * authentication.
 */
export interface EngineServerSubscriptionRequestByType {
  subscribe: EngineServerSubscriptionParams;
  unsubscribe: EngineServerSubscriptionParams;
  list: Record<string, never>;
  ping: EngineServerPingParams;
  time: Record<string, never>;
}

export type EngineServerSubscriptionRequestType =
  keyof EngineServerSubscriptionRequestByType;

/**
 * Top level request to send to the server.
 */
export type EngineServerSubscriptionRequest<
  TRequestType extends EngineServerSubscriptionRequestType,
> = {
  id: number;
  method: TRequestType;
} & EngineServerSubscriptionRequestByType[TRequestType];

/**
 * Response to a `ping` control message.
 */
export interface EngineServerSubscriptionPingResponse {
  result: {
    method: 'pong';
    /** Server time when the response was generated (epoch milliseconds, as a string). */
    server_time: string;
    /** Echoes back the `client_time` from the request, when one was provided. */
    client_time: string;
  };
  /** Echoes back the client-provided ID. */
  id: number;
}

/**
 * Response to a `time` control message.
 */
export interface EngineServerSubscriptionTimeResponse {
  result: {
    method: 'time';
    /** Current server time (epoch milliseconds, as a string). */
    server_time: string;
  };
  /** Echoes back the client-provided ID. */
  id: number;
}
