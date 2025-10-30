import { OrderAppendixIsolatedFields } from '../../../types';
import { toBigInt } from '../../math';
import { bitMaskValue } from './bitMaskValue';

/**
 * Appendix uses margin_x6, so we div/mul to align to our SDK's usual x18.
 */
const marginDecimalAdjustmentMultiplier = 10n ** 12n;

/**
 * Packs the provided margin into a single 64-bit bigint.
 *
 * Bit layout (MSB → LSB):
 * | margin_x6 |
 * |-----------|
 * | 63..0     |
 * | 64 bits   |
 *
 */
export function packIsolatedOrderAppendixValue({
  margin,
}: OrderAppendixIsolatedFields): bigint {
  return bitMaskValue(toBigInt(margin) / marginDecimalAdjustmentMultiplier, 64);
}

/**
 * Unpacks a 64-bit bigint into its component fields for Isolated orders.
 *
 * @param value 64-bit bigint to unpack
 * @returns Object with:
 *   - margin_x6: bigint, from bits 63..0
 */
export function unpackIsolatedOrderAppendixValue(
  value: bigint,
): OrderAppendixIsolatedFields {
  const margin = bitMaskValue(value, 64);
  return {
    margin: margin * marginDecimalAdjustmentMultiplier,
  };
}
