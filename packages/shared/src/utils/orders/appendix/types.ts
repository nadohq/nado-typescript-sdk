/**
 * Bit layout for OrderAppendix packing (MSB → LSB):
 *
 * |   value   | reserved | trigger | reduceOnly | orderType | isolated | version |
 * |-----------|----------|---------|------------|-----------|----------|---------|
 * | 127..32   | 31..14   | 13..12  | 11         | 10..9     | 8        | 7..0    |
 * |  96 bits  | 18 bits  | 2 bits  | 1 bit      | 2 bits    | 1 bit    | 8 bits  |
 */
export interface PackedOrderAppendixBits {
  value: bigint; // 96 bits
  reserved: number; // 18 bits, set to 0
  trigger: number; // 2 bits
  reduceOnly: number; // 1 bit
  orderType: number; // 2 bits
  isolated: number; // 1 bit
  version: number; // 8 bits, set to 0
}
