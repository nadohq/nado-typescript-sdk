export type OtcQuoteSizeUnit = 'base' | 'quote';

interface OtcServerExecutionDiagnostics {
  failure_source?: string;
  failure_stage?: string;
  upstream_error_code?: string;
  retryable?: boolean;
  /**
   * Documented values are `retry_same_request`, `sign_new_order`, `reconcile`, `wait`, and
   * `none`. Anything else is returned as-is and does not authorize a resend.
   */
  recovery_action?: string;
  retry_after_ms?: number;
}

export interface OtcServerExecutionSuccess {
  status: 'success';
  deal_id: string;
  taker_digest: string;
  settlement_id?: string;
}

export interface OtcServerExecutionFailure extends OtcServerExecutionDiagnostics {
  status: 'failure';
  error: string;
  error_code: number;
  deal_id?: string;
  taker_digest?: string;
}

export interface OtcServerExecutionPendingResolution extends OtcServerExecutionDiagnostics {
  status: 'pending_resolution';
  deal_id: string;
  taker_digest: string;
  error?: string;
  error_code?: number;
}

/** JSON body from `POST /v1/executor` and `POST /v1/executor/status`, including non-200 responses. */
export type OtcServerExecutionResponse =
  | OtcServerExecutionSuccess
  | OtcServerExecutionFailure
  | OtcServerExecutionPendingResolution;

export interface OtcServerQuoteStream {
  type: 'quote';
  product_id: number;
  wallet: string;
  size: string;
  size_unit: OtcQuoteSizeUnit;
  pricer_id?: string;
}

export interface OtcServerRfqSubscribeStreamRequest {
  method: 'subscribe';
  id: number;
  stream: OtcServerQuoteStream;
}

export interface OtcServerRfqSubscribeStreamsRequest {
  method: 'subscribe';
  id: number;
  streams: OtcServerQuoteStream[];
}

export interface OtcServerRfqUnsubscribeStreamRequest {
  method: 'unsubscribe';
  id: number;
  stream: OtcServerQuoteStream;
}

export interface OtcServerRfqUnsubscribeStreamsRequest {
  method: 'unsubscribe';
  id: number;
  streams: OtcServerQuoteStream[];
}

export type OtcServerRfqSubscriptionRequest =
  | OtcServerRfqSubscribeStreamRequest
  | OtcServerRfqSubscribeStreamsRequest
  | OtcServerRfqUnsubscribeStreamRequest
  | OtcServerRfqUnsubscribeStreamsRequest;

/** One quote inside a `quote_batch`. `available` includes price fields; `unavailable` omits them. */
export interface OtcServerQuote {
  product_id: number;
  type: 'quote';
  size_unit: OtcQuoteSizeUnit;
  size: string;
  wallet: string;
  pricer_id: string;
  status: string;
  price_x18?: string;
  valid_until_ms?: string;
  base_size?: string;
}

export interface OtcServerQuoteBatch {
  type: 'quote_batch';
  time: string;
  quotes: OtcServerQuote[];
}

export interface OtcServerRfqAck {
  result: null;
  id: number;
  /** Set when the server rejected the request. Absent on success. */
  error?: string;
}

export type OtcServerRfqMessage = OtcServerRfqAck | OtcServerQuoteBatch;
