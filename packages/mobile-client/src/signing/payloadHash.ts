import { encode } from '@msgpack/msgpack';
import { Hex, keccak256 } from 'viem';
import { MobileSignedInner } from './types';

/**
 * Computes the EIP-712 `payloadHash` for a canonicalized inner payload: `keccak256(msgpack(inner))`.
 *
 * @param inner - A canonicalized inner payload; callers must run {@link canonicalizeMobileInner} first.
 */
export function getMobilePayloadHash(inner: MobileSignedInner): Hex {
  return keccak256(encode(inner));
}
