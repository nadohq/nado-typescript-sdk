import { describe, expect, it } from '@jest/globals';
import { buildOtcRfqSubscriptionMessage } from './rfqSubscription';

const stream = {
  type: 'quote' as const,
  productId: 2,
  wallet: '0x2222222222222222222222222222222222222222',
  size: '-1000000000000000000',
  sizeUnit: 'base' as const,
};

describe('buildOtcRfqSubscriptionMessage', () => {
  it('builds one stream and omits an empty pricer', () => {
    expect(
      buildOtcRfqSubscriptionMessage('subscribe', { id: 1, stream }),
    ).toEqual({
      method: 'subscribe',
      id: 1,
      stream: {
        type: 'quote',
        product_id: 2,
        wallet: stream.wallet,
        size: stream.size,
        size_unit: 'base',
      },
    });
  });

  it('builds several streams and keeps a pricer id', () => {
    expect(
      buildOtcRfqSubscriptionMessage('unsubscribe', {
        id: 2,
        streams: [{ ...stream, pricerId: 'awr' }],
      }),
    ).toEqual({
      method: 'unsubscribe',
      id: 2,
      streams: [
        {
          type: 'quote',
          product_id: 2,
          wallet: stream.wallet,
          size: stream.size,
          size_unit: 'base',
          pricer_id: 'awr',
        },
      ],
    });
  });
});
