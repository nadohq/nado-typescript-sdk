import { EngineOrderParams } from '@nadohq/engine-client';
import {
  buildOtcRfqSubscriptionMessage,
  OtcServerQuote,
  OtcServerRfqMessage,
  OtcServerTakerOrderParams,
} from '@nadohq/otc-client';
import {
  addDecimals,
  BigNumberish,
  getOrderNonce,
  getOrderVerifyingAddress,
  packOrderAppendix,
  removeDecimals,
  toBigNumber,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import {
  assertHexString,
  assertNonEmptyString,
  assertNonNegativeInteger,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getExpiration } from '../utils/getExpiration';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** Taker sells this much base; negative is a sell on both the RFQ stream and the order. */
const TAKER_SIZE = -0.001;
const QUOTE_TIMEOUT_MS = 10_000;

void describe('[otc-client]: execute', { timeout: TEST_TIMEOUTS.LONG }, () => {
  let tc: RunContext;

  before(() => {
    tc = createTestContext();
  });

  beforeEach(async () => {
    await delay(TEST_DELAYS.STANDARD);
  });

  /**
   * Signs a fill-or-kill perp order with the engine builder and strips the engine-only
   * fields, which is exactly what a taker sends to OTC.
   */
  async function signTakerOrder(
    price: BigNumberish,
  ): Promise<OtcServerTakerOrderParams> {
    const order: EngineOrderParams = {
      subaccountOwner: tc.walletClientAddress,
      subaccountName: TEST_SUBACCOUNT_NAME,
      price,
      amount: addDecimals(TAKER_SIZE),
      expiration: getExpiration(60),
      appendix: packOrderAppendix({ orderExecutionType: 'fok' }),
    };
    const { payload } = await tc.engine.payloadBuilder.buildPlaceOrderPayload({
      verifyingAddr: getOrderVerifyingAddress(TEST_PRODUCT_IDS.PERP_BTC),
      chainId: tc.chainId,
      productId: TEST_PRODUCT_IDS.PERP_BTC,
      order,
      nonce: getOrderNonce(),
    });
    return {
      order: payload.order,
      signature: payload.signature,
      product_id: payload.product_id,
    };
  }

  /** Opens the RFQ socket and resolves with the first `available` quote, or null on timeout. */
  function fetchAvailableQuote(): Promise<OtcServerQuote | null> {
    return new Promise((resolve) => {
      const ws = new WebSocket(tc.endpoints.otcRfqWs);
      const finish = (quote: OtcServerQuote | null) => {
        clearTimeout(timer);
        ws.close();
        resolve(quote);
      };
      const timer = setTimeout(() => finish(null), QUOTE_TIMEOUT_MS);

      ws.onerror = () => finish(null);
      ws.onopen = () => {
        ws.send(
          JSON.stringify(
            buildOtcRfqSubscriptionMessage('subscribe', {
              id: 1,
              stream: {
                type: 'quote',
                productId: TEST_PRODUCT_IDS.PERP_BTC,
                wallet: tc.walletClientAddress,
                size: addDecimals(TAKER_SIZE).toFixed(),
                sizeUnit: 'base',
              },
            }),
          ),
        );
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as OtcServerRfqMessage;
        if ('result' in message) {
          if (message.error !== undefined) {
            finish(null);
          }
          return;
        }
        const quote = message.quotes.find((q) => q.status === 'available');
        if (quote) {
          finish(quote);
        }
      };
    });
  }

  void test('rejects an empty body at admission', async () => {
    const result = await tc.otc.execute({
      dealId: '',
      taker: {} as OtcServerTakerOrderParams,
    });
    debugPrint('OTC empty execute', result);

    assert.equal(result.status, 'failure');
    assertNonEmptyString(result.error, 'error');
    assertNonNegativeInteger(result.error_code, 'error_code');
    assert.equal(result.failure_stage, 'admission');
    assert.equal(result.retryable, false);
    assert.equal(result.recovery_action, 'sign_new_order');
  });

  void test('fails a signed order priced far from market', async () => {
    const dealId = `e2e-unfillable-${Date.now()}`;
    // Selling far above market cannot fill
    const taker = await signTakerOrder(10_000_000);

    const result = await tc.otc.execute({ dealId, taker });
    debugPrint('OTC unfillable execute', result);

    assert.equal(result.status, 'failure');
    assertNonEmptyString(result.error, 'error');
    assertNonNegativeInteger(result.error_code, 'error_code');
    assertNonEmptyString(result.recovery_action, 'recovery_action');
    assertNonEmptyString(result.failure_source, 'failure_source');
    assertNonEmptyString(result.failure_stage, 'failure_stage');

    // Only a deal that reached execution carries a digest and is pollable
    const takerDigest = result.taker_digest;
    if (!takerDigest) {
      return;
    }
    assert.equal(result.deal_id, dealId);
    assertHexString(takerDigest, 'taker_digest');

    await delay(TEST_DELAYS.LONG);
    const status = await tc.otc.getExecutionStatus({ dealId, takerDigest });
    debugPrint('OTC unfillable status', status);

    assert.equal(status.status, 'failure');
    assert.equal(status.deal_id, dealId);
    assert.equal(status.taker_digest, takerDigest);
  });

  void test('fills a signed order at a quoted price', async (context) => {
    const quote = await fetchAvailableQuote();
    if (!quote) {
      context.skip('no available quote for the taker size');
      return;
    }
    debugPrint('OTC quote', quote);
    const priceX18 = quote.price_x18;
    assert.ok(priceX18, 'available quote should carry price_x18');

    const dealId = `e2e-fill-${Date.now()}`;
    const taker = await signTakerOrder(removeDecimals(priceX18));
    assert.equal(toBigNumber(taker.order.priceX18).toFixed(), priceX18);

    const result = await tc.otc.execute({ dealId, taker });
    debugPrint('OTC fill execute', result);

    assert.equal(
      result.status,
      'success',
      `expected success, got ${result.status}: ${'error' in result ? result.error : ''}`,
    );
    assert.equal(result.deal_id, dealId);
    assertHexString(result.taker_digest, 'taker_digest');

    await delay(TEST_DELAYS.LONG);
    const status = await tc.otc.getExecutionStatus({
      dealId,
      takerDigest: result.taker_digest,
    });
    debugPrint('OTC fill status', status);

    assert.equal(status.status, 'success');
    assert.equal(status.deal_id, dealId);
    assert.equal(status.taker_digest, result.taker_digest);
  });
});
