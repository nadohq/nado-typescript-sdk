import { MobileClient } from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { asRecord } from './asRecord';

/**
 * Captures the single successful live /public_query response alongside its SDK result.
 * The interceptor is always removed, including when the request or its assertions fail.
 * @param mobile - Client used by the request.
 * @param request - One public query whose mapping is being verified.
 * @returns The SDK result and the exact wire response used to produce it.
 */
export async function capturePublicQuery<T>(
  mobile: MobileClient,
  request: () => Promise<T>,
): Promise<{ result: T; wire: Record<string, unknown> }> {
  let responseData: unknown;
  let responseCount = 0;
  // Use the same response so concurrent updates cannot change a separately fetched reference.
  const interceptor = mobile.axiosInstance.interceptors.response.use(
    (response) => {
      responseData = response.data;
      responseCount += 1;
      assert.ok(response.config.url?.endsWith('/public_query'));
      return response;
    },
  );
  try {
    const result = await request();
    assert.equal(responseCount, 1);
    const wire = asRecord(responseData, 'released response');
    assert.equal(wire.status, 'success');
    return { result, wire };
  } finally {
    mobile.axiosInstance.interceptors.response.eject(interceptor);
  }
}
