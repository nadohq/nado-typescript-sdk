/**
 * Encodes an ASCII string to bytes. Image-upload multipart headers and signed payload JSON are ASCII-only
 * (type, content_hash, sender, nonce, signature); filenames are sanitized before encoding.
 */
function encodeAscii(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0x7f) {
      throw new Error('multipart preamble must be ASCII');
    }
    bytes[index] = code;
  }
  return bytes;
}

/**
 * Builds a multipart/form-data body for feed image uploads without relying on DOM FormData/Blob.
 * Parts are exactly `payload` (JSON text) and `file` (raw bytes), matching the mobile execute contract.
 * @param payloadJson - Stringified signed execute body.
 * @param fileBytes - Original image bytes.
 * @param fileName - Multipart filename only; not used for format detection.
 * @returns Raw multipart body and its Content-Type header value including boundary.
 */
export function buildMobileFeedImageMultipart(
  payloadJson: string,
  fileBytes: Uint8Array,
  fileName: string,
): { body: Uint8Array; contentType: string } {
  const boundary = `----nadoFeedImage${Date.now().toString(16)}${Math.floor(Math.random() * 1e6).toString(16)}`;
  const safeFileName = fileName.replace(/[^\w.-]+/g, '_') || 'image.bin';
  const preamble = encodeAscii(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="payload"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${payloadJson}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${safeFileName}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
  );
  const epilogue = encodeAscii(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(
    preamble.length + fileBytes.length + epilogue.length,
  );
  body.set(preamble, 0);
  body.set(fileBytes, preamble.length);
  body.set(epilogue, preamble.length + fileBytes.length);
  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
