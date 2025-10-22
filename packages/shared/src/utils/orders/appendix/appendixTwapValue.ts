import { OrderAppendixTwapFields } from '../../../types/orderAppendixTypes';
import { addDecimals, removeDecimals, toBigInt } from '../../math';

/**
 * Packs the provided fields into a single 64-bit bigint.
 *
 * Bit layout (MSB → LSB):
 * |   times   | slippage_x6 |
 * |-----------|-------------|
 * | 63..32    | 31..0       |
 * | 32 bits   | 32 bits     |
 *
 * - `times` occupies bits 63..32 (most significant 32 bits)
 * - `slippage_x6` occupies bits 31..0 (least significant 32 bits)
 */
export function packTwapOrderAppendixValue({
  numOrders,
  slippageFrac,
}: OrderAppendixTwapFields): bigint {
  const numOrdersBigInt = toBigInt(numOrders);
  const slippageX6BigInt = toBigInt(addDecimals(slippageFrac, 6));

  return (
    ((numOrdersBigInt & 0xffffffffn) << 32n) | (slippageX6BigInt & 0xffffffffn)
  );
}

/**
 * Unpacks a 64-bit bigint into its component fields for TWAP orders.
 *
 * @param value 64-bit bigint to unpack
 * @returns Object with:
 *   - times: number, from bits 63..32
 *   - slippage_x6: number, from bits 31..0
 */
export function unpackTwapOrderAppendixValue(
  value: bigint,
): OrderAppendixTwapFields {
  const numOrders = (value >> 32n) & 0xffffffffn;
  const slippageX6 = value & 0xffffffffn;

  return {
    numOrders: Number(numOrders),
    slippageFrac: removeDecimals(slippageX6, 6).toNumber(),
  };
}
