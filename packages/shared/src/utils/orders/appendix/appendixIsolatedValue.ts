import { OrderAppendixIsolatedFields } from '../../../types';
import {
  addDecimals,
  NADO_PRODUCT_DECIMALS,
  removeDecimals,
  toBigInt,
} from '../../math';
import { bitMaskValue } from './bitMaskValue';

const APPENDIX_V1_ISO_MARGIN_DECIMALS = 6;

/* Appendix v1 uses x6 precision, so we need to adjust precision to/from SDK's usual precision */
const MARGIN_DECIMAL_ADJUSTMENT =
  NADO_PRODUCT_DECIMALS - APPENDIX_V1_ISO_MARGIN_DECIMALS;

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
  return bitMaskValue(
    toBigInt(removeDecimals(margin, MARGIN_DECIMAL_ADJUSTMENT)),
    64,
  );
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
    margin: toBigInt(addDecimals(margin, MARGIN_DECIMAL_ADJUSTMENT)),
  };
}
