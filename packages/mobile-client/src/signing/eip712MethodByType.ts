import { MobileSignedInner } from './types';

/**
 * EIP-712 `method` string for each signed inner payload type.
 */
export const MOBILE_EIP712_METHOD_BY_TYPE: Record<
  MobileSignedInner['type'],
  string
> = {
  create_feed_post: 'mobile:execute_create_feed_post',
  create_feed_comment: 'mobile:execute_create_feed_comment',
  create_feed_post_image_uploads:
    'mobile:execute_create_feed_post_image_uploads',
  create_feed_comment_image_uploads:
    'mobile:execute_create_feed_comment_image_uploads',
  create_feed_chart_drawing: 'mobile:execute_create_feed_chart_drawing',
  update_feed_chart_drawing: 'mobile:execute_update_feed_chart_drawing',
  set_feed_like: 'mobile:execute_set_feed_like',
  set_bio: 'mobile:execute_set_bio',
  create_avatar_upload: 'mobile:execute_create_avatar_upload',
  set_avatar: 'mobile:execute_set_avatar',
  set_username: 'mobile:execute_set_username',
  set_private_mode: 'mobile:execute_set_private_mode',
  register_expo_token: 'mobile:execute_register_expo_token',
  set_follow: 'mobile:execute_set_follow',
  set_follow_batch: 'mobile:execute_set_follow_batch',
};
