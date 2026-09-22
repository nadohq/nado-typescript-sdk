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
 * Builds a subscribe or unsubscribe message for the RFQ socket.
 * `unsubscribe` uses the same stream fields as the original `subscribe`.
 */
export function buildOtcRfqSubscriptionMessage<
  TMethod extends OtcServerRfqSubscriptionRequest['method'],
>(
  method: TMethod,
  params: OtcRfqSubscriptionParams,
): Extract<OtcServerRfqSubscriptionRequest, { method: TMethod }> {
  const body =
    'stream' in params
      ? { stream: toServerStream(params.stream) }
      : { streams: params.streams.map(toServerStream) };
  return { method, id: params.id, ...body } as Extract<
    OtcServerRfqSubscriptionRequest,
    { method: TMethod }
  >;
}
