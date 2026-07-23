import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the mobile service API. Identity codes (61xx) and notification codes
 * (62xx) are mobile-specific; the remaining codes are shared cross-service codes from the backend's common
 * error enum, inlined via spread from {@link NADO_ERROR_CODES}.
 */
export const MOBILE_ERROR_CODES = {
  ...NADO_ERROR_CODES,
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
} as const;

/**
 * Union of all known mobile service API error codes.
 */
export type MobileErrorCode =
  (typeof MOBILE_ERROR_CODES)[keyof typeof MOBILE_ERROR_CODES];
