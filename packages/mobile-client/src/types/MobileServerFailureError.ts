import { MobileServerFailureResponse } from './serverBaseTypes';

/**
 * Error thrown when the mobile service API returns a failure envelope, either as a non-2xx HTTP response
 * or a 2xx response with `status: 'failure'`.
 */
export class MobileServerFailureError extends Error {
  constructor(
    readonly responseData: MobileServerFailureResponse,
    /**
     * HTTP status code of the response, e.g. `404` for `PROFILE_NOT_FOUND`. Unlike the engine, the mobile
     * backend maps domain failures onto HTTP statuses.
     */
    readonly httpStatus: number,
  ) {
    super(`${responseData.error_code}: ${responseData.error}`);
  }
}
