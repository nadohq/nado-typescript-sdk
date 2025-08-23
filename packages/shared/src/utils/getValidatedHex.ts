import { Hex, isHex } from 'viem';

/**
 * Check if the given string is a valid hex string. Throws an error if not.
 * @param maybeHex
 */
export function getValidatedHex(maybeHex: string): Hex {
  if (!isHex(maybeHex)) {
    throw new Error(`Invalid hex string: ${maybeHex}`);
  }

  return maybeHex;
}
