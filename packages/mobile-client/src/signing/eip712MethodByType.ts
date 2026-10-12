import { MobileSignedInner } from './types';

/**
 * EIP-712 `method` string for each signed inner payload type.
 */
export const MOBILE_EIP712_METHOD_BY_TYPE: Record<
  MobileSignedInner['type'],
  string
> = {
  set_username: 'mobile:execute_set_username',
  set_private_mode: 'mobile:execute_set_private_mode',
  register_expo_token: 'mobile:execute_register_expo_token',
  set_follow: 'mobile:execute_set_follow',
  profile_feed: 'mobile:query_profile_feed',
  market_feed: 'mobile:query_market_feed',
  position_feed: 'mobile:query_position_feed',
  feed_item: 'mobile:query_feed_item',
  feed_updates: 'mobile:query_feed_updates',
};
