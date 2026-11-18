import BigNumber from 'bignumber.js';

/**
 * Util for converting any BigNumber types into a string so that it can be logged nicely.
 * Handles cyclic references by returning '[Circular]' for an object that contains itself.
 * An object referenced more than once without a cycle is printed each time.
 */
export function toPrintableObject(
  obj: null | undefined,
  seen?: WeakSet<object>,
): null;
export function toPrintableObject(
  obj: BigNumber | bigint,
  seen?: WeakSet<object>,
): string;
export function toPrintableObject(obj: unknown, seen?: WeakSet<object>): object;
export function toPrintableObject(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (obj instanceof BigNumber || typeof obj === 'bigint') {
    return obj.toString();
  }
  if (typeof obj === 'object') {
    // Detect cyclic references: `seen` holds the objects on the path from the root to `obj`
    if (seen.has(obj)) {
      return '[Circular]';
    }
    seen.add(obj);

    try {
      if (Array.isArray(obj)) {
        return obj.map((item) => toPrintableObject(item, seen));
      }

      try {
        return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [
            key,
            toPrintableObject(value, seen),
          ]),
        );
      } catch {
        return { error: '[Unserializable Object]' };
      }
    } finally {
      seen.delete(obj);
    }
  }
  return obj;
}
