import { EngineClient } from '@nadohq/engine-client';
import { TriggerClient } from '@nadohq/trigger-client';
import { TEST_PRODUCT_IDS, TEST_SUBACCOUNT_NAME } from './testConstants';

/** All tradeable product IDs used across E2E tests. */
export const ALL_TRADEABLE_PRODUCT_IDS: number[] = [
  TEST_PRODUCT_IDS.SPOT_BTC,
  TEST_PRODUCT_IDS.PERP_BTC,
  TEST_PRODUCT_IDS.SPOT_ETH,
  TEST_PRODUCT_IDS.PERP_ETH,
];

/**
 * Options for cleanup utilities that cancel open orders.
 */
export interface CleanupOptions {
  subaccountOwner: string;
  subaccountName?: string;
  verifyingAddr: string;
  chainId: number;
}

/**
 * Cancels all open engine orders across all tradeable products.
 * Silently ignores errors (e.g. no open orders).
 *
 * @param client - The engine client instance.
 * @param opts - Subaccount and chain identification.
 */
export async function cancelAllOpenOrders(
  client: EngineClient,
  opts: CleanupOptions,
): Promise<void> {
  try {
    await client.cancelProductOrders({
      subaccountName: opts.subaccountName ?? TEST_SUBACCOUNT_NAME,
      subaccountOwner: opts.subaccountOwner,
      productIds: ALL_TRADEABLE_PRODUCT_IDS,
      verifyingAddr: opts.verifyingAddr,
      chainId: opts.chainId,
    });
  } catch {
    // No open orders or already cancelled
  }
}

/**
 * Cancels all open trigger orders across all tradeable products.
 * Silently ignores errors (e.g. no open orders).
 *
 * @param client - The trigger client instance.
 * @param opts - Subaccount and chain identification.
 */
export async function cancelAllTriggerOrders(
  client: TriggerClient,
  opts: CleanupOptions,
): Promise<void> {
  try {
    await client.cancelProductOrders({
      productIds: ALL_TRADEABLE_PRODUCT_IDS,
      subaccountName: opts.subaccountName ?? TEST_SUBACCOUNT_NAME,
      subaccountOwner: opts.subaccountOwner,
      verifyingAddr: opts.verifyingAddr,
      chainId: opts.chainId,
    });
  } catch {
    // No open orders or already cancelled
  }
}
