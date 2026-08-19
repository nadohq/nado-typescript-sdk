import {
  MobileServerFailureResponse,
  MobileServerSuccessResponse,
} from './serverBaseTypes';
import {
  MobileServerPublicExecuteRequestByType,
  MobileServerPublicExecuteRequestType,
} from './serverRequestTypes';

/**
 * Unsigned `public_execute` request body: a `type` discriminant flattened with its params, mirroring
 * {@link MobileServerPublicQueryRequest}.
 */
export type MobileServerPublicExecuteRequest<
  T extends MobileServerPublicExecuteRequestType =
    MobileServerPublicExecuteRequestType,
> = {
  [K in MobileServerPublicExecuteRequestType]: {
    type: K;
  } & MobileServerPublicExecuteRequestByType[K];
}[T];

/**
 * Discriminated `execute` result union. Mobile execute routes return no payload beyond the success
 * discriminant, so the success arm is the base success envelope; failures use the uniform failure envelope.
 */
export type MobileServerExecuteResult =
  | MobileServerSuccessResponse
  | MobileServerFailureResponse;
