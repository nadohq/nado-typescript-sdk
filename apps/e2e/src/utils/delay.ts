/**
 * Returns a promise that resolves after a specified delay.
 *
 * E2E tests hit shared testnet infrastructure (engine, indexer, trigger)
 * that enforces per-address rate limits. Sequential test cases within a
 * suite can easily exceed those limits, causing spurious 429 / timeout
 * failures. Inserting a short pause between requests keeps the request
 * rate safely below the limit and lets asynchronous backend processes
 * (e.g. order indexing, state propagation) settle before the next
 * assertion runs.
 *
 * @param ms - The number of milliseconds to wait
 * @returns A Promise that resolves after the given delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
