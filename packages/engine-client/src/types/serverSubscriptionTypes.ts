export interface EngineServerOrderUpdateStreamParams {
  product_id: number;
  subaccount: string;
}

export interface EngineServerTradeStreamParams {
  product_id: number;
}

export interface EngineServerBestBidOfferStreamParams {
  product_id: number;
}

export interface EngineServerFillStreamParams {
  product_id: number;
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
 * Available actions on the subscription API.
 */
export interface EngineServerSubscriptionRequestByType {
  subscribe: EngineServerSubscriptionParams;
  unsubscribe: EngineServerSubscriptionParams;
  list: Record<string, never>;
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
