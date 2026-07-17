import { MobileServerFailureResponse } from './serverTypes';

/**
 * Error thrown when the mobile service API returns a failure envelope, either as a non-2xx HTTP response
 * or a 2xx response with `status: 'failure'`.
 */
export class MobileServerFailureError extends Error {
  /**
   * HTTP status code of the response, e.g. `404` for `PROFILE_NOT_FOUND`.
   */
  readonly httpStatus: number;
  /**
   * Numeric mobile service API error code, see {@link MOBILE_ERROR_CODE}.
   */
  readonly errorCode: number;
  /**
   * The request type that failed, e.g. `public_query_profile`, `execute_claim_username`.
   */
  readonly requestType: string;

  constructor(
    readonly responseData: MobileServerFailureResponse,
    httpStatus: number,
  ) {
    super(`${responseData.error_code}: ${responseData.error}`);
    this.name = 'MobileServerFailureError';
    this.httpStatus = httpStatus;
    this.errorCode = responseData.error_code;
    this.requestType = responseData.request_type;
  }
}
