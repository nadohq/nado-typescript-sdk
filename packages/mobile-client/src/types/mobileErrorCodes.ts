/**
 * Numeric error codes returned by the mobile service API. Identity codes (61xx) and notification codes
 * (62xx) are mobile-specific; the remaining codes are shared cross-service codes from the backend's common
 * error enum.
 */
export const MOBILE_ERROR_CODES = {
  NOT_IMPLEMENTED: 4001,
  INVALID_SIGNER: 2028,
  SERVICE_UNAVAILABLE: 1006,
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
  INTERNAL_ERROR: 5000,
} as const;

/**
 * Union of all known mobile service API error codes.
 */
export type MobileErrorCode =
  (typeof MOBILE_ERROR_CODES)[keyof typeof MOBILE_ERROR_CODES];

/**
 * Validates a display name: 3-20 ASCII characters, alphanumeric boundaries, `_`/`.` allowed in the middle.
 */
export const DISPLAY_NAME_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9_.]{1,18}[A-Za-z0-9]$/;
