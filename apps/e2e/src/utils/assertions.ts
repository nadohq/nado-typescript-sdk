import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { isHex } from 'viem';

// ---------------------------------------------------------------------------
// Primitive / utility assertions
// ---------------------------------------------------------------------------

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
  assert.ok(isHex(value as string), `${label} should be a hex string`);
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

/**
 * Asserts that a value is a finite BigNumber.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertBigNumberFinite(value: unknown, label: string): void {
  assert.ok(
    value instanceof BigNumber && value.isFinite(),
    `${label} should be a finite BigNumber`,
  );
}

/**
 * Asserts that a value is a finite BigNumber greater than zero.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertBigNumberPositive(value: unknown, label: string): void {
  assertBigNumberFinite(value, label);
  assert.ok((value as BigNumber).gt(0), `${label} should be positive`);
}

/**
 * Asserts that a value is a finite BigNumber greater than or equal to zero.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertBigNumberNonNegative(
  value: unknown,
  label: string,
): void {
  assertBigNumberFinite(value, label);
  assert.ok((value as BigNumber).gte(0), `${label} should be non-negative`);
}

/**
 * Asserts that a value is of type `number`.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertNumber(value: unknown, label: string): void {
  assert.equal(typeof value, 'number', `${label} should be a number`);
}

/**
 * Asserts that a value is a string. Empty strings are accepted; use
 * {@link assertNonEmptyString} when a non-empty value is required.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertString(value: unknown, label: string): void {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.ok((value as string).length > 0, `${label} should not be empty`);
}

/**
 * Asserts that a value is a non-empty string.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertNonEmptyString(value: unknown, label: string): void {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.ok((value as string).length > 0, `${label} should not be empty`);
}

/**
 * Asserts that a value is of type `boolean`.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertBoolean(value: unknown, label: string): void {
  assert.equal(typeof value, 'boolean', `${label} should be a boolean`);
}

/**
 * Asserts that a value is a non-array object with at least one key.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertRecord(value: unknown, label: string): void {
  assert.ok(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    `${label} should be a record object`,
  );
  assert.ok(
    Object.keys(value).length > 0,
    `${label} should have at least one key`,
  );
}

/**
 * Asserts that a value is a member of the given set of allowed values.
 *
 * @param value - The value to check.
 * @param validValues - Accepted values.
 * @param label - Human-readable label included in the failure message.
 */
export function assertEnumMember<T>(
  value: unknown,
  validValues: readonly T[],
  label: string,
): void {
  assert.ok(
    (validValues as readonly unknown[]).includes(value),
    `${label} should be one of [${validValues.join(', ')}], got ${String(value)}`,
  );
}

/**
 * Runs an assertion callback against every element in an array.
 * Automatically generates labels like `label[0]`, `label[1]`, etc.
 *
 * @param arr - The array whose elements to validate.
 * @param assertFn - Callback receiving `(element, elementLabel)`.
 * @param label - Base label for error messages.
 */
export function assertArrayElements<T>(
  arr: T[],
  assertFn: (element: T, elementLabel: string) => void,
  label: string,
): void {
  for (let i = 0; i < arr.length; i++) {
    assertFn(arr[i], `${label}[${i}]`);
  }
}
