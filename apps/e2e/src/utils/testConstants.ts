import { QUOTE_PRODUCT_ID } from '@nadohq/shared';
import { TriggerServerStatusTypeFilter } from '@nadohq/trigger-client';

/**
 * Product IDs available on the testnet environment.
 * Derived from the testnet deployment's product registry.
 */
export const TEST_PRODUCT_IDS = {
  QUOTE: QUOTE_PRODUCT_ID,
  SPOT_BTC: 1,
  PERP_BTC: 2,
  SPOT_ETH: 3,
  PERP_ETH: 4,
} as const;

/** Default subaccount name used across E2E tests. */
export const TEST_SUBACCOUNT_NAME = 'default';

/**
 * Contest IDs known to exist on the testnet leaderboard.
 * These may go stale if testnet state is reset.
 */
export const TEST_CONTEST_IDS = {
  LEGACY: 1,
  RECENT: [5, 6, 7] as readonly number[],
  LEADERBOARD: 8,
  REGISTRATION: 16,
} as const;

/**
 * Test timeouts for different categories of E2E operations.
 * Node test runner uses milliseconds.
 */
export const TEST_TIMEOUTS = {
  DEFAULT: 30_000,
  LONG: 60_000,
  ON_CHAIN: 120_000,
} as const;

/** Status type filters that match all non-terminal trigger order states. */
export const PENDING_TRIGGER_STATUS_TYPES: TriggerServerStatusTypeFilter[] = [
  'triggering',
  'waiting_price',
  'waiting_dependency',
  'twap_executing',
];
