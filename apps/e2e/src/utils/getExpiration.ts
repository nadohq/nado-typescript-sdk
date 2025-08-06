import { getExpirationTimestamp, OrderExpirationType } from '@nadohq/contracts';
import { nowInSeconds } from '@nadohq/utils';

export function getExpiration(
  expirationType: OrderExpirationType = 'default',
  secondsInFuture = 1000,
  reduceOnly = false,
) {
  return getExpirationTimestamp({
    expirationTime: nowInSeconds() + secondsInFuture,
    type: expirationType,
    reduceOnly,
  });
}
