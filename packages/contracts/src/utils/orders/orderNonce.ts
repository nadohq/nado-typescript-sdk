import { toIntegerString } from '@nadohq/utils';
import { getDefaultRecvTime } from './recvTime';

/**
 * Generates an order nonce based on recvTime in milliseconds, defaulting to Date.now() + 90 seconds
 * @param recvTimeMillis
 * @param randomInt a random integer to avoid hash collisions
 */
export function getOrderNonce(
  recvTimeMillis: number = getDefaultRecvTime(),
  randomInt: number = Math.floor(Math.random() * 1000),
): string {
  return toIntegerString(getOrderNonceBigInt(recvTimeMillis, randomInt));
}

/**
 * Gets the recvTime in millis from an order nonce
 *
 * @param orderNonce
 */
export function getRecvTimeFromOrderNonce(orderNonce: string): number {
  // Right shift by 20 to remove the random int portion
  const bigIntRecvTime = BigInt(orderNonce) >> 20n;
  return Number(bigIntRecvTime.toString());
}

function getOrderNonceBigInt(
  recvTimeMillis: number,
  randomInt: number,
): bigint {
  return (BigInt(recvTimeMillis) << 20n) + BigInt(randomInt);
}
