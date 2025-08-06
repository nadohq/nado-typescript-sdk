import { toPrintableObject } from '@nadohq/utils';

/**
 * Logs a labeled, pretty-printed version of an object to the console
 * when DEBUG mode is enabled. Uses `toPrintableObject` to ensure
 * the object is serializable and readable.
 */
export function debugPrint(label: string, obj: unknown) {
  if (process.env.DEBUG) {
    console.log(label);
    console.log(JSON.stringify(toPrintableObject(obj), null, 2));
  }
}
