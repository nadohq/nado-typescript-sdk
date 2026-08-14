import { createNadoClient, NadoClient } from '@nadohq/client';
import {
  DEFAULT_NADO_CLIENT_TYPE,
  NADO_CLIENT_TYPE_HEADER,
  NadoClientType,
} from '@nadohq/shared';
import { AxiosInstance } from 'axios';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  PENDING_TRIGGER_STATUS_TYPES,
  TEST_DELAYS,
  TEST_PRODUCT_IDS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

const TEST_CLIENT_TYPE: NadoClientType = 'web';

void describe(
  '[client]: client type header',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('defaults to the sdk client type', () => {
      const nadoClient = createNadoClient(tc.env.chainEnv, {
        walletClient: tc.walletClient,
        publicClient: tc.publicClient,
      });

      assertClientTypeHeaders(nadoClient, DEFAULT_NADO_CLIENT_TYPE);
    });

    void test('propagates a chain env client type to every sub-client', () => {
      const nadoClient = createNadoClient(
        { chainEnv: tc.env.chainEnv, clientType: TEST_CLIENT_TYPE },
        {
          walletClient: tc.walletClient,
          publicClient: tc.publicClient,
        },
      );

      assertClientTypeHeaders(nadoClient, TEST_CLIENT_TYPE);
    });

    void test('propagates a custom endpoint client type to every sub-client', () => {
      const nadoClient = createNadoClient(
        {
          contractAddresses: tc.contracts,
          engineEndpoint: tc.endpoints.engine,
          indexerEndpoint: tc.endpoints.indexer,
          triggerEndpoint: tc.endpoints.trigger,
          mobileEndpoint: tc.endpoints.mobile,
          clientType: TEST_CLIENT_TYPE,
        },
        {
          walletClient: tc.walletClient,
          publicClient: tc.publicClient,
        },
      );

      assertClientTypeHeaders(nadoClient, TEST_CLIENT_TYPE);
    });

    void test('retains the client type after swapping the wallet client', () => {
      const nadoClient = createNadoClient(
        { chainEnv: tc.env.chainEnv, clientType: TEST_CLIENT_TYPE },
        {
          walletClient: tc.walletClient,
          publicClient: tc.publicClient,
        },
      );
      // Rebuilds the whole context, so the sub-clients are recreated
      nadoClient.setWalletClient(tc.walletClient);

      assertClientTypeHeaders(nadoClient, TEST_CLIENT_TYPE);
    });

    void test('sends the header on live requests to every service', async () => {
      const nadoClient = createNadoClient(
        { chainEnv: tc.env.chainEnv, clientType: TEST_CLIENT_TYPE },
        {
          walletClient: tc.walletClient,
          publicClient: tc.publicClient,
        },
      );
      const { engineClient, indexerClient, triggerClient, mobileClient } =
        nadoClient.context;

      const sentEngineClientTypes = captureSentClientTypes(
        engineClient.axiosInstance,
      );
      const sentIndexerClientTypes = captureSentClientTypes(
        indexerClient.axiosInstance,
      );
      const sentTriggerClientTypes = captureSentClientTypes(
        triggerClient.axiosInstance,
      );
      const sentMobileClientTypes = captureSentClientTypes(
        mobileClient.axiosInstance,
      );

      // All requests are expected to succeed - the services must accept the additional header
      await engineClient.getStatus();
      await indexerClient.getFundingRate({
        productId: TEST_PRODUCT_IDS.PERP_BTC,
      });
      await triggerClient.listOrders({
        chainId: tc.chainId,
        statusTypes: PENDING_TRIGGER_STATUS_TYPES,
        subaccountName: TEST_SUBACCOUNT_NAME,
        subaccountOwner: tc.walletClientAddress,
        verifyingAddr: tc.endpointAddr,
      });
      await mobileClient.getFeed({ limit: 1 });

      debugPrint('Sent client types', {
        engine: sentEngineClientTypes,
        indexer: sentIndexerClientTypes,
        trigger: sentTriggerClientTypes,
        mobile: sentMobileClientTypes,
      });

      assertSentClientTypes(sentEngineClientTypes, 'engineClient');
      assertSentClientTypes(sentIndexerClientTypes, 'indexerClient');
      assertSentClientTypes(sentTriggerClientTypes, 'triggerClient');
      assertSentClientTypes(sentMobileClientTypes, 'mobileClient');
    });
  },
);

/**
 * Asserts that every sub-client of the given Nado client defaults to sending the expected client type.
 */
function assertClientTypeHeaders(
  nadoClient: NadoClient,
  expected: NadoClientType,
) {
  const { engineClient, indexerClient, triggerClient, mobileClient } =
    nadoClient.context;

  for (const [name, axiosInstance] of Object.entries({
    engineClient: engineClient.axiosInstance,
    indexerClient: indexerClient.axiosInstance,
    triggerClient: triggerClient.axiosInstance,
    mobileClient: mobileClient.axiosInstance,
  })) {
    assert.equal(
      axiosInstance.defaults.headers[NADO_CLIENT_TYPE_HEADER],
      expected,
      `${name} should default to the ${expected} client type header`,
    );
  }
}

/**
 * Records the client type header of every request sent through the given axios instance.
 */
function captureSentClientTypes(axiosInstance: AxiosInstance): unknown[] {
  const sentClientTypes: unknown[] = [];

  axiosInstance.interceptors.request.use((config) => {
    sentClientTypes.push(config.headers[NADO_CLIENT_TYPE_HEADER]);
    return config;
  });

  return sentClientTypes;
}

/**
 * Asserts that at least one request was sent and that all of them carried the test client type.
 */
function assertSentClientTypes(sentClientTypes: unknown[], name: string) {
  assert.ok(sentClientTypes.length > 0, `${name} should have sent a request`);
  for (const sentClientType of sentClientTypes) {
    assert.equal(
      sentClientType,
      TEST_CLIENT_TYPE,
      `${name} should send the ${TEST_CLIENT_TYPE} client type header`,
    );
  }
}
