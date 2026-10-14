/**
 * Validates a display name: 3-20 ASCII characters from `[A-Za-z0-9_.]`, allowed in any position.
 */
export const MOBILE_DISPLAY_NAME_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;

/**
 * Validates a profile search query: 1-20 ASCII characters, a letter or digit first, then letters, digits, `_`
 * or `.`. The backend lowercases letters and trims nothing, so a prefix shorter than a full username matches.
 */
export const MOBILE_PROFILE_SEARCH_QUERY_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9_.]{0,19}$/;
