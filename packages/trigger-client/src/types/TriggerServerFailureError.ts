import { EngineServerExecuteFailureResult } from '@nadohq/engine-client';
import { BaseServerFailureError } from '@nadohq/shared';
import { TriggerServerQueryFailureResponse } from './serverQueryTypes';

type TriggerServerFailureData =
  | TriggerServerQueryFailureResponse
  | EngineServerExecuteFailureResult;

/**
 * Error thrown when the trigger service API returns a failure envelope, either on a `/query`
 * route (see {@link TriggerServerQueryFailureResponse}) or an `/execute` route (the trigger
 * service reuses the engine's execute failure shape — see `EngineServerExecuteFailureResult`).
 *
 * The numeric error code is exposed directly on {@link BaseServerFailureError.errorCode} for
 * comparison against {@link TRIGGER_ERROR_CODES}.
 */
export class TriggerServerFailureError extends BaseServerFailureError {
  declare readonly responseData: TriggerServerFailureData;
  declare readonly requestType:
    | EngineServerExecuteFailureResult['request_type']
    | undefined;

  constructor(responseData: TriggerServerFailureData) {
    super(responseData, 'TriggerServerFailureError');
  }
}
