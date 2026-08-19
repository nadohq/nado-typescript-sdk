/**
 * Structural validation for decoded Nuanze response bodies.
 *
 * Validation is field-specific and mirrors the published contract's own
 * patterns, so a decimal that is not a finite base-10 string or a timestamp
 * without a `Z` suffix is rejected rather than silently coerced. Violations
 * throw {@link NuanzeSchemaViolationError}, which the transport converts into a
 * `NuanzeResponseError` carrying the status, request ID, and a bounded body
 * preview.
 *
 * @internal
 */

/** Finite base-10 decimal string, per the contract's `DecimalString`. */
const DECIMAL_STRING = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;

/** UTC RFC 3339 timestamp with a required `Z`, per the contract's `IsoTimestamp`. */
const ISO_TIMESTAMP =
  /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/;

/** `YYYY-MM-DD` calendar day, per the contract's `CalendarDate`. */
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Lowercase EVM address, per the contract's `Address`. */
const ADDRESS = /^0x[0-9a-f]{40}$/;

/**
 * A response body did not match the published contract.
 *
 * Internal to the package: the transport catches it and rethrows a
 * `NuanzeResponseError` once the response metadata is in scope.
 *
 * @internal
 */
export class NuanzeSchemaViolationError extends Error {
  /** Dotted path to the offending field, for example `markets[0].minSize`. */
  readonly pointer: string;

  constructor(pointer: string, detail: string) {
    super(`${pointer}: ${detail}`);
    this.name = 'NuanzeSchemaViolationError';
    this.pointer = pointer;
  }
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value;
}

/**
 * Assert a value is a plain JSON object.
 *
 * @internal
 */
export function objectAt(
  value: unknown,
  pointer: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected an object, received ${describe(value)}`,
    );
  }
  return value as Record<string, unknown>;
}

/**
 * Assert a value is an array.
 *
 * @internal
 */
export function arrayAt(value: unknown, pointer: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected an array, received ${describe(value)}`,
    );
  }
  return value;
}

/**
 * Assert a value is a string.
 *
 * @internal
 */
export function stringAt(value: unknown, pointer: string): string {
  if (typeof value !== 'string') {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected a string, received ${describe(value)}`,
    );
  }
  return value;
}

/**
 * Assert a value is a safe non-negative integer.
 *
 * @internal
 */
export function integerAt(value: unknown, pointer: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected a safe integer, received ${describe(value)}`,
    );
  }
  return value;
}

/**
 * Assert a value is one of a closed set of contract enum members.
 *
 * @internal
 */
export function enumAt<T extends string>(
  value: unknown,
  allowed: readonly T[],
  pointer: string,
): T {
  const candidate = stringAt(value, pointer);
  if (!allowed.includes(candidate as T)) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected one of ${allowed.join(', ')}, received ${candidate}`,
    );
  }
  return candidate as T;
}

/**
 * Assert a value is a finite base-10 decimal string.
 *
 * Returns the string unchanged; conversion to `NuanzeDecimal` happens in the
 * data mappers so mapping stays field-specific.
 *
 * @internal
 */
export function decimalStringAt(value: unknown, pointer: string): string {
  const candidate = stringAt(value, pointer);
  if (!DECIMAL_STRING.test(candidate)) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected a finite base-10 decimal string, received ${candidate}`,
    );
  }
  return candidate;
}

/**
 * Assert a value is a UTC ISO 8601 timestamp with a `Z` suffix.
 *
 * Kept as a string: Nuanze client models never convert timestamps to `Date`.
 *
 * @internal
 */
export function isoTimestampAt(value: unknown, pointer: string): string {
  const candidate = stringAt(value, pointer);
  if (!ISO_TIMESTAMP.test(candidate) || Number.isNaN(Date.parse(candidate))) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected a UTC ISO 8601 timestamp, received ${candidate}`,
    );
  }
  return candidate;
}

/**
 * Assert a value is a `YYYY-MM-DD` calendar day.
 *
 * @internal
 */
export function calendarDateAt(value: unknown, pointer: string): string {
  const candidate = stringAt(value, pointer);
  if (!CALENDAR_DATE.test(candidate)) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected a YYYY-MM-DD calendar date, received ${candidate}`,
    );
  }
  return candidate;
}

/**
 * Assert a value is a lowercase EVM address.
 *
 * @internal
 */
export function addressAt(value: unknown, pointer: string): string {
  const candidate = stringAt(value, pointer);
  if (!ADDRESS.test(candidate)) {
    throw new NuanzeSchemaViolationError(
      pointer,
      `expected a lowercase EVM address, received ${candidate}`,
    );
  }
  return candidate;
}

/**
 * Apply a validator to a field that the contract declares nullable.
 *
 * Distinguishes an explicit `null` from a missing key: `undefined` is a contract
 * violation for a required nullable field.
 *
 * @internal
 */
export function nullableAt<T>(
  value: unknown,
  pointer: string,
  validate: (value: unknown, pointer: string) => T,
): T | null {
  if (value === null) return null;
  if (value === undefined) {
    throw new NuanzeSchemaViolationError(
      pointer,
      'expected a value or null, received undefined',
    );
  }
  return validate(value, pointer);
}
