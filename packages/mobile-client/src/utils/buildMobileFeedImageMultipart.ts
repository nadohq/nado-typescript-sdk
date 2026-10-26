import { concatBytes, stringToBytes } from 'viem';

/**
 * Builds a multipart/form-data body for feed image uploads without relying on DOM FormData/Blob.
 * Parts are exactly `payload` (JSON text) and `file` (raw bytes), matching the mobile execute contract.
 * @param payloadJson - Stringified signed execute body.
 * @param fileBytes - Original image bytes.
 * @returns Raw multipart body and its Content-Type header value including boundary.
 */
export function buildMobileFeedImageMultipart(
  payloadJson: string,
  fileBytes: Uint8Array,
): { body: Uint8Array; contentType: string } {
  const boundary = `----nadoFeedImage${Date.now().toString(16).padStart(14, '0')}${Math.floor(
    Math.random() * 1e6,
  )
    .toString(16)
    .padStart(5, '0')}`;
  const preamble =
    `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="payload"\r\n' +
    'Content-Type: application/json\r\n\r\n' +
    `${payloadJson}\r\n` +
    `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="file"; filename="image"\r\n' +
    'Content-Type: application/octet-stream\r\n\r\n';
  return {
    body: concatBytes([
      stringToBytes(preamble),
      fileBytes,
      stringToBytes(`\r\n--${boundary}--\r\n`),
    ]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
