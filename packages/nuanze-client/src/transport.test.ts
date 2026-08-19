import { describe, expect, it } from '@jest/globals';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import {
  NuanzeApiError,
  NuanzeConfigError,
  NuanzeResponseError,
  NuanzeTimeoutError,
} from './errors';
import { NuanzeClient } from './NuanzeClient';
import {
  NUANZE_DEFAULT_TIMEOUT_MS,
  NUANZE_REQUEST_ID_PATTERN,
  serializeNuanzeQuery,
  type NuanzeClientOptions,
  type NuanzeResponseMeta,
} from './transport';

/** A canned HTTP outcome for the injected adapter. */
interface Stub {
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
  /**
   * Rejection to raise instead of responding, for transport-level failures.
   *
   * Typed as `Error` because axios only ever rejects with one, including
   * `AxiosError` and `CanceledError`.
   */
  reject?: Error;
}

/** A minimally valid `GET /markets` body, mapped by the real mapper. */
const EMPTY_BODY = { markets: [], count: 0, asOf: '2026-08-19T10:44:18.947Z' };

const VALID_REQUEST_ID = '0198b721-7f41-7000-8000-000000000001';

/**
 * Builds a client whose axios adapter returns canned outcomes.
 *
 * Replacing the adapter keeps every assertion in-process while still exercising
 * the real axios request pipeline, including the configured params serializer,
 * header defaults, and status handling. Nothing listens on a socket, and the
 * recorded configs make request count and wire shape observable.
 *
 * @param stubs - Outcomes in order; the last one repeats once exhausted.
 * @param options - Client options under test.
 */
function clientWith(stubs: Stub[], options: NuanzeClientOptions = {}) {
  const client = new NuanzeClient(options);
  const calls: InternalAxiosRequestConfig[] = [];

  client.transport.axiosInstance.defaults.adapter = (config) => {
    const stub = stubs[Math.min(calls.length, stubs.length - 1)] ?? {};
    calls.push(config);

    if (stub.reject !== undefined) return Promise.reject(stub.reject);

    const response: AxiosResponse<unknown> = {
      status: stub.status ?? 200,
      statusText: '',
      data: stub.data ?? EMPTY_BODY,
      headers: new AxiosHeaders(stub.headers ?? {}),
      config,
    };
    return Promise.resolve(response);
  };

  return { client, calls };
}

/** Returns the URL axios would request, with the query serialized as configured. */
function requestedUrl(
  client: NuanzeClient,
  config: InternalAxiosRequestConfig,
): string {
  return client.transport.axiosInstance.getUri(config);
}

/** Runs a call expected to fail and returns the rejection. */
async function rejection(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to be rejected');
}

describe('serializeNuanzeQuery', () => {
  it('omits parameters the caller did not set', () => {
    expect(serializeNuanzeQuery(undefined)).toBe('');
    expect(serializeNuanzeQuery({})).toBe('');
    expect(
      serializeNuanzeQuery({ venue: 'perp', ticker: undefined, limit: null }),
    ).toBe('venue=perp');
  });

  it('repeats the key for array parameters rather than joining them', () => {
    expect(serializeNuanzeQuery({ productId: [0, 2, 4] })).toBe(
      'productId=0&productId=2&productId=4',
    );
    expect(serializeNuanzeQuery({ productId: [] })).toBe('');
  });

  it('encodes values that are not URL-safe', () => {
    expect(
      serializeNuanzeQuery({ cursor: 'a b+c/d=', ticker: 'wETH/USDT0' }),
    ).toBe('cursor=a+b%2Bc%2Fd%3D&ticker=wETH%2FUSDT0');
  });

  it('serializes numbers and booleans without quoting them', () => {
    expect(serializeNuanzeQuery({ limit: 100, includeClosed: false })).toBe(
      'limit=100&includeClosed=false',
    );
  });
});

describe('NuanzeTransport', () => {
  describe('request construction', () => {
    it('resolves the operation path against the base URL', async () => {
      const { client, calls } = clientWith([{}]);

      await client.listMarkets();

      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('get');
      expect(calls[0].url).toBe('/markets');
    });

    it('sends only the parameters the caller supplied', async () => {
      const { client, calls } = clientWith([{}]);

      await client.listMarkets({ venue: 'perp', ticker: 'ETH' });

      expect(calls[0].params).toEqual({
        venue: 'perp',
        tradingStatus: undefined,
        ticker: 'ETH',
      });
      expect(requestedUrl(client, calls[0])).toBe(
        'https://api.nuanze.co/v1/markets?venue=perp&ticker=ETH',
      );
    });

    it('serializes a repeatable filter by repeating the key', async () => {
      const { client, calls } = clientWith([{}]);

      await client.transport.get({
        path: '/markets',
        query: { productId: [0, 2] },
        decode: (body) => body,
      });

      expect(requestedUrl(client, calls[0])).toBe(
        'https://api.nuanze.co/v1/markets?productId=0&productId=2',
      );
    });

    it('applies default headers and a user agent to every request', async () => {
      const { client, calls } = clientWith([{}], {
        headers: { 'X-Application': 'unit-test' },
        userAgent: 'nuanze-client-test/0.0.0',
      });

      await client.listMarkets();

      expect(calls[0].headers.Accept).toBe('application/json');
      expect(calls[0].headers['X-Application']).toBe('unit-test');
      expect(calls[0].headers['User-Agent']).toBe('nuanze-client-test/0.0.0');
    });

    it('sends a caller correlation ID and omits the header otherwise', async () => {
      const { client, calls } = clientWith([{}, {}]);

      await client.listMarkets({}, { requestId: VALID_REQUEST_ID });
      await client.listMarkets();

      expect(calls[0].headers['X-Request-Id']).toBe(VALID_REQUEST_ID);
      expect(calls[1].headers['X-Request-Id']).toBeUndefined();
    });

    it('never sends credentials, since the API is public and CORS-open', async () => {
      const { client, calls } = clientWith([{}]);

      await client.listMarkets();

      expect(calls[0].withCredentials).toBe(false);
    });
  });

  describe('response metadata', () => {
    it('parses the documented rate-limit, request ID, and ETag headers', async () => {
      const { client } = clientWith([
        {
          headers: {
            'x-request-id': VALID_REQUEST_ID,
            etag: 'W/"markets-1"',
            'ratelimit-limit': '150',
            'ratelimit-remaining': '148',
            'ratelimit-reset': '1787136067',
          },
        },
      ]);

      let meta: NuanzeResponseMeta | undefined;
      await client.listMarkets(
        {},
        { onResponse: (observed) => (meta = observed) },
      );

      expect(meta).toEqual({
        status: 200,
        requestId: VALID_REQUEST_ID,
        etag: 'W/"markets-1"',
        fromCache: false,
        rateLimit: {
          limit: 150,
          remaining: 148,
          reset: 1787136067,
          retryAfterSeconds: null,
        },
      });
      expect(client.lastRateLimit).toEqual(meta?.rateLimit);
    });

    it('ignores unparseable or negative rate-limit values instead of guessing', async () => {
      const { client } = clientWith([
        {
          headers: {
            'ratelimit-limit': 'not-a-number',
            'ratelimit-remaining': '-5',
            'ratelimit-reset': '1.5',
          },
        },
      ]);

      await client.listMarkets();

      expect(client.lastRateLimit).toEqual({
        limit: null,
        remaining: null,
        reset: null,
        retryAfterSeconds: null,
      });
    });

    it('reports no rate-limit state before the first response', () => {
      expect(new NuanzeClient().lastRateLimit).toEqual({
        limit: null,
        remaining: null,
        reset: null,
        retryAfterSeconds: null,
      });
    });
  });

  describe('failure classification', () => {
    it('turns a documented error envelope into an API error', async () => {
      const { client, calls } = clientWith([
        {
          status: 400,
          headers: { 'x-request-id': VALID_REQUEST_ID },
          data: {
            error: {
              code: 'BAD_REQUEST',
              message: 'Request parameters are invalid.',
              requestId: VALID_REQUEST_ID,
            },
          },
        },
      ]);

      const error = await rejection(() => client.listMarkets());

      expect(error).toBeInstanceOf(NuanzeApiError);
      expect(error).toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Request parameters are invalid.',
        requestId: VALID_REQUEST_ID,
      });
      expect(calls).toHaveLength(1);
    });

    it('surfaces an error code a newer API release introduced', async () => {
      const { client } = clientWith([
        {
          status: 451,
          data: {
            error: {
              code: 'JURISDICTION_BLOCKED',
              message: 'Unavailable in your region.',
              requestId: VALID_REQUEST_ID,
            },
          },
        },
      ]);

      const error = await rejection(() => client.listMarkets());

      expect(error).toBeInstanceOf(NuanzeApiError);
      expect((error as NuanzeApiError).code).toBe('JURISDICTION_BLOCKED');
    });

    it('reports Retry-After on a 429 without sleeping or retrying', async () => {
      const { client, calls } = clientWith([
        {
          status: 429,
          headers: {
            'retry-after': '3',
            'ratelimit-limit': '150',
            'ratelimit-remaining': '0',
          },
          data: {
            error: {
              code: 'RATE_LIMITED',
              message: 'Request rate limit exceeded',
              requestId: VALID_REQUEST_ID,
            },
          },
        },
      ]);

      const startedAtMs = Date.now();
      const error = await rejection(() => client.listMarkets());

      expect(error).toBeInstanceOf(NuanzeApiError);
      expect((error as NuanzeApiError).rateLimit).toEqual({
        limit: 150,
        remaining: 0,
        reset: null,
        retryAfterSeconds: 3,
      });
      expect(calls).toHaveLength(1);
      expect(Date.now() - startedAtMs).toBeLessThan(3_000);
    });

    it('makes exactly one attempt for a retryable-looking 5xx', async () => {
      const { client, calls } = clientWith([
        {
          status: 503,
          data: {
            error: {
              code: 'DEPENDENCY_UNAVAILABLE',
              message: 'A required dependency is unavailable.',
              requestId: VALID_REQUEST_ID,
            },
          },
        },
      ]);

      await rejection(() => client.listMarkets());

      expect(calls).toHaveLength(1);
    });

    it('rejects a malformed error envelope rather than inventing a code', async () => {
      const { client } = clientWith([
        {
          status: 500,
          headers: { 'x-request-id': VALID_REQUEST_ID },
          data: { message: 'something went wrong' },
        },
      ]);

      const error = await rejection(() => client.listMarkets());

      expect(error).toBeInstanceOf(NuanzeResponseError);
      expect(error).not.toBeInstanceOf(NuanzeApiError);
      expect(error).toMatchObject({ status: 500, requestId: VALID_REQUEST_ID });
    });

    it('rejects a non-JSON body with a bounded single-line preview', async () => {
      const { client } = clientWith([
        {
          headers: { 'content-type': 'text/html' },
          data: `<html>\n  <body>${'gateway error '.repeat(200)}</body>\n</html>`,
        },
      ]);

      const error = await rejection(() => client.listMarkets());

      expect(error).toBeInstanceOf(NuanzeResponseError);
      const { bodyPreview } = error as NuanzeResponseError;
      expect(bodyPreview.length).toBeLessThanOrEqual(513);
      expect(bodyPreview).not.toMatch(/[\n\r]/);
      expect(bodyPreview.endsWith('…')).toBe(true);
    });

    it('rejects a success body that departs from the contract', async () => {
      const { client } = clientWith([
        { data: { markets: [], count: 7, asOf: '2026-08-19T10:44:18.947Z' } },
      ]);

      const error = await rejection(() => client.listMarkets());

      expect(error).toBeInstanceOf(NuanzeResponseError);
      expect((error as Error).message).toMatch(/body\.count/);
      expect((error as NuanzeResponseError).bodyPreview).toContain('"count":7');
    });

    it('rejects a 304 the client never asked for', async () => {
      const { client } = clientWith([{ status: 304, data: '' }]);

      const error = await rejection(() => client.listMarkets());

      expect(error).toBeInstanceOf(NuanzeResponseError);
      expect((error as NuanzeResponseError).status).toBe(304);
    });

    it('classifies an aborted connection as a timeout', async () => {
      const { client } = clientWith([
        {
          reject: new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'),
        },
      ]);

      const error = await rejection(() =>
        client.listMarkets({}, { timeoutMs: 250 }),
      );

      expect(error).toBeInstanceOf(NuanzeTimeoutError);
      expect(error).toMatchObject({ timeoutMs: 250, path: '/markets' });
    });

    it('leaves a transport failure that produced no response untouched', async () => {
      const refused = new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED');
      const { client } = clientWith([{ reject: refused }]);

      const error = await rejection(() => client.listMarkets());

      expect(error).toBe(refused);
      expect(error).not.toBeInstanceOf(NuanzeApiError);
      expect(error).not.toBeInstanceOf(NuanzeTimeoutError);
      expect(error).not.toBeInstanceOf(NuanzeResponseError);
    });

    it('preserves caller cancellation instead of reclassifying it', async () => {
      const controller = new AbortController();
      const { client } = clientWith([
        { reject: new CanceledError('canceled') },
      ]);
      controller.abort();

      const error = await rejection(() =>
        client.listMarkets({}, { signal: controller.signal }),
      );

      expect(axios.isCancel(error)).toBe(true);
      expect(error).not.toBeInstanceOf(NuanzeTimeoutError);
    });
  });

  describe('option validation', () => {
    it('rejects a timeout that is not a finite positive duration', () => {
      for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => new NuanzeClient({ timeoutMs })).toThrow(
          NuanzeConfigError,
        );
      }
      expect(new NuanzeClient().transport.timeoutMs).toBe(
        NUANZE_DEFAULT_TIMEOUT_MS,
      );
    });

    it('rejects a concurrency cap that is not a positive integer', () => {
      for (const maxConcurrentRequests of [0, -1, 1.5, Number.NaN]) {
        expect(() => new NuanzeClient({ maxConcurrentRequests })).toThrow(
          NuanzeConfigError,
        );
      }
    });

    it('lets a per-request timeout shorten but never lengthen the budget', async () => {
      const { client, calls } = clientWith([{}], { timeoutMs: 5_000 });

      await client.listMarkets({}, { timeoutMs: 250 });
      expect(calls[0].timeout).toBe(250);

      await expect(
        client.listMarkets({}, { timeoutMs: 5_001 }),
      ).rejects.toThrow(NuanzeConfigError);
      expect(calls).toHaveLength(1);
    });

    it('refuses a correlation ID the API would silently discard, before dispatching', async () => {
      const { client, calls } = clientWith([{}]);

      for (const requestId of [
        'short',
        'has space',
        'has_underscore',
        'a'.repeat(129),
      ]) {
        await expect(client.listMarkets({}, { requestId })).rejects.toThrow(
          NuanzeConfigError,
        );
      }

      expect(calls).toHaveLength(0);
      expect(NUANZE_REQUEST_ID_PATTERN.test(VALID_REQUEST_ID)).toBe(true);
    });
  });

  describe('opt-in response cache', () => {
    const cacheable = {
      headers: {
        'cache-control': 'public, max-age=15',
        'x-request-id': VALID_REQUEST_ID,
      },
    };

    it('is off by default, so every call reaches the API', async () => {
      const { client, calls } = clientWith([cacheable]);

      await client.listMarkets();
      await client.listMarkets();

      expect(calls).toHaveLength(2);
    });

    it('serves a repeat read locally, charging nothing', async () => {
      const { client, calls } = clientWith([cacheable], { cache: {} });

      await client.listMarkets();
      let meta: NuanzeResponseMeta | undefined;
      await client.listMarkets(
        {},
        { onResponse: (observed) => (meta = observed) },
      );

      expect(calls).toHaveLength(1);
      expect(meta).toMatchObject({
        fromCache: true,
        requestId: null,
        rateLimit: {
          limit: null,
          remaining: null,
          reset: null,
          retryAfterSeconds: null,
        },
      });
    });

    it('keys on the query, so a different filter is a miss', async () => {
      const { client, calls } = clientWith([cacheable], { cache: {} });

      await client.listMarkets({ venue: 'perp' });
      await client.listMarkets({ venue: 'spot' });

      expect(calls).toHaveLength(2);
    });

    it('does not store a response the server marks uncacheable', async () => {
      const { client, calls } = clientWith(
        [{ headers: { 'cache-control': 'no-store' } }],
        {
          cache: {},
        },
      );

      await client.listMarkets();
      await client.listMarkets();

      expect(calls).toHaveLength(2);
    });

    it('re-decodes each hit so callers cannot share mutable decimals', async () => {
      const market = {
        productId: 4,
        symbol: 'ETH-PERP',
        ticker: 'ETH',
        venue: 'perp',
        tradingStatus: 'live',
        priceIncrement: '0.1',
        sizeIncrement: '0.001',
        minSize: '100',
        latest: null,
        updatedAt: '2026-08-19T10:42:10.145Z',
      };
      const { client } = clientWith(
        [
          {
            ...cacheable,
            data: {
              markets: [market],
              count: 1,
              asOf: '2026-08-19T10:44:18.947Z',
            },
          },
        ],
        { cache: {} },
      );

      const first = await client.listMarkets();
      const second = await client.listMarkets();

      expect(second.markets[0].minSize).not.toBe(first.markets[0].minSize);
      expect(
        second.markets[0].minSize.isEqualTo(first.markets[0].minSize),
      ).toBe(true);
    });
  });
});
