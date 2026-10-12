import { MobileSignedInner } from './types';

/**
 * Rebuilds an inner payload with its keys in the backend's struct declaration order (`type` first, then the
 * remaining fields in the exact order the backend serializes them). msgpack encodes object keys in insertion
 * order and the payload hash must be reproducible regardless of how the caller constructed the object, so
 * every inner payload — and each of its sub-types — is canonicalized here before hashing. This function is
 * the source of truth for that order.
 */
export function canonicalizeMobileInner(
  inner: MobileSignedInner,
): MobileSignedInner {
  switch (inner.type) {
    case 'set_bio':
      return { type: 'set_bio', bio: inner.bio };
    case 'create_avatar_upload':
      return {
        type: 'create_avatar_upload',
        content_length: inner.content_length,
      };
    case 'set_avatar': {
      const avatar = inner.avatar;
      if (avatar === null) return { type: 'set_avatar', avatar: null };
      return {
        type: 'set_avatar',
        avatar:
          avatar.type === 'preset'
            ? { type: 'preset', id: avatar.id }
            : { type: 'upload', upload_key: avatar.upload_key },
      };
    }
    case 'set_username':
      return { type: 'set_username', display_name: inner.display_name };
    case 'set_private_mode':
      return { type: 'set_private_mode', private_mode: inner.private_mode };
    case 'register_expo_token':
      return {
        type: 'register_expo_token',
        expo_token: inner.expo_token,
        platform: inner.platform,
        locale: inner.locale,
        app_version: inner.app_version,
      };
    case 'set_follow':
      return {
        type: 'set_follow',
        subaccount: inner.subaccount,
        is_following: inner.is_following,
      };
    default: {
      throw new Error(
        `canonicalizeMobileInner: unhandled inner payload type: ${JSON.stringify(inner)}`,
      );
    }
  }
}
