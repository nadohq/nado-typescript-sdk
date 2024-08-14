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
  product_id: number;
  subaccount: string;
}

export interface EngineServerBookDepthStreamParams {
  product_id: number;
}

/**
 * Available subscription streams
 */
export interface EngineServerSubscriptionStreamParamsByType {
  trade: EngineServerTradeStreamParams;
  best_bid_offer: EngineServerBestBidOfferStreamParams;
  fill: EngineServerFillStreamParams;
  position_change: EngineServerPositionChangeStreamParams;
  book_depth: EngineServerBookDepthStreamParams;
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
