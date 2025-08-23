import { bytesToString, Hex, toBytes, toHex } from 'viem';
import { Bytes } from '../types/bytes';
import {
  Subaccount,
  SubaccountBytes32,
  SubaccountNameBytes12,
} from '../types/subaccountTypes';

/**
 * Converts a subaccount object (owner + name) to its bytes32 representation.
 * @param subaccount subaccount object (owner + name)
 * @returns bytes32 representation of a subaccount
 */
export function subaccountToBytes32(subaccount: Subaccount): SubaccountBytes32 {
  const address = toBytes(subaccount.subaccountOwner);

  if (address.length != 20) {
    throw new Error(`owner must be 20 bytes, but found ${address.length}`);
  }

  const nameBytes = subaccountNameToBytes12(subaccount.subaccountName);

  const bytes32 = new Uint8Array(32);
  for (let i = 0; i < address.length; i++) {
    bytes32[i] = address[i];
  }
  for (let i = 0; i < nameBytes.length; i++) {
    bytes32[i + 20] = nameBytes[i];
  }

  return bytes32;
}

/**
 * Given a bytes32 representation of a subaccount, returns a subaccount object (owner + name)
 * @param bytes bytes32 representaion of a subaccount where bytes[0:20]=owner & bytes[20:32]=subaccountName
 * @returns subaccount object (owner + name)
 */
export function subaccountFromBytes32(bytes: SubaccountBytes32): Subaccount {
  if (bytes.length != 32) {
    throw new Error('input must be 32 bytes');
  }

  const address = new Uint8Array(20);
  const name = new Uint8Array(12);

  for (let i = 0; i < bytes.length; i++) {
    if (i < 20) {
      address[i] = bytes[i];
    } else {
      name[i - 20] = bytes[i];
    }
  }

  return {
    subaccountOwner: toHex(address),
    subaccountName: subaccountNameBytesToStr(name),
  };
}

/**
 * When interacting with the contracts (e.g: deposit collateral);
 * subaccount name is represented as bytes12.
 * This util converts a subaccount name to it's bytes12 representation.
 * @param name subaccount name
 * @returns bytes12 representation of a subaccount name.
 */
export function subaccountNameToBytes12(name: string): SubaccountNameBytes12 {
  return toBytes(name, {
    size: 12,
  });
}

/**
 * When interacting with the engine, we need to send a hex string representation
 * of the bytes32 of a subaccount for serialization reasons. This util
 * converts a subaccount object (owner + name) to such hex representation.
 * @param subaccount subaccount object (owner + name)
 * @returns hex string representation of a subaccount
 */
export function subaccountToHex(subaccount: Subaccount): Hex {
  return toHex(subaccountToBytes32(subaccount));
}

/**
 * Converts a hex string representation of a bytes32 subaccount to a subaccount object (owner + name)
 * @param subaccount hex string representation of a bytes32 subaccount.
 * @returns subaccount object (owner + name)
 */
export function subaccountFromHex(subaccount: string): Subaccount {
  return subaccountFromBytes32(toBytes(subaccount));
}

/**
 * Converts Bytes to a string. If the bytes represent a valid UTF-8 string, then a string is returned, if not,
 * then the hex representation is returned.
 *
 * @param input
 */
export function subaccountNameBytesToStr(input: Bytes): string {
  // bytesToString will replace zero bytes with \0
  // strip out any trailing bytes for a readable name
  // however, we need to leave any leading bytes otherwise reverse conversion to bytes will not work
  const toStringResult = bytesToString(input).replace(/\0*$/, '');
  // bytesToString will replace invalid byte sequences with �, so default to converting to hex string if � is present
  if (toStringResult.includes('�')) {
    return toHex(input);
  }
  return toStringResult;
}
