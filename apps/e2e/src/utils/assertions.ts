import assert from 'node:assert/strict';

/**
 * Asserts that a value is neither null nor undefined.
 * Narrows the type to `T` for subsequent usage.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertDefined<T>(
  value: T | null | undefined,
  label: string,
): asserts value is T {
  assert.notEqual(value, null, `${label} should not be null`);
  assert.notEqual(value, undefined, `${label} should not be undefined`);
}

/**
 * Asserts that a value is an array. Empty arrays are considered valid
 * because many query endpoints legitimately return empty results.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertArray(
  value: unknown,
  label: string,
): asserts value is unknown[] {
  assert.ok(Array.isArray(value), `${label} should be an array`);
}

/**
 * Asserts that a value is a non-empty array.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertNonEmptyArray(
  value: unknown,
  label: string,
): asserts value is [unknown, ...unknown[]] {
  assertArray(value, label);
  assert.ok(value.length > 0, `${label} should not be empty`);
}

/**
 * Asserts that a value is a non-empty hex string (0x-prefixed).
 * Useful for validating order digests and signatures.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertHexString(value: unknown, label: string): void {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.match(
    value as string,
    /^0x[0-9a-f]+$/i,
    `${label} should be a hex string (0x-prefixed)`,
  );
}

/**
 * Asserts that an object has the standard pagination meta shape
 * returned by paginated indexer endpoints.
 *
 * @param response - Object expected to have `meta` and `events`/`orders`/`participants` fields.
 * @param label - Human-readable label included in the failure message.
 */
export function assertPaginatedResponse(
  response: {
    meta?: { hasMore?: boolean };
    events?: unknown[];
    orders?: unknown[];
  },
  label: string,
) {
  assertDefined(response.meta, `${label}.meta`);
  assert.equal(
    typeof response.meta.hasMore,
    'boolean',
    `${label}.meta.hasMore should be a boolean`,
  );
}
