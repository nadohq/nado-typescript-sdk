import { NuanzeErrorCode } from './nuanzeErrorCodes';
import { NuanzeServerFailureResponse } from './serverQueryTypes';

/**
 * Error thrown when the Nuanze API returns a failure envelope. Unlike the other service clients this
 * does not extend `BaseServerFailureError`: Nuanze reports a string {@link NuanzeErrorCode} nested
 * under `error` rather than a top-level numeric `error_code`, so there is no shared shape to inherit.
 */
export class NuanzeServerFailureError extends Error {
  /**
   * Error code to branch on, comparable against {@link NUANZE_ERROR_CODES}. Codes are additive, so an
   * unrecognized value here came from a newer API release than this client.
   */
  readonly errorCode: NuanzeErrorCode;

  /**
   * HTTP status of the response, e.g. `404` for `MARKET_NOT_FOUND` or `429` for `RATE_LIMITED`.
   */
  readonly httpStatus: number;

  /**
   * Correlation ID to quote when reporting the failure. Matches the response's `X-Request-Id`.
   */
  readonly requestId: string;

  constructor(
    readonly responseData: NuanzeServerFailureResponse,
    httpStatus: number,
  ) {
    super(`${responseData.error.code}: ${responseData.error.message}`);
    this.name = 'NuanzeServerFailureError';
    this.errorCode = responseData.error.code;
    this.httpStatus = httpStatus;
    this.requestId = responseData.error.requestId;
  }
}
