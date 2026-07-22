/**
 * Generates a `nonce` for a signed mobile service API request, following the same shape as `getOrderNonce`:
 * a receive-deadline timestamp in the high digits plus a random low-digits component to avoid collisions. The
 * server reads `nonce / 1_000_000` as a millisecond receive deadline, which must be later than server time
 * and no more than 100s ahead — hence the 30s default window. The random low six digits keep nonces
 * generated within the same millisecond distinct.
 *
 * @param deadlineMs - Receive deadline in milliseconds; defaults to 30s ahead of now.
 * @param randomInt - Random integer in `[0, 1_000_000)` placed in the low six digits to avoid collisions.
 */
export function getMobileNonce(
  deadlineMs: number = Date.now() + 30_000,
  randomInt: number = Math.floor(Math.random() * 1_000_000),
): bigint {
  return BigInt(deadlineMs) * 1_000_000n + BigInt(randomInt);
}
