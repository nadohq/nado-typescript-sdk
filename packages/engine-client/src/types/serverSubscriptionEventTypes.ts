import { EngineServerPriceTickLiquidity } from './serverQueryTypes';

export interface EngineServerSubscriptionBaseEvent {
  type:
    | 'trade'
    | 'best_bid_offer'
    | 'book_depth'
    | 'fill'
    | 'position_change'
    | 'order_update'
    | 'latest_candlestick';
  product_id: number;
}

/**
 * Event from subscribing to a `trade` stream.
 */
export interface EngineServerSubscriptionTradeEvent
  extends EngineServerSubscriptionBaseEvent {
  type: 'trade';
  timestamp: string;
  price: string;
  taker_qty: string;
  maker_qty: string;
  is_taker_buyer: boolean;
}

/**
 * Event from subscribing to a `best_bid_offer` stream.
 */
export interface EngineServerSubscriptionBestBidOfferEvent
  extends EngineServerSubscriptionBaseEvent {
  type: 'best_bid_offer';
  timestamp: string;
  bid_price: string;
  bid_qty: string;
  ask_price: string;
  ask_qty: string;
}

/**
 * Event from subscribing to a `book_depth` stream.
 */
export interface EngineServerSubscriptionBookDepthEvent
  extends EngineServerSubscriptionBaseEvent {
  type: 'book_depth';
  last_max_timestamp: string;
  min_timestamp: string;
  max_timestamp: string;
  bids: EngineServerPriceTickLiquidity[];
  asks: EngineServerPriceTickLiquidity[];
}

/**
 * Event from subscribing to a `fill` stream.
 */
export interface EngineServerSubscriptionFillEvent
  extends EngineServerSubscriptionBaseEvent {
  type: 'fill';
  timestamp: string;
  subaccount: string;
  order_digest: string;
  id?: string;
  filled_qty: string;
  remaining_qty: string;
  original_qty: string;
  price: string;
  is_taker: boolean;
  is_bid: boolean;
  fee: string;
  submission_idx: string;
}

/**
 * Event from subscribing to a `position_change` stream.
 */
export interface EngineServerSubscriptionPositionChangeEvent
  extends EngineServerSubscriptionBaseEvent {
  type: 'position_change';
  timestamp: string;
  subaccount: string;
  amount: string;
  v_quote_amount: string;
  reason: string;
}

/**
 * Event from subscribing to an `order_update` stream.
 */
export interface EngineServerSubscriptionOrderUpdateEvent
  extends EngineServerSubscriptionBaseEvent {
  type: 'order_update';
  timestamp: string;
  digest: string;
  id?: string;
  amount: string;
  reason: string;
}

/**
 * Event from subscribing to a `latest_candlestick` stream.
 */
export interface EngineServerSubscriptionLatestCandlestickEvent
  extends EngineServerSubscriptionBaseEvent {
  type: 'latest_candlestick';
  timestamp: string;
  granularity: number;
  open_x18: string;
  high_x18: string;
  low_x18: string;
  close_x18: string;
  volume: string;
}
