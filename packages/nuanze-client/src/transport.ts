import type { AxiosInstance, AxiosResponse, GenericAbortSignal } from 'axios';
import axios, { isAxiosError } from 'axios';
import { NuanzeConcurrencyGate } from './concurrencyGate';
import { resolveNuanzeBaseUrl } from './endpoints';
import {
  NuanzeApiError,
  NuanzeConfigError,
  NuanzeResponseError,
  NuanzeTimeoutError,
  nuanzeBodyPreview,
} from './errors';
import type { NuanzeCacheOptions } from './responseCache';
import { NuanzeResponseCache } from './responseCache';
import { NuanzeSchemaViolationError, objectAt, stringAt } from './schema';
import type { NuanzeRateLimitSnapshot } from './types/rateLimit';

/** Default request timeout, in milliseconds. */
export const NUANZE_DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Request IDs the API accepts.
 *
 * Narrower than the published `InboundRequestId` parameter schema, which allows
 * `.`, `_`, and `:` and a minimum length of 1. The deployed service accepts only
 * this pattern and silently substitutes a generated UUIDv7 for anything else, so
 * validating against the stricter runtime rule keeps a caller from believing a
 * correlation ID was honored when it was discarded.
 */
export const NUANZE_REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

/** A single query parameter value, or repeated values for a repeatable filter. */
export type NuanzeQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[];

/** Query parameters for a request. Null and undefined entries are omitted. */
export type NuanzeQuery = Record<string, NuanzeQueryValue>;

/** Metadata observed on a single response. */
export interface NuanzeResponseMeta {
  /** HTTP status, or 200 for a local cache hit. */
  status: number;
  /** Correlation ID from `X-Request-Id`, absent on a cache hit. */
  requestId: string | null;
  /** Rate-limit headers, all null on a cache hit since nothing was charged. */
  rateLimit: NuanzeRateLimitSnapshot;
  /** Entity tag from `ETag`, when present. */
  etag: string | null;
  /** True when the body was served from the opt-in local cache. */
  fromCache: boolean;
}

/** Per-request overrides accepted by every `NuanzeClient` method. */
export interface NuanzeRequestOptions {
  /**
   * Caller cancellation, typically an `AbortSignal`.
   *
   * Aborting rejects with axios's `CanceledError` rather than any SDK error, so
   * `axios.isCancel(error)` holds and cancellation stays distinguishable from a
   * timeout. Typed as axios's `GenericAbortSignal` to keep the published types
   * free of DOM and Node globals.
   */
  signal?: GenericAbortSignal;
  /**
   * Shorter timeout for this request, in milliseconds. May only reduce the
   * client-level timeout.
   */
  timeoutMs?: number;
  /**
   * Correlation ID to send as `X-Request-Id`. Must match
   * {@link NUANZE_REQUEST_ID_PATTERN}.
   */
  requestId?: string;
  /**
   * Observer for this response's metadata, including rate-limit headers.
   * Invoked before the promise settles, and also on a cache hit.
   */
  onResponse?: (meta: NuanzeResponseMeta) => void;
}

/** Construction options shared by the transport and `NuanzeClient`. */
export interface NuanzeClientOptions {
  /**
   * API base URL including the version segment. Defaults to
   * `NUANZE_API_BASE_URL`. Must be HTTP or HTTPS.
   */
  baseUrl?: string;
  /**
   * Finite request timeout, in milliseconds. Defaults to
   * {@link NUANZE_DEFAULT_TIMEOUT_MS}.
   */
  timeoutMs?: number;
  /**
   * Non-sensitive default headers, such as application identification.
   *
   * The API needs no credentials, so nothing here should be secret. In a
   * browser, only the headers the API allowlists for CORS survive preflight:
   * `Accept`, `Content-Type`, `If-None-Match`, and `X-Request-Id`. Custom
   * identification headers work from server-side runtimes.
   */
  headers?: Record<string, string>;
  /**
   * User agent to advertise, where the runtime permits it. Browsers forbid
   * setting this header and will ignore it.
   */
  userAgent?: string;
  /**
   * Enables the local response cache, which is off unless this is present.
   * Pass `{}` for defaults.
   */
  cache?: NuanzeCacheOptions;
  /**
   * Caps in-flight requests. Unbounded unless set. Useful because a burst can
   * drain the API's 150-unit bucket faster than it refills.
   */
  maxConcurrentRequests?: number;
}

/** A single read against the API, with the decoder for its body. */
export interface NuanzeGetRequest<T> {
  /** Path relative to the base URL, beginning with a slash. */
  path: string;
  /** Query parameters, if any. */
  query?: NuanzeQuery;
  /** Validates and maps the decoded JSON body. */
  decode: (body: unknown) => T;
  /** Per-request overrides. */
  options?: NuanzeRequestOptions;
}

const ABSENT_RATE_LIMIT: NuanzeRateLimitSnapshot = Object.freeze({
  limit: null,
  remaining: null,
  reset: null,
  retryAfterSeconds: null,
});

/**
 * Serialize query parameters, repeating the key for array values.
 *
 * The contract declares repeatable filters as `style: form, explode: true`, so
 * `{ productId: [0, 2] }` becomes `productId=0&productId=2` rather than a joined
 * or bracketed form.
 *
 * @param query - Parameters to serialize. Null and undefined entries are dropped.
 * @returns An encoded query string without a leading `?`, empty when nothing applies.
 */
export function serializeNuanzeQuery(query: NuanzeQuery | undefined): string {
  if (query === undefined) return '';

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
}

function headerString(
  response: AxiosResponse<unknown>,
  name: string,
): string | null {
  const headers = response.headers as unknown as Record<string, unknown>;
  const value = headers[name];

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function headerInteger(
  response: AxiosResponse<unknown>,
  name: string,
): number | null {
  const raw = headerString(response, name);
  if (raw === null) return null;

  const parsed = Number(raw.trim());
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readRateLimit(
  response: AxiosResponse<unknown>,
): NuanzeRateLimitSnapshot {
  return {
    limit: headerInteger(response, 'ratelimit-limit'),
    remaining: headerInteger(response, 'ratelimit-remaining'),
    reset: headerInteger(response, 'ratelimit-reset'),
    retryAfterSeconds: headerInteger(response, 'retry-after'),
  };
}

function bodyText(body: unknown): string {
  if (typeof body === 'string') return body;

  try {
    return JSON.stringify(body) ?? '[empty body]';
  } catch {
    return '[unserializable body]';
  }
}

/**
 * Single-attempt HTTP transport for the Nuanze public analytics API.
 *
 * One axios instance per client, exactly one attempt per call: no retries,
 * backoff, `Retry-After` sleeping, or failover. Status validation is disabled in
 * axios, matching the sibling Nado clients, so this class can classify every
 * outcome into `NuanzeApiError`, `NuanzeTimeoutError`, or
 * `NuanzeResponseError` while leaving caller cancellation untouched.
 *
 * @internal
 */
export class NuanzeTransport {
  /** Normalized base URL every request is resolved against. */
  readonly baseUrl: string;

  /** Client-level timeout, in milliseconds. */
  readonly timeoutMs: number;

  /** Underlying axios instance, exposed for interceptors and diagnostics. */
  readonly axiosInstance: AxiosInstance;

  private readonly cache: NuanzeResponseCache | null;
  private readonly gate: NuanzeConcurrencyGate | null;
  private rateLimit: NuanzeRateLimitSnapshot = ABSENT_RATE_LIMIT;

  constructor(options: NuanzeClientOptions = {}) {
    this.baseUrl = resolveNuanzeBaseUrl(options.baseUrl);
    this.timeoutMs = assertFiniteTimeout(
      options.timeoutMs ?? NUANZE_DEFAULT_TIMEOUT_MS,
      'timeoutMs',
    );
    this.cache =
      options.cache === undefined
        ? null
        : new NuanzeResponseCache(options.cache);
    this.gate =
      options.maxConcurrentRequests === undefined
        ? null
        : new NuanzeConcurrencyGate(
            assertPositiveInteger(options.maxConcurrentRequests),
          );

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      // The API is public and credential-free, and permits any origin without
      // credentials, so sending them would only break browser CORS. This is a
      // deliberate departure from the engine, indexer, and trigger clients.
      withCredentials: false,
      // Statuses are classified below rather than thrown by axios, matching the
      // sibling clients.
      validateStatus: () => true,
      headers: {
        Accept: 'application/json',
        ...options.headers,
        ...(options.userAgent === undefined
          ? {}
          : { 'User-Agent': options.userAgent }),
      },
      paramsSerializer: { serialize: serializeNuanzeQuery },
    });
  }

  /**
   * Rate-limit headers from the most recent charged response.
   *
   * Reflects whichever response landed last, so with concurrent calls prefer
   * `NuanzeRequestOptions.onResponse` for per-request attribution. Cache hits do
   * not update it because they are not charged.
   */
  get lastRateLimit(): NuanzeRateLimitSnapshot {
    return this.rateLimit;
  }

  /**
   * Perform one GET and decode its body.
   *
   * @throws {NuanzeConfigError} If a per-request option is invalid. Nothing is sent.
   * @throws {NuanzeApiError} If the API returned a documented error envelope.
   * @throws {NuanzeTimeoutError} If the timeout elapsed before a full response.
   * @throws {NuanzeResponseError} If the response was not the documented contract.
   */
  async get<T>(request: NuanzeGetRequest<T>): Promise<T> {
    const timeoutMs = this.resolveTimeout(request.options?.timeoutMs);
    const requestId = validateRequestId(request.options?.requestId);
    const query = serializeNuanzeQuery(request.query);
    const cacheKey = `GET ${request.path}?${query}`;

    if (this.cache !== null) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        const meta: NuanzeResponseMeta = {
          status: 200,
          requestId: null,
          rateLimit: ABSENT_RATE_LIMIT,
          etag: null,
          fromCache: true,
        };
        const decoded = decodeBody(request.decode, cached, meta);
        request.options?.onResponse?.(meta);
        return decoded;
      }
    }

    const response = await this.send(request, timeoutMs, requestId);

    const meta: NuanzeResponseMeta = {
      status: response.status,
      requestId: headerString(response, 'x-request-id'),
      rateLimit: readRateLimit(response),
      etag: headerString(response, 'etag'),
      fromCache: false,
    };
    this.rateLimit = meta.rateLimit;

    if (response.status === 304) {
      throw new NuanzeResponseError(
        'Nuanze returned 304 Not Modified for a request that carried no conditional headers.',
        {
          status: response.status,
          requestId: meta.requestId,
          bodyPreview: '',
          rateLimit: meta.rateLimit,
        },
      );
    }

    if (response.status >= 400) {
      throw apiError(response, meta);
    }

    const decoded = decodeBody(request.decode, response.data, meta);
    this.cache?.set(
      cacheKey,
      response.data,
      headerString(response, 'cache-control'),
    );
    request.options?.onResponse?.(meta);

    return decoded;
  }

  private async send<T>(
    request: NuanzeGetRequest<T>,
    timeoutMs: number,
    requestId: string | undefined,
  ): Promise<AxiosResponse<unknown>> {
    const attempt = (): Promise<AxiosResponse<unknown>> =>
      this.axiosInstance.get<unknown>(request.path, {
        params: request.query,
        timeout: timeoutMs,
        signal: request.options?.signal,
        headers:
          requestId === undefined ? undefined : { 'X-Request-Id': requestId },
      });

    try {
      return await (this.gate === null ? attempt() : this.gate.run(attempt));
    } catch (cause) {
      // Cancellation belongs to the caller: rethrow their abort reason so
      // `signal.aborted` and `AbortError` handling keep working.
      if (request.options?.signal?.aborted === true) throw cause;

      if (
        isAxiosError(cause) &&
        (cause.code === 'ECONNABORTED' || cause.code === 'ETIMEDOUT')
      ) {
        throw new NuanzeTimeoutError(request.path, timeoutMs, { cause });
      }

      throw cause;
    }
  }

  private resolveTimeout(override: number | undefined): number {
    if (override === undefined) return this.timeoutMs;

    const timeoutMs = assertFiniteTimeout(override, 'options.timeoutMs');
    if (timeoutMs > this.timeoutMs) {
      throw new NuanzeConfigError(
        `\`options.timeoutMs\` may only shorten the client timeout of ${String(this.timeoutMs)}ms, received ${String(timeoutMs)}ms.`,
      );
    }

    return timeoutMs;
  }
}

function assertFiniteTimeout(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new NuanzeConfigError(
      `\`${label}\` must be a finite positive number of milliseconds.`,
    );
  }
  return value;
}

function assertPositiveInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new NuanzeConfigError(
      '`maxConcurrentRequests` must be a positive integer.',
    );
  }
  return value;
}

function validateRequestId(requestId: string | undefined): string | undefined {
  if (requestId === undefined) return undefined;

  if (!NUANZE_REQUEST_ID_PATTERN.test(requestId)) {
    throw new NuanzeConfigError(
      '`options.requestId` must be 8 to 128 characters of letters, digits, and hyphens; the API discards anything else and generates its own.',
    );
  }

  return requestId;
}

function decodeBody<T>(
  decode: (body: unknown) => T,
  body: unknown,
  meta: NuanzeResponseMeta,
): T {
  try {
    return decode(body);
  } catch (cause) {
    if (cause instanceof NuanzeSchemaViolationError) {
      throw new NuanzeResponseError(
        `Nuanze response did not match the published contract at ${cause.message}`,
        {
          status: meta.status,
          requestId: meta.requestId,
          bodyPreview: nuanzeBodyPreview(bodyText(body)),
          rateLimit: meta.rateLimit,
          cause,
        },
      );
    }
    throw cause;
  }
}

function apiError(
  response: AxiosResponse<unknown>,
  meta: NuanzeResponseMeta,
): NuanzeApiError | NuanzeResponseError {
  try {
    const envelope = objectAt(
      objectAt(response.data, 'body').error,
      'body.error',
    );
    return new NuanzeApiError({
      status: response.status,
      code: stringAt(envelope.code, 'body.error.code'),
      message: stringAt(envelope.message, 'body.error.message'),
      requestId: stringAt(envelope.requestId, 'body.error.requestId'),
      rateLimit: meta.rateLimit,
    });
  } catch (cause) {
    if (cause instanceof NuanzeSchemaViolationError) {
      return new NuanzeResponseError(
        `Nuanze returned status ${String(response.status)} with a malformed error envelope.`,
        {
          status: response.status,
          requestId: meta.requestId,
          bodyPreview: nuanzeBodyPreview(bodyText(response.data)),
          rateLimit: meta.rateLimit,
          cause,
        },
      );
    }
    throw cause;
  }
}
