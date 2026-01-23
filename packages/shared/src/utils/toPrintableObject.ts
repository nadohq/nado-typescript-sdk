import { BigDecimal } from './math/bigDecimal';

/**
 * Util for converting any BigDecimal types into a string so that it can be logged nicely.
 * Handles cyclic references by returning '[Circular]' for already-visited objects.
 */
export function toPrintableObject(obj: null, seen?: WeakSet<object>): null;
export function toPrintableObject(
  obj: BigDecimal | bigint,
  seen?: WeakSet<object>,
): string;
export function toPrintableObject(obj: unknown, seen?: WeakSet<object>): object;
export function toPrintableObject(obj: unknown, seen = new WeakSet()): unknown {
  if (obj == null) {
    return null;
  }
  if (obj instanceof BigDecimal || typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toPrintableObject(item, seen));
  }
  if (typeof obj === 'object') {
    // Detect cyclic references
    if (seen.has(obj)) {
      return '[Circular]';
    }
    seen.add(obj);

    try {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          toPrintableObject(value, seen),
        ]),
      );
    } catch {
      return '[Unserializable Object]';
    }
  }
  return obj;
}
