/**
 * Returns a promise that resolves after a specified delay.
 *
 * @param ms - The number of milliseconds to wait
 * @returns A Promise that resolves after the given delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
