import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
} from '@nadohq/mobile-client';
import { addDecimals, ProductEngineType, removeDecimals } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  getMobilePositionTestOrder,
  waitForMobilePositionRead,
} from './mobilePositionTestUtils';

function unavailable(
  httpStatus = 503,
  errorCode: number = MOBILE_ERROR_CODES.SOCIAL_FEED_DATA_UNAVAILABLE,
) {
  return new MobileServerFailureError(
    {
      status: 'failure',
      error: 'Position projection not ready',
      error_code: errorCode,
      request_type: 'public_query_self_feed_positions',
    },
    httpStatus,
  );
}

const fastReadOptions = {
  phase: 'regression test',
  timeoutMs: 1_000,
  initialDelayMs: 1,
  maxDelayMs: 2,
};

void describe('Mobile position read safety', () => {
  void test('returns a ready response without retrying', async () => {
    let reads = 0;
    const result = await waitForMobilePositionRead(() => {
      reads++;
      return Promise.resolve('ready');
    }, fastReadOptions);
    assert.equal(result, 'ready');
    assert.equal(reads, 1);
  });

  void test('retries 503/6320 and successful but unready projections without resubmitting an order', async () => {
    let reads = 0;
    let orders = 0;
    const submitOrder = () => {
      orders++;
    };
    submitOrder();
    const result = await waitForMobilePositionRead(
      () => {
        reads++;
        if (reads === 1) return Promise.reject(unavailable());
        return Promise.resolve(reads >= 3 ? ['new-position'] : []);
      },
      {
        ...fastReadOptions,
        isReady: (positions) => positions.includes('new-position'),
      },
    );
    assert.deepEqual(result, ['new-position']);
    assert.equal(reads, 3);
    assert.equal(orders, 1);
  });

  for (const error of [
    unavailable(500),
    unavailable(200),
    unavailable(429),
    unavailable(503, MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS),
    new Error('Connection failed'),
  ]) {
    void test(
      'immediately propagates non-retryable error: ' +
        error.message +
        ('httpStatus' in error ? ' HTTP ' + String(error.httpStatus) : ''),
      async () => {
        let reads = 0;
        await assert.rejects(
          waitForMobilePositionRead(() => {
            reads++;
            return Promise.reject(error);
          }, fastReadOptions),
          (actual: unknown) => actual === error,
        );
        assert.equal(reads, 1);
      },
    );
  }

  void test('retains the transient failure and phase when the shared deadline expires', async () => {
    const error = unavailable();
    await assert.rejects(
      waitForMobilePositionRead(() => Promise.reject(error), {
        ...fastReadOptions,
        phase: 'pre-order baseline',
        timeoutMs: 25,
      }),
      (actual: unknown) => {
        assert.ok(actual instanceof Error);
        assert.match(actual.message, /pre-order baseline.*budget 25ms/);
        assert.equal(actual.cause, error);
        return true;
      },
    );
  });

  void test('bounds empty successful responses without resetting the deadline', async () => {
    await assert.rejects(
      waitForMobilePositionRead(() => Promise.resolve([]), {
        ...fastReadOptions,
        phase: 'post-order projection',
        timeoutMs: 25,
        isReady: () => false,
      }),
      /post-order projection.*budget 25ms/,
    );
  });

  void test('bounds an in-flight request that never settles', async () => {
    let reads = 0;
    await assert.rejects(
      waitForMobilePositionRead(
        () => {
          reads++;
          return new Promise<never>(() => {});
        },
        { ...fastReadOptions, timeoutMs: 25 },
      ),
      /budget 25ms/,
    );
    assert.equal(reads, 1);
  });

  void test('does not start a request after the phase budget is exhausted', async () => {
    let reads = 0;
    await assert.rejects(
      waitForMobilePositionRead(
        () => {
          reads++;
          return Promise.resolve('ready');
        },
        { ...fastReadOptions, timeoutMs: 0 },
      ),
      /budget 0ms/,
    );
    assert.equal(reads, 0);
  });
});

function market() {
  return {
    minSize: addDecimals('100'),
    sizeIncrement: addDecimals('0.00001'),
    priceIncrement: new BigNumber('0.5'),
    product: {
      type: ProductEngineType.PERP as const,
      productId: 2,
      oraclePrice: new BigNumber(80_000),
      longWeightInitial: new BigNumber('0.9'),
      longWeightMaintenance: new BigNumber('0.95'),
      shortWeightInitial: new BigNumber('1.1'),
      shortWeightMaintenance: new BigNumber('1.05'),
      openInterest: new BigNumber(0),
      cumulativeFundingLong: new BigNumber(0),
      cumulativeFundingShort: new BigNumber(0),
    },
  };
}

void describe('Mobile position order sizing safety', () => {
  void test('converts $100 into 0.00125 BTC instead of 100 BTC', () => {
    const order = getMobilePositionTestOrder(market());
    assert.equal(removeDecimals(order.amount).toFixed(), '0.00125');
    assert.equal(order.price.toFixed(), '88000');
    assert.equal(
      removeDecimals(order.amount).multipliedBy(order.price).toFixed(),
      '110',
    );
  });

  void test('rejects an excessive minimum notional', () => {
    assert.throws(
      () =>
        getMobilePositionTestOrder({
          ...market(),
          minSize: addDecimals('201'),
        }),
      /exceeds [$]200/,
    );
  });

  void test('checks the cap after rounding base amount to the size increment', () => {
    assert.throws(
      () =>
        getMobilePositionTestOrder({
          ...market(),
          sizeIncrement: addDecimals('0.003'),
        }),
      /exceeds [$]200/,
    );
  });

  void test('checks the limit price, not only the oracle notional', () => {
    assert.throws(
      () =>
        getMobilePositionTestOrder({
          ...market(),
          minSize: addDecimals('190'),
        }),
      /exceeds [$]200/,
    );
  });

  void test('allows exactly $200 but rejects a price increment that rounds above it', () => {
    const inputs = market();
    inputs.product.oraclePrice = new BigNumber(1);
    inputs.priceIncrement = new BigNumber(1);
    const order = getMobilePositionTestOrder(inputs);
    assert.equal(
      removeDecimals(order.amount).multipliedBy(order.price).toFixed(),
      '200',
    );
    inputs.priceIncrement = new BigNumber('1.01');
    assert.throws(() => getMobilePositionTestOrder(inputs), /exceeds [$]200/);
  });

  for (const invalid of [0, -1, NaN, Infinity]) {
    void test('rejects invalid market inputs: ' + invalid, () => {
      const inputs = market();
      inputs.product.oraclePrice = new BigNumber(invalid);
      assert.throws(
        () => getMobilePositionTestOrder(inputs),
        /finite and positive/,
      );
      assert.throws(
        () =>
          getMobilePositionTestOrder({
            ...market(),
            sizeIncrement: new BigNumber(invalid),
          }),
        /finite and positive/,
      );
    });
  }
});
