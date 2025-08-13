import { Address, toHex } from 'viem';

/**
 * The EIP712 verifying address for an order is defined as `address(uint160(productId))`
 * @param productId
 */
export function getOrderVerifyingAddress(productId: number): Address {
  return toHex(productId, { size: 20 });
}
