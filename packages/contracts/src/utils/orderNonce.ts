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
 * Generates a trigger order nonce based on recvTime in milliseconds, defaulting to Date.now() + 90 seconds
 * Trigger order nonces require that the first bit is set to 1, this differentiates it from a regular order nonce
 *
 * @param recvTimeMillis
 * @param randomInt
 */
export function getTriggerOrderNonce(
  recvTimeMillis: number = getDefaultRecvTime(),
  randomInt: number = Math.floor(Math.random() * 1000),
): string {
  const regularOrderNonce = getOrderNonceBigInt(recvTimeMillis, randomInt);
  const triggerOrderNonce = regularOrderNonce | (1n << 63n);

  return toIntegerString(triggerOrderNonce);
}

/**
 * Determines if a nonce is a trigger order nonce
 */
export function isTriggerOrderNonce(orderNonce: string): boolean {
  const nonceBigInt = BigInt(orderNonce);
  // Check if the 63rd bit is set to 1
  return Boolean(nonceBigInt & (1n << 63n));
}

/**
 * Gets the recvTime in millis from an order nonce
 *
 * @param orderNonce
 */
export function getRecvTimeFromOrderNonce(orderNonce: string): number {
  // We need to trim the first (63rd) bit, which is set to 1 for trigger orders
  const orderNonceBitMasked = BigInt(orderNonce) & ~(1n << 63n);
  const bigIntRecvTime = orderNonceBitMasked >> 20n;
  return Number(bigIntRecvTime.toString());
}

function getOrderNonceBigInt(
  recvTimeMillis: number,
  randomInt: number,
): bigint {
  return (BigInt(recvTimeMillis) << 20n) + BigInt(randomInt);
}
