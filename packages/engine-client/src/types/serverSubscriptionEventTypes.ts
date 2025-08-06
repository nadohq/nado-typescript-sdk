import { EngineServerPriceTickLiquidity } from './serverQueryTypes';

/**
 * Event from subscribing to a `order_update` stream.
 */
export interface EngineServerSubscriptionOrderUpdateEvent {
  timestamp: string;
  product_id: number;
  digest: string;
  amount: string;
  reason: string;
}

/**
 * Event from subscribing to a `trade` stream.
 */
export interface EngineServerSubscriptionTradeEvent {
  timestamp: string;
  product_id: number;
  price: string;
  taker_qty: string;
  maker_qty: string;
  is_taker_buyer: boolean;
}

/**
 * Event from subscribing to a `best_bid_offer` stream.
 */
export interface EngineServerSubscriptionBestBidOfferEvent {
  timestamp: string;
  product_id: number;
  bid_price: string;
  bid_qty: string;
  ask_price: string;
  ask_qty: string;
}

/**
 * Event from subscribing to a `fill` stream.
 */
export interface EngineServerSubscriptionFillEvent {
  // NOTE: `id` is excluded from the response to avoid parsing issues.
  // type of `id` on the backend is `u64` which can overflow until we introduce proper parsing on the SDK.
  timestamp: string;
  product_id: number;
  subaccount: string;
  order_digest: string;
  filled_qty: string;
  remaining_qty: string;
  price: string;
  is_taker: boolean;
}

/**
 * Event from subscribing to a `position_change` stream.
 */
export interface EngineServerSubscriptionPositionChangeEvent {
  timestamp: string;
  product_id: number;
  subaccount: string;
  amount: string;
  v_quote_amount: string;
}

/**
 * Event from subscribing to a `book_depth` stream.
 */
export interface EngineServerSubscriptionBookDepthEvent {
  min_timestamp: string;
  max_timestamp: string;
  product_id: number;
  bids: EngineServerPriceTickLiquidity[];
  asks: EngineServerPriceTickLiquidity[];
}
