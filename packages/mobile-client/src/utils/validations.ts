/**
 * Validates a display name: 3-20 ASCII characters, alphanumeric boundaries, `_`/`.` allowed in the middle.
 */
export const MOBILE_DISPLAY_NAME_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9_.]{1,18}[A-Za-z0-9]$/;
