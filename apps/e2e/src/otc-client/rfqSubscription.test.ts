import {
  buildOtcRfqSubscriptionMessage,
  OtcQuoteStream,
  OtcServerQuoteBatch,
  OtcServerRfqAck,
  OtcServerRfqMessage,
} from '@nadohq/otc-client';
import { addDecimals } from '@nadohq/shared';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
  assertArray,
  assertNonEmptyString,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_PRODUCT_IDS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

const MESSAGE_TIMEOUT_MS = 10_000;

function isAck(message: OtcServerRfqMessage): message is OtcServerRfqAck {
  return 'result' in message;
}

void describe(
  '[otc-client]: RFQ subscription',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;
    let ws: WebSocket;
    let stream: OtcQuoteStream;
    const inbox: OtcServerRfqMessage[] = [];
    const waiters: Array<(message: OtcServerRfqMessage) => void> = [];

    function nextMessage(): Promise<OtcServerRfqMessage> {
      const queued = inbox.shift();
      if (queued) {
        return Promise.resolve(queued);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('timed out waiting for RFQ message')),
          MESSAGE_TIMEOUT_MS,
        );
        waiters.push((message) => {
          clearTimeout(timer);
          resolve(message);
        });
      });
    }

    async function nextMessageOfKind<T extends OtcServerRfqMessage>(
      predicate: (message: OtcServerRfqMessage) => message is T,
    ): Promise<T> {
      for (;;) {
        const message = await nextMessage();
        if (predicate(message)) {
          return message;
        }
      }
    }

    before(async () => {
      tc = createTestContext();
      stream = {
        type: 'quote',
        productId: TEST_PRODUCT_IDS.PERP_BTC,
        wallet: tc.walletClientAddress,
        size: addDecimals(-1).toFixed(),
        sizeUnit: 'base',
      };

      ws = new WebSocket(tc.endpoints.otcRfqWs);
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as OtcServerRfqMessage;
        const waiter = waiters.shift();
        if (waiter) {
          waiter(message);
        } else {
          inbox.push(message);
        }
      };
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('RFQ socket failed to open'));
      });
    });

    after(() => {
      ws?.close();
    });

    void test('acks a subscribe and streams a quote batch', async () => {
      ws.send(
        JSON.stringify(
          buildOtcRfqSubscriptionMessage('subscribe', { id: 1, stream }),
        ),
      );

      const ack = await nextMessageOfKind(isAck);
      debugPrint('RFQ subscribe ack', ack);
      assert.equal(ack.id, 1);
      assert.equal(ack.result, null);

      // A route with no live pricer rejects the subscribe with a string error and sends no quotes
      if (ack.error !== undefined) {
        assertNonEmptyString(ack.error, 'ack.error');
        return;
      }

      const batch = await nextMessageOfKind(
        (m): m is OtcServerQuoteBatch => !isAck(m) && m.type === 'quote_batch',
      );
      debugPrint('RFQ quote batch', batch);

      assertNonEmptyString(batch.time, 'batch.time');
      assertArray(batch.quotes, 'batch.quotes');
      for (const quote of batch.quotes) {
        assert.equal(quote.type, 'quote');
        assert.equal(quote.product_id, stream.productId);
        // The server echoes the wallet lowercased
        assert.equal(quote.wallet.toLowerCase(), stream.wallet.toLowerCase());
        assert.equal(quote.size, stream.size);
        assert.equal(quote.size_unit, stream.sizeUnit);
        assertNonEmptyString(quote.pricer_id, 'quote.pricer_id');
        assertNonEmptyString(quote.status, 'quote.status');
        if (quote.status === 'available') {
          assertNonEmptyString(quote.price_x18, 'quote.price_x18');
          assertNonEmptyString(quote.valid_until_ms, 'quote.valid_until_ms');
          assertNonEmptyString(quote.base_size, 'quote.base_size');
        }
      }
    });

    void test('acks an unsubscribe with the same stream', async () => {
      ws.send(
        JSON.stringify(
          buildOtcRfqSubscriptionMessage('unsubscribe', { id: 2, stream }),
        ),
      );

      const ack = await nextMessageOfKind(
        (m): m is OtcServerRfqAck => isAck(m) && m.id === 2,
      );
      debugPrint('RFQ unsubscribe ack', ack);
      assert.equal(ack.result, null);
      assertNonNegativeInteger(ack.id, 'ack.id');
    });

    void test('rejects an unknown method with a string error', async () => {
      ws.send(JSON.stringify({ method: 'ping', id: 3 }));

      const ack = await nextMessageOfKind(
        (m): m is OtcServerRfqAck => isAck(m) && m.id === 3,
      );
      debugPrint('RFQ bad method ack', ack);
      assertNonEmptyString(ack.error, 'ack.error');
      assert.match(String(ack.error), /subscribe/);
    });
  },
);
