import { toPrintableObject } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { isHex } from 'viem';

/**
 * Maximum length of a formatted value in an assertion failure message.
 * Keeps failures readable when a large API response is the offending value.
 */
const MAX_FORMATTED_VALUE_LENGTH = 200;

/**
 * Formats an arbitrary value for inclusion in an assertion failure message.
 * BigNumbers and bigints are stringified via {@link toPrintableObject}, and
 * long values are truncated to keep failure output readable.
 *
 * @param value - The value to format.
 * @returns A short, human-readable representation of the value.
 */
function formatValue(value: unknown): string {
  let formatted: string;

  if (value === undefined) {
    // `toPrintableObject` normalizes `undefined` to `null`, so keep the distinction here.
    formatted = 'undefined';
  } else if (typeof value === 'number' && !Number.isFinite(value)) {
    // `JSON.stringify` serializes `NaN` / `Infinity` as `null`.
    formatted = String(value);
  } else {
    try {
      // `JSON.stringify` returns `undefined` for values it cannot serialize (e.g. functions).
      formatted =
        JSON.stringify(toPrintableObject(value)) ??
        Object.prototype.toString.call(value);
    } catch {
      formatted = Object.prototype.toString.call(value);
    }
  }

  return formatted.length > MAX_FORMATTED_VALUE_LENGTH
    ? `${formatted.slice(0, MAX_FORMATTED_VALUE_LENGTH)}…`
    : formatted;
}

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
  assert.ok(
    Array.isArray(value),
    `${label} should be an array, instead got ${formatValue(value)}`,
  );
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
  assert.equal(
    typeof value,
    'string',
    `${label} should be a string, instead got ${formatValue(value)}`,
  );
  assert.ok(
    isHex(value),
    `${label} should be a hex string, instead got ${formatValue(value)}`,
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
    `${label}.meta.hasMore should be a boolean, instead got ${formatValue(
      response.meta.hasMore,
    )}`,
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
    `${label} should be a finite BigNumber, instead got ${formatValue(value)}`,
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
  assert.ok(
    (value as BigNumber).gt(0),
    `${label} should be positive, instead got ${formatValue(value)}`,
  );
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
  assert.ok(
    (value as BigNumber).gte(0),
    `${label} should be non-negative, instead got ${formatValue(value)}`,
  );
}

/**
 * Asserts that a value is of type `number`.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertNumber(value: unknown, label: string): void {
  assert.equal(
    typeof value,
    'number',
    `${label} should be a number, instead got ${formatValue(value)}`,
  );
}

/**
 * Asserts that a value is a string. Empty strings are accepted; use
 * {@link assertNonEmptyString} when a non-empty value is required.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertString(value: unknown, label: string): void {
  assert.equal(
    typeof value,
    'string',
    `${label} should be a string, instead got ${formatValue(value)}`,
  );
  assert.ok((value as string).length > 0, `${label} should not be empty`);
}

/**
 * Asserts that a value is either `null` or a non-empty string, for backend fields that are genuinely absent
 * rather than empty (e.g. an unclaimed username).
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertNullableString(value: unknown, label: string): void {
  if (value === null) {
    return;
  }
  assertString(value, label);
}

/**
 * Asserts that a value is a non-empty string.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertNonEmptyString(value: unknown, label: string): void {
  assert.equal(
    typeof value,
    'string',
    `${label} should be a string, instead got ${formatValue(value)}`,
  );
  assert.ok((value as string).length > 0, `${label} should not be empty`);
}

/**
 * Asserts that a value is of type `boolean`.
 *
 * @param value - The value to check.
 * @param label - Human-readable label included in the failure message.
 */
export function assertBoolean(value: unknown, label: string): void {
  assert.equal(
    typeof value,
    'boolean',
    `${label} should be a boolean, instead got ${formatValue(value)}`,
  );
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
    `${label} should be a record object, instead got ${formatValue(value)}`,
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
    `${label} should be one of [${validValues.join(', ')}], instead got ${formatValue(value)}`,
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
