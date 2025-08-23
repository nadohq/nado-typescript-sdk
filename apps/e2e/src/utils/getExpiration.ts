import { nowInSeconds, toBigInt } from '@nadohq/shared';

export function getExpiration(secondsInFuture = 1000) {
  return toBigInt(nowInSeconds() + secondsInFuture);
}
