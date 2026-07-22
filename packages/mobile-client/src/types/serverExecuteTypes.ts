import {
  MobileServerFailureResponse,
  MobileServerSuccessResponse,
} from './serverBaseTypes';

/**
 * Discriminated `execute` result union. Mobile execute routes return no payload beyond the success
 * discriminant, so the success arm is the base success envelope; failures use the uniform failure envelope.
 */
export type MobileServerExecuteResult =
  | MobileServerSuccessResponse
  | MobileServerFailureResponse;
