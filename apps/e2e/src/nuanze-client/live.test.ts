import {
  NUANZE_API_BASE_URL,
  NUANZE_MARKET_TRADING_STATUSES,
  NUANZE_MARKET_VENUES,
  NuanzeApiError,
  NuanzeClient,
  NuanzeConfigError,
  NuanzeTimeoutError,
  type NuanzeMarket,
  type NuanzeResponseMeta,
} from '@nadohq/nuanze-client';
import axios from 'axios';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import {
  assertBigNumberFinite,
  assertBigNumberPositive,
  assertDefined,
  assertEnumMember,
  assertNonEmptyArray,
  assertNonEmptyString,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';

/** UTC ISO 8601 with a required `Z`, as the contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Rate-limit units `GET /markets` costs, per the published weights. */
const LIST_MARKETS_WEIGHT = 2;

/**
 * Asserts the invariants a market satisfies regardless of market conditions.
 *
 * Prices and volumes move constantly, so only shapes, types, and relations are
 * checked, never exact values.
 */
function assertMarketShape(market: NuanzeMarket, label: string): void {
  assertNumber(market.productId, `${label}.productId`);
  assert.ok(market.productId >= 0, `${label}.productId should be non-negative`);
  assertNonEmptyString(market.symbol, `${label}.symbol`);
  assertNonEmptyString(market.ticker, `${label}.ticker`);
  assertEnumMember(market.venue, NUANZE_MARKET_VENUES, `${label}.venue`);
  assertEnumMember(
    market.tradingStatus,
    NUANZE_MARKET_TRADING_STATUSES,
    `${label}.tradingStatus`,
  );
  assertBigNumberPositive(market.priceIncrement, `${label}.priceIncrement`);
  assertBigNumberPositive(market.sizeIncrement, `${label}.sizeIncrement`);
  assertBigNumberPositive(market.minSize, `${label}.minSize`);
  assert.match(
    market.updatedAt,
    ISO_UTC,
    `${label}.updatedAt should be a UTC ISO timestamp`,
  );

  if (market.venue === 'perp') {
    assert.equal(
      market.productId % 2,
      0,
      `${label}.productId should be even, since perps use even product IDs`,
    );
  }

  if (market.latest === null) return;

  assert.match(
    market.latest.updatedAt,
    ISO_UTC,
    `${label}.latest.updatedAt should be a UTC ISO timestamp`,
  );

  // Every ticker field is nullable, so each is checked only when populated.
  for (const [field, value] of Object.entries(market.latest)) {
    if (field === 'updatedAt' || value === null) continue;
    assertBigNumberFinite(value, `${label}.latest.${field}`);
  }

  const { bidPrice, askPrice } = market.latest;
  if (bidPrice !== null && askPrice !== null) {
    assert.ok(
      askPrice.gte(bidPrice),
      `${label}.latest ask ${askPrice.toString()} should not be below bid ${bidPrice.toString()}`,
    );
  }
}

void describe(
  '[nuanze-client]: live api.nuanze.co',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let client: NuanzeClient;

    before(() => {
      client = new NuanzeClient({ userAgent: 'nado-sdk-e2e/0.1.0' });
      assert.equal(client.baseUrl, NUANZE_API_BASE_URL);
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void describe('listMarkets', () => {
      void test('returns the whole universe, ordered by product ID', async () => {
        let meta: NuanzeResponseMeta | undefined;
        const response = await client.listMarkets(
          {},
          { onResponse: (observed) => (meta = observed) },
        );

        debugPrint('Nuanze markets', response.count);
        assertNonEmptyArray(response.markets, 'markets');
        assert.equal(
          response.count,
          response.markets.length,
          'count must agree with the list, since the API never truncates it',
        );
        assert.match(
          response.asOf,
          ISO_UTC,
          'asOf should be a UTC ISO timestamp',
        );

        for (let i = 0; i < response.markets.length; i++) {
          assertMarketShape(response.markets[i], `markets[${i}]`);
          if (i > 0) {
            assert.ok(
              response.markets[i].productId > response.markets[i - 1].productId,
              'markets must be strictly ascending by product ID',
            );
          }
        }

        assertDefined(meta, 'response metadata');
        assert.equal(meta.status, 200);
        assert.equal(meta.fromCache, false);
        assertDefined(meta.requestId, 'meta.requestId');
        assertDefined(meta.etag, 'meta.etag');
        assertNonEmptyString(meta.etag, 'meta.etag');
      });

      void test('maps decimals to decimals and leaves everything else on the wire type', async () => {
        const { markets, count, asOf } = await client.listMarkets({
          venue: 'perp',
        });

        assert.ok(markets.length > 0, 'expected at least one perp market');
        const market = markets[0];

        assertBigNumberPositive(market.priceIncrement, 'priceIncrement');
        assertBigNumberPositive(market.sizeIncrement, 'sizeIncrement');
        assertBigNumberPositive(market.minSize, 'minSize');

        assert.ok(
          Number.isSafeInteger(market.productId),
          'a numeric ID must stay a plain integer rather than becoming a decimal',
        );
        assert.ok(
          Number.isSafeInteger(count),
          'count must stay a plain integer',
        );
        assert.equal(typeof market.symbol, 'string');
        assert.equal(typeof market.venue, 'string');
        assert.equal(
          typeof asOf,
          'string',
          'timestamps stay ISO strings and are never converted to Date',
        );
        assert.equal(typeof market.updatedAt, 'string');
      });

      void test('filters by venue', async () => {
        const { markets } = await client.listMarkets({ venue: 'spot' });

        assertNonEmptyArray(markets, 'spot markets');
        for (const market of markets) {
          assert.equal(market.venue, 'spot');
        }
      });

      void test('filters by tradability', async () => {
        const { markets } = await client.listMarkets({ tradingStatus: 'live' });

        assertNonEmptyArray(markets, 'live markets');
        for (const market of markets) {
          assert.equal(market.tradingStatus, 'live');
        }
      });

      void test('filters by ticker, case-insensitively', async () => {
        const { markets } = await client.listMarkets({ venue: 'perp' });
        assert.ok(markets.length > 0, 'expected at least one perp market');
        const { ticker } = markets[0];

        await delay(TEST_DELAYS.SHORT);
        const exact = await client.listMarkets({ ticker });
        await delay(TEST_DELAYS.SHORT);
        const lowercased = await client.listMarkets({
          ticker: ticker.toLowerCase(),
        });

        assertNonEmptyArray(exact.markets, `markets for ticker ${ticker}`);
        for (const market of exact.markets) {
          assert.equal(market.ticker, ticker);
        }
        assert.deepEqual(
          lowercased.markets.map((market) => market.productId),
          exact.markets.map((market) => market.productId),
          'ticker matching should ignore case',
        );
      });

      void test('reports an unmatched ticker as an empty universe, not an error', async () => {
        const response = await client.listMarkets({ ticker: 'NOTATICKER' });

        assert.deepEqual(response.markets, []);
        assert.equal(response.count, 0);
        assert.match(response.asOf, ISO_UTC);
      });
    });

    void describe('request metadata', () => {
      void test('reports the weighted rate-limit budget it consumed', async () => {
        let meta: NuanzeResponseMeta | undefined;
        await client.listMarkets(
          {},
          { onResponse: (observed) => (meta = observed) },
        );

        assertDefined(meta, 'response metadata');
        debugPrint('Nuanze rate limit', meta.rateLimit);

        const { limit, remaining, reset, retryAfterSeconds } = meta.rateLimit;
        assertDefined(limit, 'rateLimit.limit');
        assertDefined(remaining, 'rateLimit.remaining');
        assertDefined(reset, 'rateLimit.reset');

        assert.ok(
          limit > 0,
          'the advertised bucket capacity should be positive',
        );
        assert.ok(remaining >= 0, 'remaining units cannot be negative');
        assert.ok(
          remaining <= limit - LIST_MARKETS_WEIGHT,
          `remaining ${String(remaining)} should reflect the ${String(LIST_MARKETS_WEIGHT)}-unit charge against ${String(limit)}`,
        );
        assert.equal(
          retryAfterSeconds,
          null,
          'a successful read must not ask the caller to back off',
        );
        assert.deepEqual(client.lastRateLimit, meta.rateLimit);
      });

      void test('reports the reset as an absolute Unix epoch, not a duration', async () => {
        let meta: NuanzeResponseMeta | undefined;
        await client.listMarkets(
          {},
          { onResponse: (observed) => (meta = observed) },
        );

        assertDefined(meta, 'response metadata');
        assertDefined(meta.rateLimit.reset, 'rateLimit.reset');

        const nowSeconds = Math.floor(Date.now() / 1_000);
        assert.ok(
          meta.rateLimit.reset > nowSeconds - 60 &&
            meta.rateLimit.reset < nowSeconds + 3_600,
          `reset ${String(meta.rateLimit.reset)} should be an epoch near ${String(nowSeconds)}`,
        );
      });

      void test('echoes a caller-supplied correlation ID', async () => {
        const requestId = `nado-sdk-e2e-${String(Date.now())}`;

        let meta: NuanzeResponseMeta | undefined;
        await client.listMarkets(
          {},
          { requestId, onResponse: (observed) => (meta = observed) },
        );

        assertDefined(meta, 'response metadata');
        assert.equal(
          meta.requestId,
          requestId,
          'the API honors a well-formed X-Request-Id, so the client can correlate logs',
        );
      });

      void test('generates a correlation ID when the caller supplies none', async () => {
        let meta: NuanzeResponseMeta | undefined;
        await client.listMarkets(
          {},
          { onResponse: (observed) => (meta = observed) },
        );

        assertDefined(meta, 'response metadata');
        assertDefined(meta.requestId, 'meta.requestId');
        assertNonEmptyString(meta.requestId, 'meta.requestId');
      });
    });

    void describe('failure handling', () => {
      void test('surfaces a documented error envelope for an unsupported filter', async () => {
        const startedAtMs = Date.now();
        const error = await client
          .listMarkets({
            // @ts-expect-error - deliberately outside the contract's venue enum
            venue: 'options',
          })
          .then(
            () => assert.fail('expected the API to reject an invalid venue'),
            (thrown: unknown) => thrown,
          );

        assert.ok(
          error instanceof NuanzeApiError,
          'expected a documented error envelope',
        );
        assert.equal(error.status, 400);
        assert.equal(error.code, 'BAD_REQUEST');
        assertNonEmptyString(error.message, 'error.message');
        assertDefined(error.requestId, 'error.requestId');
        assertNonEmptyString(error.requestId, 'error.requestId');
        assert.ok(
          Date.now() - startedAtMs < client.transport.timeoutMs,
          'a rejected request must fail on the first attempt rather than being retried',
        );
      });

      void test('times out when the budget is shorter than the round trip', async () => {
        const error = await client.listMarkets({}, { timeoutMs: 1 }).then(
          () => assert.fail('expected a 1ms budget to expire'),
          (thrown: unknown) => thrown,
        );

        assert.ok(error instanceof NuanzeTimeoutError);
        assert.equal(error.timeoutMs, 1);
        assert.equal(error.path, '/markets');
      });

      void test('rejects a lengthened per-request timeout before dispatching', async () => {
        await assert.rejects(
          () =>
            client.listMarkets(
              {},
              { timeoutMs: client.transport.timeoutMs + 1 },
            ),
          NuanzeConfigError,
        );
      });

      void test('preserves cancellation instead of reporting a timeout', async () => {
        const controller = new AbortController();
        const pending = client.listMarkets({}, { signal: controller.signal });
        controller.abort();

        const error = await pending.then(
          () => assert.fail('expected a cancellation'),
          (thrown: unknown) => thrown,
        );

        assert.ok(
          axios.isCancel(error),
          'cancellation must stay an axios CanceledError',
        );
        assert.equal(error instanceof NuanzeTimeoutError, false);
        assert.equal(error instanceof NuanzeApiError, false);
      });
    });

    void describe('opt-in response cache', () => {
      void test('is off by default, so each read gets fresh metadata', async () => {
        const metas: NuanzeResponseMeta[] = [];
        const onResponse = (observed: NuanzeResponseMeta) =>
          metas.push(observed);

        await client.listMarkets({}, { onResponse });
        await delay(TEST_DELAYS.SHORT);
        await client.listMarkets({}, { onResponse });

        assert.equal(metas.length, 2);
        for (const meta of metas) {
          assert.equal(meta.fromCache, false);
        }
        assert.notEqual(
          metas[0].requestId,
          metas[1].requestId,
          'two uncached reads must be two distinct requests',
        );
      });

      void test('serves a repeat read locally while the API max-age allows', async () => {
        const cached = new NuanzeClient({ cache: {} });

        const first = await cached.listMarkets({ venue: 'perp' });
        let meta: NuanzeResponseMeta | undefined;
        const second = await cached.listMarkets(
          { venue: 'perp' },
          { onResponse: (observed) => (meta = observed) },
        );

        assertDefined(meta, 'cached response metadata');
        assert.equal(meta.fromCache, true);
        assert.equal(
          meta.requestId,
          null,
          'a cache hit never reached the API, so it carries no correlation ID',
        );
        assert.equal(
          meta.rateLimit.limit,
          null,
          'a cache hit is not charged, so it reports no rate-limit state',
        );

        assert.equal(second.count, first.count);
        assert.notEqual(
          second.markets[0].minSize,
          first.markets[0].minSize,
          'each hit decodes fresh values rather than sharing mutable decimals',
        );
        assert.ok(
          second.markets[0].minSize.isEqualTo(first.markets[0].minSize),
        );
      });

      void test('never outlives a caller-imposed freshness cap', async () => {
        // The API states max-age=15; this caller allows none of it.
        const uncached = new NuanzeClient({ cache: { maxAgeCapSeconds: 0 } });

        await uncached.listMarkets({ venue: 'spot' });
        let meta: NuanzeResponseMeta | undefined;
        await uncached.listMarkets(
          { venue: 'spot' },
          { onResponse: (observed) => (meta = observed) },
        );

        assertDefined(meta, 'response metadata');
        assert.equal(meta.fromCache, false);
      });

      void test('keys on the query, so a different filter is a fresh read', async () => {
        const cached = new NuanzeClient({ cache: {} });

        await cached.listMarkets({ venue: 'perp' });
        let meta: NuanzeResponseMeta | undefined;
        await cached.listMarkets(
          { venue: 'spot' },
          { onResponse: (observed) => (meta = observed) },
        );

        assertDefined(meta, 'response metadata');
        assert.equal(meta.fromCache, false);
      });
    });

    void test('completes a burst under a concurrency cap', async () => {
      const capped = new NuanzeClient({ maxConcurrentRequests: 1 });

      const responses = await Promise.all([
        capped.listMarkets({ venue: 'perp' }),
        capped.listMarkets({ venue: 'spot' }),
        capped.listMarkets({ tradingStatus: 'live' }),
      ]);

      for (const response of responses) {
        assert.equal(response.count, response.markets.length);
      }
    });
  },
);
