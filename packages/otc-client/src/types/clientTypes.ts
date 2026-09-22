import { EngineServerPlaceOrderParams } from '@nadohq/engine-client';
import { OtcQuoteSizeUnit } from './serverTypes';

/**
 * Signed Nado order the OTC service settles. An engine `place_order` payload without
 * `id`, `spot_leverage`, and `borrow_margin`.
 */
export type OtcServerTakerOrderParams = Omit<
  EngineServerPlaceOrderParams,
  'id' | 'spot_leverage' | 'borrow_margin'
>;

export interface OtcExecuteParams {
  /** Client-generated idempotency key, 1–128 bytes. Kept across retries of this intent. */
  dealId: string;
  taker: OtcServerTakerOrderParams;
  /** Execution route. Omitted selects the service default (`awr`). */
  pricerId?: string;
}

export interface OtcGetExecutionStatusParams {
  dealId: string;
  takerDigest: string;
}

export interface OtcGetReadyParams {
  pricerId?: string;
}

/**
 * Route coverage. HTTP 200 is ready; 400 and 503 are not. This does not guarantee liquidity
 * or that an order will be accepted.
 */
export interface OtcReadyResult {
  httpStatus: number;
  ready: boolean;
}

/**
 * One quote subscription. `wallet` is a 20-byte address, not a 32-byte subaccount.
 * `size` is a non-zero signed x18 integer string.
 */
export interface OtcQuoteStream {
  type: 'quote';
  productId: number;
  wallet: string;
  size: string;
  sizeUnit: OtcQuoteSizeUnit;
  /** Execution route. Omitted selects the service default (`awr`). */
  pricerId?: string;
}

export interface OtcRfqSubscriptionStreamParams {
  id: number;
  stream: OtcQuoteStream;
}

export interface OtcRfqSubscriptionStreamsParams {
  id: number;
  streams: OtcQuoteStream[];
}

/** Subscribe or unsubscribe target. Pass one stream, or several. */
export type OtcRfqSubscriptionParams =
  | OtcRfqSubscriptionStreamParams
  | OtcRfqSubscriptionStreamsParams;
