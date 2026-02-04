/**
 * Bit layout for OrderAppendix packing (MSB → LSB):
 *
 * |   value   | builderId | builderFeeRate | reserved | trigger | reduceOnly | orderType | isolated | version |
 * |-----------|-----------|----------------|----------|---------|------------|-----------|----------|---------|
 * | 127..64   | 63..48    | 47..38         | 37..14   | 13..12  | 11         | 10..9     | 8        | 7..0    |
 * |  64 bits  | 16 bits   | 10 bits        | 24 bits  | 2 bits  | 1 bit      | 2 bits    | 1 bit    | 8 bits  |
 */
export interface PackedOrderAppendixBits {
  value: bigint; // 64 bits
  builderId: number; // 16 bits
  builderFeeRate: number; // 10 bits
  reserved: number; // 24 bits, set to 0
  trigger: number; // 2 bits
  reduceOnly: number; // 1 bit
  orderType: number; // 2 bits
  isolated: number; // 1 bit
  version: number; // 8 bits, set to 1
}
