/** Maximum biography length in Unicode code points accepted by the mobile service. */
export const MOBILE_BIO_MAX_LENGTH = 150;

/** Maximum size of the JPEG file sent through an avatar upload grant. */
export const MOBILE_AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Checks biography protocol limits; whitespace-only text is valid and clears the bio. */
export function isValidMobileBio(bio: string): boolean {
  return !bio.includes('\0') && Array.from(bio).length <= MOBILE_BIO_MAX_LENGTH;
}
