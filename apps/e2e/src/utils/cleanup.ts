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

export interface CleanupOptions {
  subaccountOwner: string;
  subaccountName?: string;
  verifyingAddr: string;
  chainId: number;
}

/**
 * Cancels all open orders (engine and/or trigger) as a test teardown safety net.
 * Provide whichever clients the test has available — missing clients are skipped.
 *
 * @param clients - Engine and/or trigger client instances.
 * @param opts - Subaccount and chain identification.
 */
export async function cleanupTestState(
  clients: { engine?: EngineClient; trigger?: TriggerClient },
  opts: CleanupOptions,
): Promise<void> {
  const subaccountName = opts.subaccountName ?? TEST_SUBACCOUNT_NAME;

  if (clients.engine) {
    try {
      await clients.engine.cancelProductOrders({
        subaccountName,
        subaccountOwner: opts.subaccountOwner,
        productIds: ALL_TRADEABLE_PRODUCT_IDS,
        verifyingAddr: opts.verifyingAddr,
        chainId: opts.chainId,
      });
    } catch {
      // No open orders or already cancelled
    }
  }

  if (clients.trigger) {
    try {
      await clients.trigger.cancelProductOrders({
        productIds: ALL_TRADEABLE_PRODUCT_IDS,
        subaccountName,
        subaccountOwner: opts.subaccountOwner,
        verifyingAddr: opts.verifyingAddr,
        chainId: opts.chainId,
      });
    } catch {
      // No open orders or already cancelled
    }
  }
}
