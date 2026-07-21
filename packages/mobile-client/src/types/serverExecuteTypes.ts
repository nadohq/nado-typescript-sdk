import {
  MobileServerFailureResponse,
  MobileServerSuccessResponse,
} from './serverBaseTypes';

/**
 * Successful `execute` result. Mobile execute routes return no payload beyond the success discriminant, so
 * this is just the success envelope.
 */
export type MobileServerExecuteSuccessResult = MobileServerSuccessResponse;

/**
 * Failed `execute` result. The mobile backend uses one uniform failure envelope across all routes.
 */
export type MobileServerExecuteFailureResult = MobileServerFailureResponse;

/**
 * Discriminated `execute` result union of the success and failure envelopes.
 */
export type MobileServerExecuteResult =
  | MobileServerExecuteSuccessResult
  | MobileServerExecuteFailureResult;
