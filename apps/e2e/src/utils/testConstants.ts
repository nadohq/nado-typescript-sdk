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
  /** Minimum pause between sequential tests to avoid API rate-limiting. */
  BETWEEN_TESTS: 150,
  /** Moderate pause for operations that require state settlement before the next step. */
  RATE_LIMIT: 500,
  /** Extended pause after heavy state-mutating operations (e.g. linked signer changes). */
  RATE_LIMIT_LONG: 1_000,
  /** Setup delay to let prior suite's linked signer state settle before starting. */
  LINKED_SIGNER_SETUP: 1_500,
  /** Setup delay to let prior suite's NLP operations complete before starting. */
  NLP_SETUP: 2_500,
  /** Wait for the indexer to process and propagate recently submitted data. */
  INDEXER_PROPAGATION: 3_000,
} as const;

/** Status type filters that match all non-terminal trigger order states. */
export const PENDING_TRIGGER_STATUS_TYPES: TriggerServerStatusTypeFilter[] = [
  'triggering',
  'waiting_price',
  'waiting_dependency',
  'twap_executing',
];
