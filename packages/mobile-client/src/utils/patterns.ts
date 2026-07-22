/**
 * Validates a display name: 3-20 ASCII characters from `[A-Za-z0-9_.]`, allowed in any position.
 */
export const MOBILE_DISPLAY_NAME_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;
