/**
 * Serializes a signed Mobile Identity API request body to JSON, preserving `nonce` as an unquoted decimal
 * token. The nonce is a `bigint` beyond `Number.MAX_SAFE_INTEGER`, so it must never pass through `Number` or
 * `JSON.stringify` (which throws on `bigint`) — it is spliced back in as raw text after stringifying the rest
 * of the body.
 */
export function stringifyMobileRequest<T extends { nonce: bigint }>(
  value: T,
): string {
  const { nonce, ...withoutNonce } = value;
  const json = JSON.stringify(withoutNonce);
  return `${json.slice(0, -1)},"nonce":${nonce}}`;
}
