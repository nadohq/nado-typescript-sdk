import { describe, expect, it } from '@jest/globals';
import {
  NUANZE_DEFAULT_CACHE_ENTRIES,
  NuanzeResponseCache,
} from './responseCache';

/** Cache policy the API returns for data responses. */
const FRESH_15S = 'public, max-age=15, stale-while-revalidate=60';

const BODY = { markets: [], count: 0 };

describe('NuanzeResponseCache', () => {
  it('stores a body for as long as max-age allows', () => {
    const cache = new NuanzeResponseCache();

    cache.set('key', BODY, FRESH_15S, 1_000);

    expect(cache.get('key', 1_000)).toBe(BODY);
    expect(cache.get('key', 15_999)).toBe(BODY);
  });

  it('drops an entry the moment its freshness expires', () => {
    const cache = new NuanzeResponseCache();

    cache.set('key', BODY, 'max-age=15', 1_000);

    expect(cache.get('key', 16_000)).toBeUndefined();
    // The expired entry is evicted rather than lingering for a later probe.
    expect(cache.get('key', 1_000)).toBeUndefined();
  });

  it('reports a miss for a key it never stored', () => {
    expect(new NuanzeResponseCache().get('absent')).toBeUndefined();
  });

  it('ignores a policy that forbids caching', () => {
    const cache = new NuanzeResponseCache();

    for (const policy of [
      'no-store',
      'no-cache',
      'private, no-store, max-age=15',
    ]) {
      cache.set(policy, BODY, policy, 1_000);
      expect(cache.get(policy, 1_000)).toBeUndefined();
    }
  });

  it('ignores a missing, zero, or unparseable max-age', () => {
    const cache = new NuanzeResponseCache();

    for (const policy of [
      null,
      'public',
      'max-age=0',
      'max-age=abc',
      'smax-age=30',
    ]) {
      const key = String(policy);
      cache.set(key, BODY, policy, 1_000);
      expect(cache.get(key, 1_000)).toBeUndefined();
    }
  });

  it('reads max-age only as its own directive', () => {
    const cache = new NuanzeResponseCache();

    // `stale-while-revalidate` must not be mistaken for the freshness lifetime.
    cache.set(
      'key',
      BODY,
      'public, stale-while-revalidate=60, max-age=15',
      1_000,
    );

    expect(cache.get('key', 16_000)).toBeUndefined();
  });

  it('never honors more freshness than the caller allows', () => {
    const capped = new NuanzeResponseCache({ maxAgeCapSeconds: 5 });

    capped.set('key', BODY, FRESH_15S, 1_000);

    expect(capped.get('key', 5_999)).toBe(BODY);
    expect(capped.get('key', 6_000)).toBeUndefined();
  });

  it('caches nothing when the caller allows no staleness at all', () => {
    const uncached = new NuanzeResponseCache({ maxAgeCapSeconds: 0 });

    uncached.set('key', BODY, FRESH_15S, 1_000);

    expect(uncached.get('key', 1_000)).toBeUndefined();
  });

  it('does not extend a policy shorter than the cap', () => {
    const capped = new NuanzeResponseCache({ maxAgeCapSeconds: 60 });

    capped.set('key', BODY, 'max-age=15', 1_000);

    expect(capped.get('key', 16_000)).toBeUndefined();
  });

  it('evicts the least recently used entry once full', () => {
    const cache = new NuanzeResponseCache({ maxEntries: 2 });

    cache.set('a', 'A', 'max-age=60', 1_000);
    cache.set('b', 'B', 'max-age=60', 1_000);
    // Reading 'a' makes 'b' the least recently used.
    expect(cache.get('a', 1_000)).toBe('A');

    cache.set('c', 'C', 'max-age=60', 1_000);

    expect(cache.get('b', 1_000)).toBeUndefined();
    expect(cache.get('a', 1_000)).toBe('A');
    expect(cache.get('c', 1_000)).toBe('C');
  });

  it('overwrites an existing key rather than growing', () => {
    const cache = new NuanzeResponseCache({ maxEntries: 1 });

    cache.set('key', 'first', 'max-age=60', 1_000);
    cache.set('key', 'second', 'max-age=60', 1_000);

    expect(cache.get('key', 1_000)).toBe('second');
  });

  it('defaults to a bounded number of entries', () => {
    expect(NUANZE_DEFAULT_CACHE_ENTRIES).toBe(128);

    const cache = new NuanzeResponseCache();
    for (let i = 0; i <= NUANZE_DEFAULT_CACHE_ENTRIES; i++) {
      cache.set(`key-${String(i)}`, i, 'max-age=60', 1_000);
    }

    expect(cache.get('key-0', 1_000)).toBeUndefined();
    expect(
      cache.get(`key-${String(NUANZE_DEFAULT_CACHE_ENTRIES)}`, 1_000),
    ).toBe(NUANZE_DEFAULT_CACHE_ENTRIES);
  });
});
