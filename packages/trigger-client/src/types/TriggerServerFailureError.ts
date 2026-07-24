import { EngineServerExecuteFailureResult } from '@nadohq/engine-client';
import { TriggerServerQueryFailureResponse } from './serverQueryTypes';

type TriggerServerFailureData =
  | TriggerServerQueryFailureResponse
  | EngineServerExecuteFailureResult;

/**
 * Error thrown when the trigger service API returns a failure envelope, either on a `/query`
 * route (see {@link TriggerServerQueryFailureResponse}) or an `/execute` route (the trigger
 * service reuses the engine's execute failure shape — see `EngineServerExecuteFailureResult`).
 *
 * The numeric error code is exposed directly on {@link errorCode} for comparison against
 * {@link TRIGGER_ERROR_CODES}.
 */
export class TriggerServerFailureError extends Error {
  /**
   * Numeric trigger service API error code, see {@link TRIGGER_ERROR_CODES}.
   */
  readonly errorCode: number;
  /**
   * The execute request type that failed, e.g. `execute_place_order`. Set only for `/execute`
   * failures; `undefined` for `/query` failures (the trigger query failure envelope does not
   * echo a request type — see {@link TriggerServerQueryFailureResponse}).
   */
  readonly requestType:
    | EngineServerExecuteFailureResult['request_type']
    | undefined;

  constructor(readonly responseData: TriggerServerFailureData) {
    super(`${responseData.error_code}: ${responseData.error}`);
    this.name = 'TriggerServerFailureError';
    this.errorCode = responseData.error_code;
    this.requestType =
      'request_type' in responseData ? responseData.request_type : undefined;
  }
}
