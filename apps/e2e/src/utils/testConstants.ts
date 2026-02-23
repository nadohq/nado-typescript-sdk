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
  SPOT_USDC: 5,
  PERP_SOL: 8,
  PERP_XRP: 10,
  PERP_BNB: 14,
  PERP_HYPE: 16,
  PERP_ZEC: 18,
  PERP_MON: 20,
  PERP_FARTCOIN: 22,
  PERP_SUI: 24,
  PERP_AAVE: 26,
  PERP_XAUT: 28,
  PERP_PUMP: 30,
  PERP_TAO: 32,
  PERP_XMR: 34,
  PERP_LIT: 36,
  PERP_KPEPE: 38,
  PERP_PENGU: 40,
  PERP_SKR: 44,
  PERP_UNI: 46,
  PERP_ASTER: 48,
  PERP_XPL: 50,
  PERP_DOGE: 52,
  PERP_WLFI: 54,
  PERP_KBONK: 56,
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
