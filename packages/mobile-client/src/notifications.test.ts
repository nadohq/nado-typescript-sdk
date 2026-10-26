import { describe, expect, it } from '@jest/globals';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
  subaccountToHex,
  WalletNotProvidedError,
} from '@nadohq/shared';
import { createWalletClient, http, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import { MobileClient } from './MobileClient';
import {
  getMobilePayloadHash,
  MobileSignedInner,
  MobileSignedRequest,
} from './signing';
import {
  MOBILE_ERROR_CODES,
  MobileNotificationCapabilities,
  MobileNotificationRegistrationV2,
  MobileNotificationRouteName,
  MobileNotificationSettingsV2,
  MobileNotificationSubscriptionsUpdate,
  MobileProductEvent,
  MobileServerFailureError,
  MobileServerNotificationDeviceMetadata,
  MobileServerRegisteredWalletResponse,
  MobileServerRegisterExpoTokenParams,
  MobileServerWithExpoTokenParams,
  MobileSignedRequestParams,
} from './types';

/** Whether a fixture shape is assignable to a public contract, checked by TypeScript rather than a cast. */
type IsAssignable<Source, Target> = [Source] extends [Target] ? true : false;

const owner = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907',
);
const linked = privateKeyToAccount(
  '0x0123456789012345678901234567890123456789012345678901234567890123',
);
const walletClient = createWalletClient({
  account: owner,
  chain: ink,
  transport: http(),
});
const auth: MobileSignedRequestParams = {
  subaccountOwner: owner.address,
  subaccountName: 'default',
  chainId: ink.id,
  verifyingAddr: '0x0000000000000000000000000000000000000001',
};
const expoToken = 'ExponentPushToken[notifications-unit-test]';
const notificationId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const target =
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd64656661756c740000000000' as const;
const capabilities: MobileNotificationCapabilities = {
  routes: ['portfolio', 'profile'],
  type_ids: ['order_fill', 'new_follower'],
  payload_versions: [2],
};
const settings: MobileNotificationSettingsV2 = {
  schema_version: 2,
  revision: 7,
  settings: {
    my_positions: true,
    position_thresholds: [25],
    my_orders: true,
    following_trades: false,
    following_posts: true,
    min_trade_size_usd: 0,
    new_followers: true,
    announcements: false,
    discovery: false,
  },
};
const searchEvent: MobileProductEvent = {
  query: 'BTC',
  product_id: null,
  occurred_at: 1792886400000,
  notification_id: null,
  event_name: 'search',
  client_event_id: eventId,
};

function mockClient(
  data: unknown = { status: 'success' },
  status = 200,
  signed = true,
) {
  const client = new MobileClient({
    url: 'https://mobile.example/v1/mobile',
    walletClient: signed ? walletClient : undefined,
  });
  const requests: { url?: string; body: Record<string, unknown> }[] = [];
  client.axiosInstance.defaults.adapter = (config) => {
    requests.push({
      url: config.url,
      body: JSON.parse(config.data as string) as Record<string, unknown>,
    });
    return Promise.resolve({
      data,
      status,
      statusText: 'mock',
      headers: {},
      config,
    });
  };
  return { client, requests };
}

const signedCases: {
  name: string;
  route: 'query' | 'execute';
  method: string;
  run: (client: MobileClient) => Promise<unknown>;
  expected: MobileSignedInner;
}[] = [
  {
    name: 'registerExpoTokenV2',
    route: 'execute',
    method: 'mobile:execute_register_expo_token_v2',
    run: (client) =>
      client.registerExpoTokenV2({
        ...auth,
        expoToken,
        platform: 'ios',
        capabilities,
      }),
    expected: {
      type: 'register_expo_token_v2',
      expo_token: expoToken,
      platform: 'ios',
      locale: null,
      app_version: null,
      capabilities: {
        payload_versions: [2],
        type_ids: ['order_fill', 'new_follower'],
        routes: ['portfolio', 'profile'],
      },
    },
  },
  {
    name: 'getNotificationSubscriptions',
    route: 'query',
    method: 'mobile:query_notification_subscriptions',
    run: (client) => client.getNotificationSubscriptions(auth),
    expected: { type: 'notification_subscriptions' },
  },
  {
    name: 'getNotificationInboxV2',
    route: 'query',
    method: 'mobile:query_notification_inbox_v2',
    run: (client) => client.getNotificationInboxV2(auth),
    expected: { type: 'notification_inbox_v2', cursor: null, limit: null },
  },
  {
    name: 'updateNotificationSubscriptions',
    route: 'execute',
    method: 'mobile:execute_update_notification_subscriptions',
    run: (client) =>
      client.updateNotificationSubscriptions({
        ...auth,
        update: {
          import_markets: null,
          market: null,
          trader_bell: {
            enabled: true,
            subaccount: `0x${target.slice(2).toUpperCase()}`,
          },
          expected_revision: 3,
        },
      }),
    expected: {
      type: 'update_notification_subscriptions',
      expected_revision: 3,
      trader_bell: { subaccount: target, enabled: true },
      market: null,
      import_markets: null,
    },
  },
  {
    name: 'recordProductEvents',
    route: 'execute',
    method: 'mobile:execute_record_product_events',
    run: (client) =>
      client.recordProductEvents({ ...auth, events: [searchEvent] }),
    expected: {
      type: 'record_product_events',
      events: [
        {
          client_event_id: eventId,
          event_name: 'search',
          notification_id: null,
          occurred_at: searchEvent.occurred_at,
          product_id: null,
          query: 'BTC',
        },
      ],
    },
  },
];

describe('[mobile-client]: notification v2 signing and transport', () => {
  describe.each([false, true])('linked signer: %s', (useLinkedSigner) => {
    it.each(signedCases)(
      '$name uses the correct route, method, sender and canonical hash',
      async ({ route, method, run, expected }) => {
        const { client, requests } = mockClient();
        if (useLinkedSigner) {
          client.setLinkedSigner(
            createWalletClient({
              account: linked,
              chain: ink,
              transport: http(),
            }),
          );
        }
        await run(client);
        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe(
          `https://mobile.example/v1/mobile/${route}`,
        );
        const { sender, signature, nonce, ...inner } = requests[0]
          .body as MobileSignedRequest;
        expect(sender).toBe(subaccountToHex(auth));
        expect(typeof nonce).toBe('string');
        expect(inner).toEqual(expected);
        expect(getMobilePayloadHash(inner)).toBe(
          getMobilePayloadHash(expected),
        );
        const recovered = await recoverTypedDataAddress({
          domain: getNadoEIP712Domain(auth.verifyingAddr, auth.chainId),
          types: getNadoEIP712Types('nado_authentication'),
          primaryType: getNadoEIP712PrimaryType('nado_authentication'),
          message: {
            method,
            sender,
            payloadHash: getMobilePayloadHash(expected),
            nonce: BigInt(nonce),
          },
          signature,
        });
        expect(recovered.toLowerCase()).toBe(
          (useLinkedSigner ? linked : owner).address.toLowerCase(),
        );
      },
    );
  });

  it.each(signedCases)(
    '$name requires a signer before sending a request',
    async ({ run }) => {
      const { client, requests } = mockClient(undefined, 200, false);
      await expect(run(client)).rejects.toBeInstanceOf(WalletNotProvidedError);
      expect(requests).toHaveLength(0);
    },
  );

  it.each<MobileNotificationSubscriptionsUpdate>([
    {
      expected_revision: 0,
      trader_bell: null,
      market: { subscribed: false, product_id: 2 },
      import_markets: null,
    },
    {
      expected_revision: 1,
      trader_bell: null,
      market: null,
      import_markets: [4, 2, 4],
    },
    {
      expected_revision: 2,
      trader_bell: null,
      market: null,
      import_markets: [],
    },
  ])('preserves market/import operations: %j', async (update) => {
    const original = JSON.stringify(update);
    const { client, requests } = mockClient();
    await client.updateNotificationSubscriptions({ ...auth, update });
    expect(requests[0].body).toMatchObject({ ...update });
    if (requests[0].body.market) {
      expect(Object.keys(requests[0].body.market)).toEqual([
        'product_id',
        'subscribed',
      ]);
    }
    expect(JSON.stringify(update)).toBe(original);
  });

  it('preserves all product event kinds, stable IDs, nulls, and timestamps across retries', async () => {
    const events: MobileProductEvent[] = [
      {
        ...searchEvent,
        event_name: 'notif_opened',
        notification_id: notificationId,
        query: null,
      },
      {
        ...searchEvent,
        event_name: 'market_viewed',
        product_id: 2,
        query: null,
      },
      {
        ...searchEvent,
        event_name: 'chart_opened',
        product_id: 4,
        query: null,
      },
      searchEvent,
    ];
    const original = JSON.stringify(events);
    const { client, requests } = mockClient();
    await client.recordProductEvents({ ...auth, events });
    await client.recordProductEvents({ ...auth, events });
    expect(requests[0].body.events).toEqual(events);
    expect(requests[1].body.events).toEqual(events);
    expect(requests[0].body.nonce).not.toBe(requests[1].body.nonce);
    expect(JSON.stringify(events)).toBe(original);
  });
});

describe('[mobile-client]: notification v2 responses and failures', () => {
  it('keeps v2 registration and legacy query capability versions distinct', () => {
    const registrationVersions: [
      IsAssignable<[1], MobileNotificationCapabilities['payload_versions']>,
      IsAssignable<[2], MobileNotificationCapabilities['payload_versions']>,
      IsAssignable<[1, 2], MobileNotificationCapabilities['payload_versions']>,
    ] = [false, true, false];
    const queriedVersions: [
      IsAssignable<
        [1],
        MobileNotificationRegistrationV2['capabilities']['payload_versions']
      >,
      IsAssignable<
        [2],
        MobileNotificationRegistrationV2['capabilities']['payload_versions']
      >,
      IsAssignable<
        [1, 2],
        MobileNotificationRegistrationV2['capabilities']['payload_versions']
      >,
    ] = [true, true, false];
    expect(registrationVersions).toEqual([false, true, false]);
    expect(queriedVersions).toEqual([true, true, false]);
  });

  it('keeps shared credentials and nullable registration metadata required', () => {
    const optionalTokenAccepted: IsAssignable<
      { expo_token?: string },
      MobileServerWithExpoTokenParams
    > = false;
    const missingMetadataAccepted: IsAssignable<
      Pick<MobileServerRegisterExpoTokenParams, 'expo_token' | 'platform'>,
      MobileServerRegisterExpoTokenParams
    > = false;
    const params: MobileServerRegisterExpoTokenParams = {
      expo_token: expoToken,
      platform: 'ios',
      locale: null,
      app_version: null,
    };
    expect(optionalTokenAccepted).toBe(false);
    expect(missingMetadataAccepted).toBe(false);
    expect(params).toMatchObject({ locale: null, app_version: null });
  });

  it('derives the supported route names without allowing arbitrary destinations', () => {
    const routes: MobileNotificationRouteName[] = [
      'profile',
      'market',
      'portfolio',
    ];
    const arbitraryRouteAccepted: IsAssignable<
      'url',
      MobileNotificationRouteName
    > = false;
    expect(routes).toEqual(['profile', 'market', 'portfolio']);
    expect(arbitraryRouteAccepted).toBe(false);
  });

  it('maps shared device metadata without changing the legacy wallet response', async () => {
    const metadata: MobileServerNotificationDeviceMetadata = {
      platform: 'android',
      locale: 'en-US',
      app_version: '1.2.3',
    };
    const response: MobileServerRegisteredWalletResponse = {
      wallet: owner.address,
      ...metadata,
      token_fingerprint_prefix: 'a1b2c3d4',
      last_seen_at: 1792886400000,
    };
    const { client, requests } = mockClient(
      { status: 'success', ...response },
      200,
      false,
    );
    expect(await client.getRegisteredWallet({ expoToken })).toEqual({
      wallet: owner.address,
      platform: metadata.platform,
      locale: metadata.locale,
      appVersion: metadata.app_version,
      tokenFingerprintPrefix: response.token_fingerprint_prefix,
      lastSeenAt: response.last_seen_at,
    });
    expect(requests[0].body).toEqual({
      type: 'registered_wallet',
      expo_token: expoToken,
    });
  });

  it.each([1, 2] as const)(
    'reads version %i capabilities without a wallet and preserves generation precision',
    async (version) => {
      const registration: MobileNotificationRegistrationV2 = {
        registration_generation: '9007199254740993',
        capabilities:
          version === 1
            ? { payload_versions: [1], type_ids: [], routes: [] }
            : capabilities,
      };
      const { client, requests } = mockClient(
        { status: 'success', ...registration },
        200,
        false,
      );
      expect(
        await client.getNotificationRegistrationV2({ expoToken }),
      ).toMatchObject({ ...registration });
      expect(requests[0]).toEqual({
        url: 'https://mobile.example/v1/mobile/public_query',
        body: { type: 'notification_registration_v2', expo_token: expoToken },
      });
    },
  );

  it('reads and replaces the full settings document without a signer', async () => {
    const { client, requests } = mockClient(
      { status: 'success', ...settings },
      200,
      false,
    );
    expect(await client.getNotificationSettingsV2({ expoToken })).toMatchObject(
      { ...settings },
    );
    expect(requests[0]).toEqual({
      url: 'https://mobile.example/v1/mobile/public_query',
      body: { type: 'notification_settings_v2', expo_token: expoToken },
    });
    expect(
      await client.updateNotificationSettingsV2({
        expoToken,
        expectedRevision: 6,
        settings: settings.settings,
      }),
    ).toMatchObject({ ...settings });
    expect(requests[1]).toEqual({
      url: 'https://mobile.example/v1/mobile/public_execute',
      body: {
        type: 'update_notification_settings_v2',
        expo_token: expoToken,
        expected_revision: 6,
        settings: settings.settings,
      },
    });
  });

  it('returns subscription state without renaming or losing fields', async () => {
    const response = {
      status: 'success',
      revision: 4,
      favorites_imported: true,
      market_ids: [2, 4],
      trader_bells: [target],
    };
    const { client } = mockClient(response);
    expect(await client.getNotificationSubscriptions(auth)).toEqual(response);
  });

  it.each([true, false])(
    'preserves inbox navigation and optional attribution: %s',
    async (withAttribution) => {
      const response = {
        status: 'success',
        notifications: [
          {
            notification_id: notificationId,
            type_id: 'new_follower',
            created_at: 1792886400000,
            data: {
              payload_version: 2,
              notification_id: notificationId,
              recipient_wallet: owner.address,
              type_id: 'new_follower',
              template_version: 1,
              route: { name: 'profile', subaccount: target },
            },
            ...(withAttribution ? { trade_within_24h: false } : {}),
          },
        ],
        next_cursor: notificationId,
      };
      const { client, requests } = mockClient(response);
      expect(
        await client.getNotificationInboxV2({
          ...auth,
          cursor: notificationId,
          limit: 50,
        }),
      ).toEqual(response);
      expect(requests[0].body).toMatchObject({
        type: 'notification_inbox_v2',
        cursor: notificationId,
        limit: 50,
      });
    },
  );

  it('preserves empty inbox pages', async () => {
    const response = {
      status: 'success',
      notifications: [],
      next_cursor: null,
    };
    const { client } = mockClient(response);
    expect(await client.getNotificationInboxV2(auth)).toEqual(response);
  });

  it.each([
    {
      status: 400,
      errorCode: MOBILE_ERROR_CODES.INVALID_EXPO_TOKEN,
      requestType: 'public_query_notification_registration_v2',
      run: (client: MobileClient) =>
        client.getNotificationRegistrationV2({ expoToken }),
    },
    {
      status: 409,
      errorCode: MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT,
      requestType: 'public_execute_update_notification_settings_v2',
      run: (client: MobileClient) =>
        client.updateNotificationSettingsV2({
          expoToken,
          expectedRevision: 0,
          settings: settings.settings,
        }),
    },
    {
      status: 409,
      errorCode: MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT,
      requestType: 'execute_update_notification_subscriptions',
      run: (client: MobileClient) =>
        client.updateNotificationSubscriptions({
          ...auth,
          update: {
            expected_revision: 0,
            trader_bell: null,
            market: null,
            import_markets: [],
          },
        }),
    },
    {
      status: 400,
      errorCode: MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      requestType: 'query_notification_inbox_v2',
      run: (client: MobileClient) =>
        client.getNotificationInboxV2({ ...auth, limit: 0 }),
    },
    {
      status: 400,
      errorCode: MOBILE_ERROR_CODES.INVALID_NOTIFICATION_REQUEST,
      requestType: 'execute_record_product_events',
      run: (client: MobileClient) =>
        client.recordProductEvents({ ...auth, events: [] }),
    },
    {
      status: 401,
      errorCode: 2028,
      requestType: 'query_notification_subscriptions',
      run: (client: MobileClient) => client.getNotificationSubscriptions(auth),
    },
  ])(
    'propagates $requestType failures without retrying writes',
    async ({ status, errorCode, requestType, run }) => {
      const failure = {
        status: 'failure',
        error: 'Rejected',
        error_code: errorCode,
        request_type: requestType,
      };
      const { client, requests } = mockClient(failure, status);
      const result = run(client);
      await expect(result).rejects.toBeInstanceOf(MobileServerFailureError);
      await expect(result).rejects.toMatchObject({
        errorCode,
        requestType,
        httpStatus: status,
        responseData: failure,
      });
      expect(requests).toHaveLength(1);
    },
  );

  it('keeps non-envelope query failures as transport errors', async () => {
    const { client } = mockClient('<html>Bad gateway</html>', 502);
    await expect(client.getNotificationSubscriptions(auth)).rejects.toThrow(
      'Unexpected response from mobile service: 502',
    );
  });

  it('rejects malformed successful query envelopes', async () => {
    const { client } = mockClient({ notifications: [] });
    await expect(client.getNotificationInboxV2(auth)).rejects.toThrow(
      'missing success envelope',
    );
  });

  it('keeps legacy device registration on the old route without capabilities', async () => {
    const { client, requests } = mockClient();
    await client.registerExpoToken({ ...auth, expoToken, platform: 'ios' });
    expect(requests[0].body).toMatchObject({
      type: 'register_expo_token',
      locale: null,
      app_version: null,
    });
    expect(requests[0].body).not.toHaveProperty('capabilities');
  });

  it('keeps legacy preference writes unchanged', async () => {
    const { client, requests } = mockClient(undefined, 200, false);
    const result = await client.updateNotificationPreferences({
      expoToken,
      preferences: {
        schemaVersion: 1,
        categories: [{ category: 'order_fill', enabled: true, scopes: [] }],
      },
    });
    expect(result).toEqual({ status: 'success' });
    expect(requests[0].body).toEqual({
      type: 'update_preferences',
      expo_token: expoToken,
      preferences: {
        schema_version: 1,
        categories: [{ category: 'order_fill', enabled: true, scopes: [] }],
      },
    });
  });
});
