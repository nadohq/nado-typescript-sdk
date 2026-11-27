import { MobileSubmitTipParams } from '@nadohq/mobile-client';

/** A Mobile submission failed after signing; retryRequest replays the same withdrawal without signing again. */
export class SendTipError extends Error {
  /** Original failure for wallet rejection and server error handling; do not log raw transport errors. */
  readonly cause: unknown;
  /** Signature-bearing request for an explicit retry of this Tip; never log or persist it. */
  readonly retryRequest: MobileSubmitTipParams;

  constructor(cause: unknown, retryRequest: MobileSubmitTipParams) {
    super(cause instanceof Error ? cause.message : 'Tip submission failed');
    this.name = 'SendTipError';
    this.cause = cause;
    this.retryRequest = retryRequest;
    Object.defineProperty(this, 'cause', { enumerable: false });
    Object.defineProperty(this, 'retryRequest', { enumerable: false });
  }
}
