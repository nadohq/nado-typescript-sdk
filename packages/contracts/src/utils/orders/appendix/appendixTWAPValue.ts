import { addDecimals, removeDecimals, toBigInt } from '@nadohq/utils';
import { OrderAppendixTWAPFields } from '../../../common';

/**
 * Packs the provided fields into a single 96-bit bigint.
 *
 * Bit layout (MSB → LSB):
 * |   times   | slippage_x6 | reserved |
 * |-----------|-------------|----------|
 * | 95..64    | 63..32      | 31..0    |
 * | 32 bits   | 32 bits     | 32 bits  |
 *
 * - `times` occupies bits 95..64 (most significant 32 bits)
 * - `slippage_x6` occupies bits 63..32 (middle 32 bits)
 * - `reserved` occupies bits 31..0 (least significant 32 bits)
 */
export function packTWAPOrderAppendixValue({
  numOrders,
  slippageFrac,
}: OrderAppendixTWAPFields): bigint {
  const numOrdersBigInt = toBigInt(numOrders);
  const slippageX6BigInt = toBigInt(addDecimals(slippageFrac, 6));

  return (
    ((numOrdersBigInt & 0xffffffffn) << 64n) |
    ((slippageX6BigInt & 0xffffffffn) << 32n) |
    // The last reserved 32 bits are set to 0
    (0n & 0xffffffffn)
  );
}

/**
 * Unpacks a 96-bit bigint into its component fields for TWAP orders.
 *
 * @param value 96-bit bigint to unpack
 * @returns Object with:
 *   - times: number, from bits 95..64
 *   - slippage_x6: number, from bits 63..32
 *   - reserved: number, from bits 31..0
 */
export function unpackTWAPOrderAppendixValue(
  value: bigint,
): OrderAppendixTWAPFields {
  const numOrders = (value >> 64n) & 0xffffffffn;
  const slippageX6 = (value >> 32n) & 0xffffffffn;

  return {
    numOrders: Number(numOrders),
    slippageFrac: removeDecimals(slippageX6, 6).toNumber(),
  };
}
