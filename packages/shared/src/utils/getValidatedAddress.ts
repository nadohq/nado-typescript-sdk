import { Address, isAddress } from 'viem';

/**
 * Check if the given string is a valid address. Throws an error if not.
 * @param maybeAddress
 */
export function getValidatedAddress(maybeAddress: string): Address {
  if (!isAddress(maybeAddress)) {
    throw new Error(`Invalid address: ${maybeAddress}`);
  }

  return maybeAddress;
}
