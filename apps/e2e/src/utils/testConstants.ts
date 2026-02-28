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
} as const;

/**
 * Delays (ms) inserted between E2E operations to stay within testnet
 * rate limits and allow backend state to propagate.
 *
 * @see {@link delay} in `../utils/delay.ts` for background.
 */
export const TEST_DELAYS = {
  /** Pause between individual tests within a suite. */
  BETWEEN_TESTS: 150,
  /** Pause at the start of each top-level suite to space out suite execution. */
  BETWEEN_SUITES: 300,
  /** Moderate pause for engine state to settle after a mutation. */
  SETTLE_STATE: 500,
  /** Extended pause for engine state to settle after heavy mutations (e.g. linked signer changes). */
  SETTLE_STATE_LONG: 1_000,
  /** Wait for the indexer to process and propagate recently submitted data. */
  INDEXER_PROPAGATION: 3_000,
  /** Pause between sequential cleanup operations to avoid overwhelming the engine. */
  BETWEEN_CLEANUP_STEPS: 1_500,
} as const;

/** Status type filters that match all non-terminal trigger order states. */
export const PENDING_TRIGGER_STATUS_TYPES: TriggerServerStatusTypeFilter[] = [
  'triggering',
  'waiting_price',
  'waiting_dependency',
  'twap_executing',
];
