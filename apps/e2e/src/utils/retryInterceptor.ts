import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { delay } from './delay';

interface RetryInterceptorOpts {
  maxRetries?: number;
  baseDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1_000;

interface RequestConfigWithRetry extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

/**
 * Attaches a response interceptor that retries requests receiving a 429
 * status with exponential backoff. Safe to call multiple times on the same
 * instance — each call adds one interceptor.
 *
 * @param axiosInstance - The axios instance to patch.
 * @param opts - Optional overrides for max retries and base delay.
 */
export function attachRetryInterceptor(
  axiosInstance: AxiosInstance,
  opts?: RetryInterceptorOpts,
): void {
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = opts?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  axiosInstance.interceptors.response.use(async (response: AxiosResponse) => {
    if (response.status !== 429) {
      return response;
    }

    const config = response.config as RequestConfigWithRetry;
    const retryCount = config._retryCount ?? 0;

    if (retryCount >= maxRetries) {
      return response;
    }

    const retryAfterHeader = response.headers?.['retry-after'] as
      | string
      | undefined;
    const waitMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1_000
      : baseDelayMs * 2 ** retryCount;

    config._retryCount = retryCount + 1;
    await delay(waitMs);

    return axiosInstance.request(config);
  });
}
