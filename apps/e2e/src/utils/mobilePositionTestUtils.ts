import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import { addDecimals, MarketWithProduct, removeDecimals } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { delay } from './delay';

/** Maximum time for each Mobile position-read phase, including requests and backoff. */
export const MOBILE_POSITION_WAIT_MS = 90_000;

/** Dedicated, non-isolated parent subaccount for the Mobile position lifecycle test. */
export const MOBILE_POSITION_SUBACCOUNT_NAME = 'e2emobfeed';

/** Bounds and readiness condition for a read-only Mobile position polling phase. */
export interface MobilePositionReadOptions<T> {
  /** Diagnostic name distinguishing pre-order reads from post-fill projection polling. */
  phase: string;
  /** Total phase budget in milliseconds, not a per-request timeout. */
  timeoutMs?: number;
  /** Initial exponential backoff delay in milliseconds. */
  initialDelayMs?: number;
  /** Maximum exponential backoff delay in milliseconds. */
  maxDelayMs?: number;
  /** Whether a successful response contains the expected projection. */
  isReady?: (value: T) => boolean;
}

/**
 * Waits for a read-only Mobile position query, retrying only HTTP 503/code 6320 or an unready result.
 * Never pass an order submission or another mutation to this helper.
 * @param read - Read-only request to repeat while the projection is unavailable.
 * @param options - Phase deadline, backoff, and optional readiness condition.
 * @returns The first ready response within the phase deadline.
 * @throws The original non-retryable error, or a phase-specific timeout with the last transient error.
 */
export async function waitForMobilePositionRead<T>(
  read: () => Promise<T>,
  options: MobilePositionReadOptions<T>,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? MOBILE_POSITION_WAIT_MS;
  const maxDelayMs = options.maxDelayMs ?? 5_000;
  let backoffMs = options.initialDelayMs ?? 500;
  const startedAt = performance.now();
  const deadline = startedAt + timeoutMs;
  let attempts = 0;
  let lastError: unknown;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutError = () =>
    new Error(
      options.phase +
        ': Mobile positions not ready after ' +
        Math.round(performance.now() - startedAt) +
        'ms (' +
        attempts +
        ' reads; budget ' +
        timeoutMs +
        'ms)',
      { cause: lastError },
    );
  const deadlineReached = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(timeoutError()), timeoutMs);
  });
  try {
    while (performance.now() < deadline) {
      attempts++;
      try {
        const value = await Promise.race([read(), deadlineReached]);
        if (performance.now() >= deadline) throw timeoutError();
        if (!options.isReady || options.isReady(value)) return value;
      } catch (error) {
        if (
          !(error instanceof MobileServerFailureError) ||
          error.httpStatus !== 503 ||
          error.errorCode !== MOBILE_ERROR_CODES.SOCIAL_FEED_DATA_UNAVAILABLE
        )
          throw error;
        lastError = error;
      }
      const remainingMs = deadline - performance.now();
      if (remainingMs <= 0) break;
      await Promise.race([
        delay(Math.min(backoffMs, maxDelayMs, remainingMs)),
        deadlineReached,
      ]);
      backoffMs = Math.min(backoffMs * 2, maxDelayMs);
    }
    throw timeoutError();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Builds a roughly $100 IOC buy, refusing a worst-case limit-price notional above $200.
 * Engine sizes and minimum quote notionals use x18 units; oracle and order prices do not.
 * @param market - Market increments, minimum quote notional, and oracle price.
 * @returns Rounded base amount and marketable limit price in engine client units.
 * @throws If market inputs are invalid or the rounded order exceeds the hard notional cap.
 */
export function getMobilePositionTestOrder(
  market: Pick<
    MarketWithProduct,
    'minSize' | 'sizeIncrement' | 'priceIncrement' | 'product'
  >,
): { amount: BigNumber; price: BigNumber } {
  for (const value of [
    market.minSize,
    market.sizeIncrement,
    market.priceIncrement,
    market.product.oraclePrice,
  ]) {
    assert.ok(
      value.isFinite() && value.gt(0),
      'Market inputs must be finite and positive',
    );
  }
  const amount = BigNumber.maximum(addDecimals('100'), market.minSize)
    .div(market.product.oraclePrice)
    .div(market.sizeIncrement)
    .integerValue(BigNumber.ROUND_CEIL)
    .multipliedBy(market.sizeIncrement);
  const price = market.product.oraclePrice
    .multipliedBy(1.1)
    .div(market.priceIncrement)
    .integerValue(BigNumber.ROUND_CEIL)
    .multipliedBy(market.priceIncrement);
  const notional = removeDecimals(amount).multipliedBy(price);
  assert.ok(
    notional.isFinite() && notional.gt(0) && notional.lte(200),
    'Refusing Mobile test order: limit-price notional $' +
      notional.toFixed() +
      ' exceeds $200 or is invalid',
  );
  return { amount, price };
}
