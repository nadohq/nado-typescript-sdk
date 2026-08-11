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
  self_identity: 'mobile:query_self_identity',
  register_expo_token: 'mobile:execute_register_expo_token',
};
