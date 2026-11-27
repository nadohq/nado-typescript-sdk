import assert from 'node:assert/strict';

/**
 * Asserts that a live response value is a non-array object before inspecting its wire fields.
 * @param value - Unvalidated response value.
 * @param label - Description included in assertion failures.
 * @returns The object with unknown field values.
 */
export function asRecord(
  value: unknown,
  label = 'value',
): Record<string, unknown> {
  assert.ok(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object.`,
  );
  return value as Record<string, unknown>;
}
