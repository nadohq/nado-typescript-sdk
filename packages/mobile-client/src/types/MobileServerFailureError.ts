import { BaseServerFailureError } from '@nadohq/shared';
import {
  MobileServerFailureResponse,
  MobileServerRequestType,
} from './serverBaseTypes';

/**
 * Error thrown when the mobile service API returns a failure envelope, either as a non-2xx HTTP response
 * or a 2xx response with `status: 'failure'`. The numeric error code is exposed directly on
 * {@link BaseServerFailureError.errorCode} for comparison against {@link MOBILE_ERROR_CODES}.
 */
export class MobileServerFailureError extends BaseServerFailureError {
  declare readonly responseData: MobileServerFailureResponse;
  declare readonly requestType: MobileServerRequestType;

  /**
   * HTTP status code of the response, e.g. `404` for `PROFILE_NOT_FOUND`. Unlike the engine, the mobile
   * backend maps domain failures onto HTTP statuses.
   */
  readonly httpStatus: number;

  constructor(responseData: MobileServerFailureResponse, httpStatus: number) {
    super(responseData, 'MobileServerFailureError');
    this.httpStatus = httpStatus;
  }
}
