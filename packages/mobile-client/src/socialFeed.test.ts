import { describe, expect, it } from '@jest/globals';
import { encode } from '@msgpack/msgpack';
import {
  getNadoEIP712Domain,
  getNadoEIP712PrimaryType,
  getNadoEIP712Types,
  subaccountToHex,
  WalletNotProvidedError,
} from '@nadohq/shared';
import {
  createWalletClient,
  http,
  keccak256,
  recoverTypedDataAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import { MobileClient } from './MobileClient';
import {
  buildSignedMobileRequest,
  canonicalizeMobileInner,
  getMobilePayloadHash,
  MobileQueryInner,
} from './signing';
import { mapMobileSocialFeedModel } from './socialFeedMappers';
import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileServerFeedItemPatch,
  MobileServerFeedUpdatesResponse,
  MobileSignedRequestParams,
} from './types';

const itemId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const positionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
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

// Expected insertion order comes from the parameter tables in 009, not from the SDK canonicalizer.
const fixtures: MobileQueryInner[] = [
  {
    type: 'for_you_feed',
    market_category: 'crypto',
    feed_types: ['open'],
    minimum_notional: 500,
    limit: 1,
    session_id: 'OpaqueSession',
    cursor: 'OpaqueCursor',
  },
  {
    type: 'top_traders_feed',
    market_category: 'finance',
    feed_types: [],
    minimum_notional: 500,
    limit: 1,
    session_id: 'OpaqueSession',
    cursor: 'OpaqueCursor',
  },
  {
    type: 'friends_feed',
    market_category: 'crypto',
    feed_types: ['close'],
    minimum_notional: 500,
    limit: 1,
    session_id: 'OpaqueSession',
    cursor: 'OpaqueCursor',
  },
  {
    type: 'profile_feed',
    subaccount: subaccountToHex(auth),
    market_category: 'finance',
    feed_types: ['size_change'],
    minimum_notional: 500,
    limit: 1,
    session_id: 'OpaqueSession',
    cursor: 'OpaqueCursor',
  },
  {
    type: 'market_feed',
    product_id: 2,
    feed_types: ['open'],
    minimum_notional: 500,
    limit: 1,
    session_id: 'OpaqueSession',
    cursor: 'OpaqueCursor',
  },
  {
    type: 'position_feed',
    position_id: positionId,
    feed_types: ['close'],
    minimum_notional: 500,
    limit: 1,
    session_id: 'OpaqueSession',
    cursor: 'OpaqueCursor',
  },
  {
    type: 'feed_item',
    item_id: itemId,
    comment_preview_limit: 0,
    session_id: 'OpaqueSession',
  },
  {
    type: 'feed_updates',
    session_id: 'OpaqueSession',
    visible_item_ids: [itemId],
    visible_position_ids: [positionId],
    update_cursor: 'OpaqueUpdate',
    viewport_revision: 0,
    request_seq: 0,
  },
];

describe('[mobile-client]: F01 signing', () => {
  it.each(fixtures)(
    'encodes and signs $type in documented order',
    async (expected) => {
      const reversed = Object.fromEntries(
        Object.entries(expected).reverse(),
      ) as MobileQueryInner;
      const canonical = canonicalizeMobileInner(reversed);
      expect(encode(canonical)).toEqual(encode(expected));
      const payloadHash = keccak256(encode(expected));
      expect(getMobilePayloadHash(canonical)).toBe(payloadHash);
      const signed = await buildSignedMobileRequest({
        ...auth,
        walletClient,
        inner: reversed,
        nonce: 30_000_000_000_000n,
      });
      const recovered = await recoverTypedDataAddress({
        domain: getNadoEIP712Domain(auth.verifyingAddr, auth.chainId),
        types: getNadoEIP712Types('nado_authentication'),
        primaryType: getNadoEIP712PrimaryType('nado_authentication'),
        message: {
          method: `mobile:query_${expected.type}`,
          sender: subaccountToHex(auth),
          payloadHash,
          nonce: BigInt(signed.nonce),
        },
        signature: signed.signature,
      });
      expect(recovered.toLowerCase()).toBe(owner.address.toLowerCase());
    },
  );

  it('omits absent options, preserves explicit zero/empty arrays, and canonicalizes UUIDs only', () => {
    expect(
      canonicalizeMobileInner({ type: 'for_you_feed', limit: undefined }),
    ).toEqual({ type: 'for_you_feed' });
    expect(
      canonicalizeMobileInner({
        type: 'feed_item',
        item_id: itemId.toUpperCase(),
        comment_preview_limit: 0,
        session_id: 'OpaqueCase',
      }),
    ).toEqual({
      type: 'feed_item',
      item_id: itemId,
      comment_preview_limit: 0,
      session_id: 'OpaqueCase',
    });
    const canonical = canonicalizeMobileInner({
      type: 'feed_updates',
      session_id: 'OpaqueCase',
      visible_item_ids: [itemId.toUpperCase()],
      visible_position_ids: [],
      update_cursor: undefined,
      viewport_revision: 0,
      request_seq: 0,
    });
    expect(Object.keys(canonical)).toEqual([
      'type',
      'session_id',
      'visible_item_ids',
      'visible_position_ids',
      'viewport_revision',
      'request_seq',
    ]);
    expect(canonical).toMatchObject({
      session_id: 'OpaqueCase',
      visible_item_ids: [itemId],
      visible_position_ids: [],
      viewport_revision: 0,
      request_seq: 0,
    });
  });
});

function mockClient(data: unknown = { status: 'success' }, status = 200) {
  const client = new MobileClient({
    url: 'https://mobile.example/v1/mobile',
    walletClient,
  });
  const requests: Array<{
    url: string | undefined;
    body: Record<string, unknown>;
  }> = [];
  client.axiosInstance.defaults.adapter = (config) => {
    requests.push({
      url: config.url,
      body: JSON.parse(String(config.data)) as Record<string, unknown>,
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

describe('[mobile-client]: F01 transport', () => {
  it('routes all public reads without signing, even when a wallet is configured', async () => {
    const { client, requests } = mockClient();
    await client.getForYouFeed({
      minimumNotional: 500,
      viewerToken: 'OpaqueViewer',
    });
    await client.getTopTradersFeed();
    await client.getProfileFeed({ subaccount: auth });
    await client.getMarketFeed({ productId: 2 });
    await client.getPositionFeed({ positionId: positionId.toUpperCase() });
    await client.getFeedItem({
      itemId: itemId.toUpperCase(),
      commentPreviewLimit: 0,
    });
    await client.getFeedUpdates({
      sessionId: 'session',
      visibleItemIds: [],
      visiblePositionIds: [],
      viewportRevision: 0,
      requestSeq: 0,
      viewerToken: 'OpaqueViewer',
    });
    expect(requests.map(({ body }) => body.type)).toEqual([
      'for_you_feed',
      'top_traders_feed',
      'profile_feed',
      'market_feed',
      'position_feed',
      'feed_item',
      'feed_updates',
    ]);
    for (const request of requests) {
      expect(request.url).toBe('https://mobile.example/v1/mobile/public_query');
      expect(request.body).not.toHaveProperty('signature');
      expect(request.body).not.toHaveProperty('sender');
    }
    expect(requests[0].body).toEqual({
      type: 'for_you_feed',
      minimum_notional: 500,
      viewer_token: 'OpaqueViewer',
    });
    expect(requests[2].body.subaccount).toBe(subaccountToHex(auth));
    expect(requests[4].body).toEqual({
      type: 'position_feed',
      position_id: positionId,
    });
    expect(requests[5].body).toEqual({
      type: 'feed_item',
      item_id: itemId,
      comment_preview_limit: 0,
    });
    expect(requests[6].body).toEqual({
      type: 'feed_updates',
      session_id: 'session',
      visible_item_ids: [],
      visible_position_ids: [],
      viewport_revision: 0,
      request_seq: 0,
      viewer_token: 'OpaqueViewer',
    });
  });

  it('routes all signed reads through query and uses the linked signer while preserving the owner', async () => {
    const { client, requests } = mockClient();
    client.setLinkedSigner(
      createWalletClient({ account: linked, chain: ink, transport: http() }),
    );
    await client.getForYouFeed({ auth });
    await client.getTopTradersFeed({ auth });
    await client.getFriendsFeed({ auth });
    await client.getProfileFeed({
      auth,
      subaccount: {
        subaccountOwner: linked.address,
        subaccountName: 'default',
      },
    });
    await client.getMarketFeed({ auth, productId: 2 });
    await client.getPositionFeed({ auth, positionId });
    await client.getFeedItem({ auth, itemId });
    await client.getFeedUpdates({
      auth,
      sessionId: 'session',
      visibleItemIds: [itemId],
      visiblePositionIds: [],
      viewportRevision: 1,
      requestSeq: 2,
    });
    expect(requests).toHaveLength(8);
    for (const { url, body } of requests) {
      expect(url).toBe('https://mobile.example/v1/mobile/query');
      expect(body.sender).toBe(subaccountToHex(auth));
      expect(body).not.toHaveProperty('viewer_token');
      const { signature, sender, nonce, ...inner } = body;
      const recovered = await recoverTypedDataAddress({
        domain: getNadoEIP712Domain(auth.verifyingAddr, auth.chainId),
        types: getNadoEIP712Types('nado_authentication'),
        primaryType: getNadoEIP712PrimaryType('nado_authentication'),
        message: {
          method: `mobile:query_${String(body.type)}`,
          sender,
          payloadHash: keccak256(encode(inner)),
          nonce: BigInt(String(nonce)),
        },
        signature: signature as `0x${string}`,
      });
      expect(recovered.toLowerCase()).toBe(linked.address.toLowerCase());
    }
  });

  it('requires a wallet for signed reads and rejects mixed or missing credentials before HTTP', async () => {
    const { client, requests } = mockClient();
    await expect(
      client.getForYouFeed({
        auth,
        viewerToken: 'forbidden',
      } as unknown as Parameters<MobileClient['getForYouFeed']>[0]),
    ).rejects.toThrow('cannot include viewerToken');
    await expect(
      client.getFriendsFeed(
        {} as Parameters<MobileClient['getFriendsFeed']>[0],
      ),
    ).rejects.toThrow('requires a signing identity');
    await expect(
      client.getFeedUpdates({
        sessionId: 's',
        visibleItemIds: [],
        visiblePositionIds: [],
        viewportRevision: 0,
        requestSeq: 0,
      } as unknown as Parameters<MobileClient['getFeedUpdates']>[0]),
    ).rejects.toThrow('require the session viewerToken');
    client.opts.walletClient = undefined;
    await expect(client.getFriendsFeed({ auth })).rejects.toBeInstanceOf(
      WalletNotProvidedError,
    );
    expect(requests).toHaveLength(0);
  });

  it('preserves fixed empty pages and never auto-refreshes or reorders a session', async () => {
    const { client, requests } = mockClient({
      status: 'success',
      items: [],
      next_cursor: 'NextWindow',
      watermark: 'Watermark',
      ranking_version: 'chronological-v1',
      read_session: {
        session_id: 'Session',
        mode: 'feed',
        expires_at_ms: 42,
        view_tracking: { min_visible_ratio: 0.5, min_duration_ms: 1000 },
        update_cursor: null,
        viewer_token: 'Viewer',
      },
    });
    const page = await client.getForYouFeed({
      sessionId: 'Session',
      cursor: 'Window',
      viewerToken: 'Viewer',
      limit: 1,
    });
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBe('NextWindow');
    expect(page.readSession.viewerToken).toBe('Viewer');
    expect(page).not.toHaveProperty('status');
    expect(requests).toHaveLength(1);
  });

  it('preserves typed HTTP failures and rejects non-envelope framework errors', async () => {
    const { client } = mockClient(
      {
        status: 'failure',
        error: 'expired',
        error_code: MOBILE_ERROR_CODES.SOCIAL_FEED_SESSION_EXPIRED,
        request_type: 'query_friends_feed',
      },
      410,
    );
    await expect(client.getFriendsFeed({ auth })).rejects.toMatchObject({
      errorCode: 6312,
      requestType: 'query_friends_feed',
      httpStatus: 410,
    });
    await expect(client.getFriendsFeed({ auth })).rejects.toBeInstanceOf(
      MobileServerFailureError,
    );
    await expect(
      mockClient('invalid JSON', 422).client.getForYouFeed(),
    ).rejects.toThrow('Unexpected response');
    await expect(
      mockClient({ items: [] }).client.getForYouFeed(),
    ).rejects.toThrow('missing success envelope');
  });
});

describe('[mobile-client]: F01 response mapping', () => {
  it('preserves precision, signed zero, nullable liquidation facts, and omitted patch fields', () => {
    const patch: MobileServerFeedItemPatch = {
      item_id: itemId,
      version: '9007199254740993',
      quantity_x18: '123456789012345678901234567890',
      notional_x18: null,
      average_price_x18: '0',
      realized_pnl_delta_x18: '-1000000000000000001',
    };
    const mapped = mapMobileSocialFeedModel(patch);
    expect(mapped.quantityX18?.toFixed()).toBe(patch.quantity_x18);
    expect(mapped.realizedPnlDeltaX18?.toFixed()).toBe('-1000000000000000001');
    expect(mapped.averagePriceX18?.isZero()).toBe(true);
    expect(mapped.notionalX18).toBeNull();
    expect(mapped.version).toBe('9007199254740993');
    expect(mapped).not.toHaveProperty('entryPriceX18');
    expect(patch).toHaveProperty('quantity_x18');
  });

  it('maps nested position PnL and revocations without losing sequence or baseline', () => {
    const response: MobileServerFeedUpdatesResponse = {
      item_patches: [],
      position_patches: [
        {
          position_id: positionId,
          position_version: '3',
          state_as_of_ms: 42,
          entry_price_x18: null,
          display_basis: 'closing_snapshot',
          snapshot_at_ms: 40,
          quantity_x18: '1000000000000000000',
          notional_x18: '2000000000000000000',
          state: 'closed',
          history_quality: 'partial',
          margin_mode: 'cross',
          leverage: { value: null, basis: 'not_applicable' },
          leverage_at_ms: null,
          pnl: {
            amount_x18: null,
            basis: 'realized_incl_fees_funding',
            mode: 'frozen',
            as_of_ms: 42,
            quality: 'pending',
          },
        },
      ],
      unavailable_targets: [
        { type: 'item', id: itemId, reason: 'unavailable' },
      ],
      new_items_count: 0,
      update_cursor: 'OpaqueUpdate',
      reset: true,
      viewport_revision: 2,
      request_seq: 3,
      as_of_ms: 42,
    };
    const mapped = mapMobileSocialFeedModel(response);
    expect(mapped.positionPatches[0].quantityX18.toFixed()).toBe(
      '1000000000000000000',
    );
    expect(mapped.positionPatches[0].pnl.amountX18).toBeNull();
    expect(mapped.positionPatches[0].pnl.quality).toBe('pending');
    expect(mapped.unavailableTargets).toEqual(response.unavailable_targets);
    expect(mapped).toMatchObject({
      updateCursor: 'OpaqueUpdate',
      reset: true,
      viewportRevision: 2,
      requestSeq: 3,
    });
  });
});
