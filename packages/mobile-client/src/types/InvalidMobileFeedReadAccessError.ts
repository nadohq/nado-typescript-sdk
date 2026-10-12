import { MobileServerPublicQueryRequestType } from './serverRequestTypes';

/** Invalid or conflicting social feed credentials, rejected before sending a request. */
export class InvalidMobileFeedReadAccessError extends Error {
  /** Operation whose read credentials are invalid. */
  readonly requestType: MobileServerPublicQueryRequestType;

  constructor(
    requestType: MobileServerPublicQueryRequestType,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidMobileFeedReadAccessError';
    this.requestType = requestType;
  }
}
