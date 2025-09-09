import { EngineServerPriceTickLiquidity } from './serverQueryTypes';

/**
 * Reasons that can trigger position change events.
 */
export type PositionChangeReason =
  | 'deposit_collateral'
  | 'match_orders'
  | 'withdraw_collateral'
  | 'transfer_quote'
  | 'settle_pnl'
  | 'mint_nlp'
  | 'burn_nlp'
  | 'liquidate_subaccount';

/**
 * Possible reasons for order updates.
 */
export type OrderUpdateReason = 'cancelled' | 'filled' | 'placed';

export type EngineServerSubscriptionEventType =
  | 'trade'
  | 'best_bid_offer'
  | 'book_depth'
  | 'fill'
  | 'position_change'
  | 'order_update'
  | 'liquidation'
  | 'latest_candlestick'
  | 'funding_payment';

export interface EngineServerSubscriptionBaseEvent<
  T extends
    EngineServerSubscriptionEventType = EngineServerSubscriptionEventType,
> {
  type: T;
  product_id: number;
}

/**
 * Event from subscribing to a `trade` stream.
 */
export interface EngineServerSubscriptionTradeEvent
  extends EngineServerSubscriptionBaseEvent<'trade'> {
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
  extends EngineServerSubscriptionBaseEvent<'best_bid_offer'> {
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
  extends EngineServerSubscriptionBaseEvent<'book_depth'> {
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
  extends EngineServerSubscriptionBaseEvent<'fill'> {
  // NOTE: `id` is excluded from the response to avoid parsing issues.
  // type of `id` on the backend is `u64` which can overflow until we introduce proper parsing on the SDK.
  timestamp: string;
  subaccount: string;
  order_digest: string;
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
  extends EngineServerSubscriptionBaseEvent<'position_change'> {
  timestamp: string;
  subaccount: string;
  amount: string;
  /** Zero for everything except perps */
  v_quote_amount: string;
  reason: PositionChangeReason;
}

/**
 * Event from subscribing to an `order_update` stream.
 */
export interface EngineServerSubscriptionOrderUpdateEvent
  extends EngineServerSubscriptionBaseEvent<'order_update'> {
  timestamp: string;
  digest: string;
  amount: string;
  reason: OrderUpdateReason;
}

/**
 * Event from subscribing to a `liquidation` stream.
 */
export interface EngineServerSubscriptionLiquidationEvent
  extends EngineServerSubscriptionBaseEvent<'liquidation'> {
  timestamp: string;
  /** Single element for regular liquidations, two elements for spread liquidations [spotId, perpId] */
  product_ids: number[];
  liquidator: string;
  liquidatee: string;
  /** Amount liquidated (positive for long, negative for short) */
  amount: string;
  /** Price at which liquidation occurred */
  price: string;
}

/**
 * Event from subscribing to a `latest_candlestick` stream.
 */
export interface EngineServerSubscriptionLatestCandlestickEvent
  extends EngineServerSubscriptionBaseEvent<'latest_candlestick'> {
  timestamp: string;
  granularity: number;
  open_x18: string;
  high_x18: string;
  low_x18: string;
  close_x18: string;
  volume: string;
}

/**
 * Event from subscribing to a `funding_payment` stream.
 */
export interface EngineServerSubscriptionFundingPaymentEvent
  extends EngineServerSubscriptionBaseEvent<'funding_payment'> {
  timestamp: string;
  /** Funding payment amount (positive = receive, negative = pay) */
  payment_amount: string;
  /** Open interest at time of funding */
  open_interest: string;
  /** Current cumulative funding values */
  cumulative_funding_long_x18: string;
  cumulative_funding_short_x18: string;
  /** Time delta over which the funding payment was calculated */
  dt: string;
}

/**
 * Union type for all engine server subscription events.
 */
export type EngineServerSubscriptionEvent =
  | EngineServerSubscriptionTradeEvent
  | EngineServerSubscriptionBestBidOfferEvent
  | EngineServerSubscriptionBookDepthEvent
  | EngineServerSubscriptionFillEvent
  | EngineServerSubscriptionPositionChangeEvent
  | EngineServerSubscriptionOrderUpdateEvent
  | EngineServerSubscriptionLiquidationEvent
  | EngineServerSubscriptionLatestCandlestickEvent
  | EngineServerSubscriptionFundingPaymentEvent;
