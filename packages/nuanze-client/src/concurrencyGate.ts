/**
 * Bounds how many requests are in flight at once.
 *
 * Opt-in. The Nuanze rate limiter is a token bucket of 150 weighted units that
 * refills at 2 units per second, so an unbounded fan-out can drain a full
 * bucket long before the first response arrives. Serializing past a chosen
 * width keeps a burst inside the refill rate without the client ever sleeping
 * on `Retry-After`.
 *
 * @internal
 */
export class NuanzeConcurrencyGate {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  /**
   * Run a task once a slot is free, releasing the slot when it settles.
   *
   * Queued tasks start in arrival order.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }

    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}
