/**
 * Generates a default recvTime based on the time given in milliseconds.
 * The default recvTime is 90 seconds from the current time.
 *
 * @param currentTimeMillis defaults to Date.now()
 */
export function getDefaultRecvTime(currentTimeMillis: number = Date.now()) {
  return currentTimeMillis + 90 * 1000;
}
