import { OtcQuoteStream, OtcRfqSubscriptionParams } from './types/clientTypes';
import {
  OtcServerQuoteStream,
  OtcServerRfqSubscriptionRequest,
} from './types/serverTypes';

function toServerStream(stream: OtcQuoteStream): OtcServerQuoteStream {
  return {
    type: 'quote',
    product_id: stream.productId,
    wallet: stream.wallet,
    size: stream.size,
    size_unit: stream.sizeUnit,
    ...(stream.pricerId ? { pricer_id: stream.pricerId } : {}),
  };
}

/**
 * Builds a subscribe or unsubscribe message for the RFQ socket. The service only accepts the
 * `streams[]` envelope, so one stream is a one-entry batch. `unsubscribe` uses the same
 * stream fields as the original `subscribe`.
 */
export function buildOtcRfqSubscriptionMessage<
  TMethod extends OtcServerRfqSubscriptionRequest['method'],
>(
  method: TMethod,
  params: OtcRfqSubscriptionParams,
): Extract<OtcServerRfqSubscriptionRequest, { method: TMethod }> {
  return {
    method,
    id: params.id,
    streams: params.streams.map(toServerStream),
  } as Extract<OtcServerRfqSubscriptionRequest, { method: TMethod }>;
}
