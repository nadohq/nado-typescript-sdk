import { BigDecimal } from './math/bigDecimal';

/**
 * Util for converting any BigDecimal types into a string so that it can be logged nicely
 */
export function toPrintableObject(obj: unknown): unknown {
  if (obj == null) {
    return null;
  }
  if (obj instanceof BigDecimal || typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(toPrintableObject);
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        toPrintableObject(value),
      ]),
    );
  }
  return obj;
}
