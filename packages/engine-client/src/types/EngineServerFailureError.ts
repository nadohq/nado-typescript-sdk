import { EngineServerExecuteFailureResult } from './serverExecuteTypes';
import { EngineServerQueryFailureResponse } from './serverQueryTypes';

type EngineServerFailureData =
  | EngineServerQueryFailureResponse
  | EngineServerExecuteFailureResult;

/**
 * Error thrown when the engine service API returns a failure envelope, either on a `/query`
 * route (see {@link EngineServerQueryFailureResponse}) or an `/execute` route (see
 * {@link EngineServerExecuteFailureResult}). The numeric error code is exposed directly on
 * {@link errorCode} for comparison against {@link ENGINE_ERROR_CODES}.
 */
export class EngineServerFailureError extends Error {
  /**
   * Numeric engine service API error code, see {@link ENGINE_ERROR_CODES}.
   */
  readonly errorCode: number;
  /**
   * The execute request type that failed, e.g. `execute_place_order`. Set only for `/execute`
   * failures; `undefined` for `/query` failures (the engine does not echo a request type on the
   * query failure envelope — see {@link EngineServerQueryFailureResponse}).
   */
  readonly requestType:
    | EngineServerExecuteFailureResult['request_type']
    | undefined;

  constructor(readonly responseData: EngineServerFailureData) {
    super(`${responseData.error_code}: ${responseData.error}`);
    this.name = 'EngineServerFailureError';
    this.errorCode = responseData.error_code;
    this.requestType =
      'request_type' in responseData ? responseData.request_type : undefined;
  }
}
