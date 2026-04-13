import { TriggerServerStatusTypeFilter } from '@nadohq/trigger-client';

/**
 * Product IDs available on the testnet environment.
 * Derived from the testnet deployment's product registry.
 */
export const TEST_PRODUCT_IDS = {
  SPOT_BTC: 1,
  PERP_BTC: 2,
  SPOT_ETH: 3,
  PERP_ETH: 4,
} as const;

/** All testnet product IDs as a flat array, for bulk cancel operations. */
export const TEST_PRODUCT_ID_LIST: number[] = Object.values(TEST_PRODUCT_IDS);

/** Default subaccount name used across E2E tests. */
export const TEST_SUBACCOUNT_NAME = 'default';

/**
 * Contest IDs known to exist on the testnet leaderboard.
 * These may go stale if testnet state is reset.
 *
 * - MULTI_TRACK (1): Monthly comp with 3 tracks (ROI, PnL, Volume). Use when specifying rankType.
 * - SINGLE_TRACK (2): Weekly mini with 1 track (Volume). Use when omitting rankType.
 */
export const TEST_CONTEST_ID = 1 as const;
export const TEST_SINGLE_TRACK_CONTEST_ID = 2 as const;

/**
 * Test timeouts for different categories of E2E operations.
 * Node test runner uses milliseconds.
 */
export const TEST_TIMEOUTS = {
  DEFAULT: 30_000,
  LONG: 60_000,
} as const;

/**
 * Delays (ms) inserted between E2E operations to stay within testnet
 * rate limits and allow backend state to propagate.
 *
 * @see {@link delay} in `../utils/delay.ts` for background.
 */
export const TEST_DELAYS = {
  /** Short pause for rate-limit spacing between sequential API calls. */
  SHORT: 150,
  /** Standard pause between tests within a suite for rate-limit compliance. */
  STANDARD: 300,
  /** Longer pause for engine/backend state propagation (e.g. linked signer, transfers). */
  LONG: 500,
} as const;

/** Status type filters that match all non-terminal trigger order states. */
export const PENDING_TRIGGER_STATUS_TYPES: TriggerServerStatusTypeFilter[] = [
  'triggering',
  'waiting_price',
  'waiting_dependency',
  'twap_executing',
];
