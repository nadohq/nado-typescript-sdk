import { BaseServerFailureError } from '@nadohq/shared';
import {
  IndexerServerFailureResponse,
  IndexerServerRequestType,
} from './serverTypes';

/**
 * Error thrown when the indexer service API returns a failure envelope (see
 * {@link IndexerServerFailureResponse}), either as a non-2xx HTTP response or a 2xx response
 * with `status: 'failure'`. The numeric error code is exposed directly on
 * {@link BaseServerFailureError.errorCode} for comparison against {@link INDEXER_ERROR_CODES}.
 *
 * The v2 REST endpoints do not return a failure envelope — they use plain HTTP error responses
 * without an `error_code` field, so this error is only thrown for the v1 query routes.
 */
export class IndexerServerFailureError extends BaseServerFailureError {
  declare readonly responseData: IndexerServerFailureResponse;
  declare readonly requestType: IndexerServerRequestType;

  /**
   * HTTP status code of the response, e.g. `400` for a malformed request.
   */
  readonly httpStatus: number;

  constructor(responseData: IndexerServerFailureResponse, httpStatus: number) {
    super(responseData, 'IndexerServerFailureError');
    this.httpStatus = httpStatus;
  }
}
