import { mapNuanzeMarketListResponse } from './dataMappers';
import type { NuanzeClientOptions, NuanzeRequestOptions } from './transport';
import { NuanzeTransport } from './transport';
import type {
  NuanzeListMarketsParams,
  NuanzeMarketListResponse,
} from './types';
import type { NuanzeRateLimitSnapshot } from './types/rateLimit';

/**
 * Read-only client for the Nuanze public analytics API.
 *
 * Standalone by design: it takes no chain environment, wallet client, signer, or
 * contract address, and the API requires no credentials. `NadoClient` neither
 * holds nor configures an instance.
 *
 * Each method performs exactly one HTTP attempt with a finite timeout. Failures
 * arrive as `NuanzeApiError`, `NuanzeTimeoutError`, `NuanzeResponseError`, or
 * `NuanzeConfigError`. Caller cancellation is never reclassified: it surfaces as
 * axios's `CanceledError`.
 *
 * @example
 * ```ts
 * const nuanze = new NuanzeClient();
 * const { markets } = await nuanze.listMarkets({ venue: 'perp' });
 * ```
 */
export class NuanzeClient {
  /** Transport backing every request, exposed for diagnostics. */
  readonly transport: NuanzeTransport;

  constructor(options: NuanzeClientOptions = {}) {
    this.transport = new NuanzeTransport(options);
  }

  /** Normalized base URL every request is resolved against. */
  get baseUrl(): string {
    return this.transport.baseUrl;
  }

  /**
   * Rate-limit headers from the most recent charged response.
   *
   * The API meters a weighted token bucket per client IP: capacity 150 units
   * refilling at 2 units per second. This client reports the state but never
   * sleeps, retries, or self-throttles on it. With concurrent calls, prefer
   * `NuanzeRequestOptions.onResponse` for per-request attribution.
   */
  get lastRateLimit(): NuanzeRateLimitSnapshot {
    return this.transport.lastRateLimit;
  }

  /**
   * List the complete active market universe, ordered by `productId` ascending.
   *
   * Costs 2 rate-limit units. The response is never truncated, so `count` always
   * equals the returned list length.
   *
   * @param params - Optional venue, tradability, and ticker filters.
   * @param options - Per-request signal, timeout, request ID, and response observer.
   * @returns Markets with decimal increments and the latest ticker per market.
   * @throws {NuanzeApiError} If the API rejected the request, for example with `BAD_REQUEST` for an invalid filter.
   * @throws {NuanzeTimeoutError} If the timeout elapsed before a full response.
   * @throws {NuanzeResponseError} If the response was not the documented contract.
   * @throws {NuanzeConfigError} If a per-request option is invalid. Nothing is sent.
   */
  async listMarkets(
    params: NuanzeListMarketsParams = {},
    options?: NuanzeRequestOptions,
  ): Promise<NuanzeMarketListResponse> {
    return this.transport.get({
      path: '/markets',
      query: {
        venue: params.venue,
        tradingStatus: params.tradingStatus,
        ticker: params.ticker,
      },
      decode: mapNuanzeMarketListResponse,
      options,
    });
  }
}
