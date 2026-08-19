import { describe, expect, it } from '@jest/globals';
import { NuanzeConcurrencyGate } from './concurrencyGate';

/** A promise plus the handles to settle it, so tests control timing exactly. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Yields long enough for all pending microtasks to run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('NuanzeConcurrencyGate', () => {
  it('runs a task immediately when a slot is free', async () => {
    const gate = new NuanzeConcurrencyGate(1);

    await expect(gate.run(() => Promise.resolve('done'))).resolves.toBe('done');
  });

  it('holds a task until a slot frees up', async () => {
    const gate = new NuanzeConcurrencyGate(1);
    const first = deferred();
    let secondStarted = false;

    const firstRun = gate.run(() => first.promise);
    const secondRun = gate.run(() => {
      secondStarted = true;
      return Promise.resolve();
    });

    await flush();
    expect(secondStarted).toBe(false);

    first.resolve();
    await Promise.all([firstRun, secondRun]);
    expect(secondStarted).toBe(true);
  });

  it('never exceeds the configured width under a burst', async () => {
    const gate = new NuanzeConcurrencyGate(2);
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()];
    let active = 0;
    let peak = 0;

    const runs = gates.map((task) =>
      gate.run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await task.promise;
        active -= 1;
      }),
    );

    await flush();
    expect(peak).toBe(2);

    for (const task of gates) {
      task.resolve();
      await flush();
    }

    await Promise.all(runs);
    expect(peak).toBe(2);
  });

  it('starts queued tasks in arrival order', async () => {
    const gate = new NuanzeConcurrencyGate(1);
    const blocker = deferred();
    const started: number[] = [];

    const runs = [
      gate.run(() => blocker.promise),
      ...[1, 2, 3].map((id) =>
        gate.run(() => {
          started.push(id);
          return Promise.resolve();
        }),
      ),
    ];

    blocker.resolve();
    await Promise.all(runs);

    expect(started).toEqual([1, 2, 3]);
  });

  it('frees the slot when a task fails, so the queue cannot deadlock', async () => {
    const gate = new NuanzeConcurrencyGate(1);

    await expect(
      gate.run(() => Promise.reject(new Error('request failed'))),
    ).rejects.toThrow('request failed');

    await expect(gate.run(() => Promise.resolve('next'))).resolves.toBe('next');
  });

  it('releases a waiting task even when the holder fails', async () => {
    const gate = new NuanzeConcurrencyGate(1);
    const failing = deferred();
    let followerRan = false;

    const first = gate.run(() => failing.promise);
    const second = gate.run(() => {
      followerRan = true;
      return Promise.resolve();
    });

    failing.reject(new Error('boom'));

    await expect(first).rejects.toThrow('boom');
    await second;
    expect(followerRan).toBe(true);
  });
});
