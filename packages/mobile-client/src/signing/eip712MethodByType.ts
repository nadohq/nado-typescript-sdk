import { MobileSignedInner } from './types';

/**
 * EIP-712 `method` string for each signed inner payload type.
 */
export const MOBILE_EIP712_METHOD_BY_TYPE: Record<
  MobileSignedInner['type'],
  string
> = {
  register_expo_token_v2: 'mobile:execute_register_expo_token_v2',
  notification_subscriptions: 'mobile:query_notification_subscriptions',
  update_notification_subscriptions:
    'mobile:execute_update_notification_subscriptions',
  notification_inbox_v2: 'mobile:query_notification_inbox_v2',
  record_product_events: 'mobile:execute_record_product_events',
  set_bio: 'mobile:execute_set_bio',
  create_avatar_upload: 'mobile:execute_create_avatar_upload',
  set_avatar: 'mobile:execute_set_avatar',
  set_username: 'mobile:execute_set_username',
  set_private_mode: 'mobile:execute_set_private_mode',
  register_expo_token: 'mobile:execute_register_expo_token',
  set_follow: 'mobile:execute_set_follow',
  set_follow_batch: 'mobile:execute_set_follow_batch',
};
