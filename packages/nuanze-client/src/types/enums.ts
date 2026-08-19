/**
 * Venues a Nuanze market can be listed on.
 *
 * Perpetuals use even product IDs and spot markets use odd ones.
 */
export const NUANZE_MARKET_VENUES = Object.freeze(['perp', 'spot'] as const);

/** Venue of a Nuanze market. */
export type NuanzeMarketVenue = (typeof NUANZE_MARKET_VENUES)[number];

/**
 * Tradability states a Nuanze market can report.
 *
 * The API normalizes its source values, mapping `not_tradable` to
 * `notTradable`, `reduce_only` to `reduceOnly`, `post_only` to `postOnly`, and
 * `soft_reduce_only` to `softReduceOnly`.
 */
export const NUANZE_MARKET_TRADING_STATUSES = Object.freeze([
  'live',
  'notTradable',
  'reduceOnly',
  'postOnly',
  'softReduceOnly',
] as const);

/** Tradability state of a Nuanze market. */
export type NuanzeMarketTradingStatus =
  (typeof NUANZE_MARKET_TRADING_STATUSES)[number];
