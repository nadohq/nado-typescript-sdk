# `@nadohq/otc-client`

HTTP client for the Nado OTC service. Submits an already-signed fill-or-kill taker order,
reads that execution back, and builds quote subscriptions. No bearer token and no wallet client.

The caller opens the quote WebSocket. A quote can prefill a form; `execute` does not
require one.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Usage

```ts
import { OtcClient, OTC_CLIENT_ENDPOINTS } from '@nadohq/otc-client';

const otc = new OtcClient({ url: OTC_CLIENT_ENDPOINTS.inkMainnet });

const result = await otc.execute({
  dealId: crypto.randomUUID(),
  taker,
});

if (result.deal_id && result.taker_digest) {
  const status = await otc.getExecutionStatus({
    dealId: result.deal_id,
    takerDigest: result.taker_digest,
  });
}
```

A `failure` from admission has no digest, so there is nothing to poll. Poll an in-progress
failure once it includes `taker_digest`.

It is also available on a `NadoClient` context.

```ts
const result = await nadoClient.context.otcClient.execute({ dealId, taker });
```

## Quotes

`subscribe` and `unsubscribe` are the only RFQ methods. Pass one `stream`, or `streams` for
several. `unsubscribe` repeats the same stream fields. `wallet` is a 20-byte address.
Socket messages use the server types directly.

```ts
import {
  buildOtcRfqSubscriptionMessage,
  OTC_RFQ_WS_CLIENT_ENDPOINTS,
  OtcServerRfqMessage,
} from '@nadohq/otc-client';

const ws = new WebSocket(OTC_RFQ_WS_CLIENT_ENDPOINTS.inkMainnet);

ws.onopen = () => {
  ws.send(
    JSON.stringify(
      buildOtcRfqSubscriptionMessage('subscribe', {
        id: 1,
        stream: {
          type: 'quote',
          productId: 2,
          wallet,
          size: '-1000000000000000000',
          sizeUnit: 'base',
        },
      }),
    ),
  );
};

ws.onmessage = (event) => {
  const message = JSON.parse(String(event.data)) as OtcServerRfqMessage;
  if ('type' in message && message.type === 'quote_batch') {
    for (const quote of message.quotes) {
      if (quote.status === 'available' && quote.price_x18) {
        // quote.price_x18, quote.valid_until_ms, quote.base_size
      }
    }
  }
};
```

An ack has `result: null` and sets `error` when the server rejected that request. A
`quote_batch` follows a successful subscribe. `status: 'available'` carries `price_x18`,
`valid_until_ms`, and `base_size`. `status: 'unavailable'` does not.

`execute` and `getExecutionStatus` return the JSON body for success, failure, and
`pending_resolution`, including non-200 admission responses. Branch on `status` and
`recovery_action`, not the HTTP code. `getReady` reports whether a route's quote and deal
coverage overlap.
