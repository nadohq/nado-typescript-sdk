/**
 * Numeric error codes returned by the Mobile Identity API. The Mobile service owns the 6000-6999 range.
 */
export const MOBILE_ERROR_CODE = {
  UNSUPPORTED_VARIANT: 6000,
  INVALID_SIGNATURE: 6001,
  SERVICE_NOT_READY: 6002,
  INVALID_DISPLAY_NAME: 6100,
  USERNAME_UNAVAILABLE: 6101,
  IDENTITY_ALREADY_CLAIMED: 6102,
  IDENTITY_REQUIRED: 6103,
  INVALID_IDENTITY_TARGET: 6104,
  STALE_IDENTITY_UPDATE: 6105,
  PROFILE_NOT_FOUND: 6106,
  INVALID_EXPO_TOKEN: 6200,
  INVALID_DEVICE_METADATA: 6201,
  INVALID_PREFERENCES: 6202,
  INTERNAL_ERROR: 6999,
} as const;

/**
 * Union of all known Mobile Identity API error codes.
 */
export type MobileErrorCode =
  (typeof MOBILE_ERROR_CODE)[keyof typeof MOBILE_ERROR_CODE];

/**
 * Validates a display name: 3-20 ASCII characters, alphanumeric boundaries, `_`/`.` allowed in the middle.
 */
export const DISPLAY_NAME_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9_.]{1,18}[A-Za-z0-9]$/;
