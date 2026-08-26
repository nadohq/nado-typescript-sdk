import { NuanzeErrorCode } from './nuanzeErrorCodes';
import { NuanzeServerMarket } from './serverModelTypes';

/**
 * Failure envelope returned with every non-2xx response.
 *
 * Structurally unrelated to `BaseServerFailureResponse`: Nuanze nests a string `code` under `error`
 * instead of carrying a top-level numeric `error_code` and `status: 'failure'`.
 */
export interface NuanzeServerFailureResponse {
  error: {
    code: NuanzeErrorCode;
    message: string;
    requestId: string;
  };
}

/**
 * `GET /markets` response as returned on the wire.
 */
export interface NuanzeServerMarketsResponse {
  markets: NuanzeServerMarket[];
  count: number;
  asOf: string;
}

/**
 * Checks whether a response body is a Nuanze failure envelope. The `code` is not compared against
 * {@link NUANZE_ERROR_CODES}, so a code added by a newer API release still reaches the caller.
 */
export function isNuanzeServerFailureResponse(
  data: unknown,
): data is NuanzeServerFailureResponse {
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return false;
  }

  const { error } = data;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}
