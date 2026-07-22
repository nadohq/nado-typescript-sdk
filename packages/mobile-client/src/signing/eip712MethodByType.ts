import { MobileSignedInner } from './types';

/**
 * EIP-712 `method` string for each signed inner payload type.
 */
export const MOBILE_EIP712_METHOD_BY_TYPE: Record<
  MobileSignedInner['type'],
  string
> = {
  claim_username: 'mobile:execute_claim_username',
  update_username: 'mobile:execute_update_username',
  set_private_mode: 'mobile:execute_set_private_mode',
  self_identity: 'mobile:query_self_identity',
  register_expo_token: 'mobile:execute_register_expo_token',
  unregister_expo_token: 'mobile:execute_unregister_expo_token',
  update_preferences: 'mobile:execute_update_preferences',
  notification_preferences: 'mobile:query_notification_preferences',
  registered_devices: 'mobile:query_registered_devices',
};
