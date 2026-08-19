import { BaseServerFailureError } from '@nadohq/shared';
import { EngineServerExecuteFailureResult } from './serverExecuteTypes';
import { EngineServerQueryFailureResponse } from './serverQueryTypes';

type EngineServerFailureData =
  | EngineServerQueryFailureResponse
  | EngineServerExecuteFailureResult;

/**
 * Error thrown when the engine service API returns a failure envelope, either on a `/query`
 * route (see {@link EngineServerQueryFailureResponse}) or an `/execute` route (see
 * {@link EngineServerExecuteFailureResult}). The numeric error code is exposed directly on
 * {@link BaseServerFailureError.errorCode} for comparison against {@link ENGINE_ERROR_CODES}.
 */
export class EngineServerFailureError extends BaseServerFailureError {
  declare readonly responseData: EngineServerFailureData;
  declare readonly requestType:
    | EngineServerExecuteFailureResult['request_type']
    | undefined;

  constructor(responseData: EngineServerFailureData) {
    super(responseData, 'EngineServerFailureError');
  }
}
