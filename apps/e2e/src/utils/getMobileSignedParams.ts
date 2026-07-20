import { MobileSignedRequestParams } from '@nadohq/mobile-client';
import { TEST_SUBACCOUNT_NAME } from './testConstants';
import { RunContext } from './types';

/**
 * Builds the signed-request params for the shared E2E test subaccount. Notification and identity state is
 * keyed by the owning wallet, so any subaccount of the wallet authenticates the same data.
 */
export function getMobileSignedParams(
  tc: RunContext,
): MobileSignedRequestParams {
  return {
    subaccountOwner: tc.walletClientAddress,
    subaccountName: TEST_SUBACCOUNT_NAME,
    chainId: tc.chainId,
    verifyingAddr: tc.endpointAddr,
  };
}
