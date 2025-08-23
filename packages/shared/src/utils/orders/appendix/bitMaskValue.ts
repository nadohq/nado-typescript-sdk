/**
 * Returns the value masked to the specified bit width.
 *
 * @param {bigint} value - The value to be masked.
 * @param {number} bitWidth - The bit width for masking.
 * @returns {bigint} - The masked value.
 */
export function bitMaskValue(value: bigint | number, bitWidth: number): bigint {
  const bitMask = (1n << BigInt(bitWidth)) - 1n;
  return BigInt(value) & bitMask;
}
