/**
 * EIP-712 signing context common to all signed API requests.
 */
export interface SignatureParams {
  /**
   * Verifying contract address for the EIP-712 domain. This is the endpoint address for most requests;
   * order placement uses an address derived from the product (see `getOrderVerifyingAddress`).
   */
  verifyingAddr: string;
  chainId: number;
}
