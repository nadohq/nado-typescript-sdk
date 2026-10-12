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
  MOBILE_EIP712_METHOD_BY_TYPE,
  MobileSignedInner,
} from './signing';
import {
  mapMobileFeedAuthor,
  mapMobileFeedInteraction,
  mapMobileFeedItemPatch,
  mapMobileFeedUpdates,
  mapMobileSocialTradeCard,
  mapMobileSocialTradeRow,
} from './socialFeedMappers';
import {
  InvalidMobileFeedReadAccessError,
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileServerFeedItemPatch,
  MobileServerFeedReadSession,
  MobileServerFeedUpdatesResponse,
  MobileServerSignedQueryRequestType,
  MobileServerSocialTradeCard,
  MobileServerSocialTradeRow,
  MobileServerTopTradersFeedPage,
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

// Fixtures spell out the wire protocol field order independently of the canonicalizer.
const fixtures: Extract<
  MobileSignedInner,
  { type: MobileServerSignedQueryRequestType }
>[] = [
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

describe('[mobile-client]: social feed signing', () => {
  it.each(['for_you_feed', 'top_traders_feed', 'friends_feed'] as const)(
    'does not define a signing domain or payload for %s',
    (type) => {
      expect(MOBILE_EIP712_METHOD_BY_TYPE).not.toHaveProperty(type);
      expect(() => {
        // @ts-expect-error Main feeds are not signed payload variants.
        canonicalizeMobileInner({ type });
      }).toThrow('unhandled inner payload type');
    },
  );
  it.each(fixtures)(
    'encodes and signs $type in documented order',
    async (expected) => {
      const reversed = Object.fromEntries(
        Object.entries(expected).reverse(),
      ) as Extract<
        MobileSignedInner,
        { type: MobileServerSignedQueryRequestType }
      >;
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

  it('hashes absent feed options as omitted keys rather than MessagePack nil', () => {
    const inner = {
      type: 'market_feed' as const,
      product_id: 2,
      limit: undefined,
    };
    const expected = { type: 'market_feed', product_id: 2 };
    const canonical = canonicalizeMobileInner(inner);

    expect(encode(canonical)).toEqual(encode(expected));
    expect(getMobilePayloadHash(canonical)).toBe(keccak256(encode(expected)));
    expect(JSON.parse(JSON.stringify(inner))).toEqual(expected);

    // JSON omits undefined, but the default MessagePack encoder retains the key with a nil value.
    const withNull = { ...inner, limit: null };
    expect(encode(inner)).toEqual(encode(withNull));
    expect(getMobilePayloadHash(canonical)).not.toBe(
      keccak256(encode(withNull)),
    );
  });

  it('omits absent options, preserves explicit zero/empty arrays, and canonicalizes UUIDs only', () => {
    expect(
      canonicalizeMobileInner({
        type: 'market_feed',
        product_id: 2,
        limit: undefined,
      }),
    ).toEqual({ type: 'market_feed', product_id: 2 });
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

const row: MobileServerSocialTradeRow = {
  id: itemId,
  kind: 'trade_row',
  action: 'increased',
  has_analysis: false,
  drawing: null,
  author: {
    subaccount: subaccountToHex(auth),
    username: null,
    display_name: null,
    avatar_url: null,
    is_following: null,
    trader_badge: null,
    trader_data_status: 'unavailable',
  },
  created_at_ms: 40,
  display_at_ms: 42,
  version: '9007199254740993',
  market: {
    product_id: 2,
    symbol: 'BTC-PERP',
    logo_url: null,
    category: 'crypto',
    source_categories: ['crypto'],
  },
  capabilities: { can_like: false, can_comment: false, can_record_view: false },
  position_id: positionId,
  direction: 'long',
  margin_mode: 'cross',
  leverage: { value: null, basis: 'not_applicable' },
  leverage_at_ms: null,
  trade_count: 1,
  quantity_x18: '123456789012345678901234567890',
  notional_x18: '123456789012345678901234567890000',
  average_price_x18: '2500123456789012345678',
};
const readSession: MobileServerFeedReadSession = {
  session_id: 'OpaqueSession',
  mode: 'feed',
  expires_at_ms: 42,
  view_tracking: { min_visible_ratio: 0.5, min_duration_ms: 1000 },
  update_cursor: null,
  viewer_token: 'OpaqueViewer',
};
const emptyPage: MobileServerTopTradersFeedPage = {
  read_session: readSession,
  items: [],
  next_cursor: null,
  watermark: 'Watermark',
  ranking_version: 'chronological-v1',
  cohort: {
    snapshot_id: 'Cohort',
    status: 'ready',
    coverage: {
      scope: 'eligible_content_candidates',
      total_authors: 0,
      queried_authors: 0,
      complete: true,
    },
  },
};
const emptyUpdates: MobileServerFeedUpdatesResponse = {
  item_patches: [],
  position_patches: [],
  unavailable_targets: [],
  new_items_count: 0,
  update_cursor: 'Update',
  reset: true,
  viewport_revision: 0,
  request_seq: 1,
  as_of_ms: 42,
};

function mockClient(data?: unknown, status = 200) {
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
      data: data ?? {
        status: 'success',
        ...(requests[requests.length - 1].body.type === 'feed_updates'
          ? emptyUpdates
          : requests[requests.length - 1].body.type === 'feed_item'
            ? { item: row, read_session: readSession }
            : emptyPage),
      },
      status,
      statusText: 'mock',
      headers: {},
      config,
    });
  };
  return { client, requests };
}

describe('[mobile-client]: social feed transport', () => {
  it('routes all eight public reads without signing, even with owner and linked wallets', async () => {
    const { client, requests } = mockClient();
    client.setLinkedSigner(
      createWalletClient({ account: linked, chain: ink, transport: http() }),
    );
    const viewAs = {
      subaccountOwner: linked.address,
      subaccountName: 'default',
    };
    await client.getForYouFeed({
      minimumNotional: 500,
      viewAs,
      viewerToken: 'OpaqueViewer',
    });
    await client.getTopTradersFeed({ viewAs });
    await client.getFriendsFeed({ viewAs });
    await client.getProfileFeed({ subaccount: auth, viewAs });
    await client.getMarketFeed({ productId: 2, viewAs });
    await client.getPositionFeed({
      positionId: positionId.toUpperCase(),
      viewAs,
    });
    await client.getFeedItem({
      itemId: itemId.toUpperCase(),
      commentPreviewLimit: 0,
      viewAs,
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
      'friends_feed',
      'profile_feed',
      'market_feed',
      'position_feed',
      'feed_item',
      'feed_updates',
    ]);
    for (const { url, body } of requests) {
      expect(url).toBe('https://mobile.example/v1/mobile/public_query');
      expect(body).not.toHaveProperty('signature');
      expect(body).not.toHaveProperty('sender');
      expect(body).not.toHaveProperty('nonce');
      if (body.type === 'feed_updates') {
        expect(body).not.toHaveProperty('view_as');
      } else {
        expect(body.view_as).toBe(subaccountToHex(viewAs));
      }
    }
    expect(requests[0].body).toEqual({
      type: 'for_you_feed',
      minimum_notional: 500,
      view_as: subaccountToHex(viewAs),
      viewer_token: 'OpaqueViewer',
    });
    expect(requests[3].body.subaccount).toBe(subaccountToHex(auth));
    expect(requests[3].body.subaccount).not.toBe(requests[3].body.view_as);
    expect(requests[5].body.position_id).toBe(positionId);
    expect(requests[6].body.item_id).toBe(itemId);
    expect(requests[6].body.comment_preview_limit).toBe(0);
    expect(requests[7].body).toEqual({
      type: 'feed_updates',
      session_id: 'session',
      visible_item_ids: [],
      visible_position_ids: [],
      viewport_revision: 0,
      request_seq: 0,
      viewer_token: 'OpaqueViewer',
    });
  });

  it('browses without a wallet and never infers viewAs from the profile target', async () => {
    const { client, requests } = mockClient({
      status: 'success',
      ...emptyPage,
    });
    client.opts.walletClient = undefined;
    await client.getForYouFeed();
    await client.getTopTradersFeed();
    const friends = await client.getFriendsFeed({ viewAs: auth });
    await client.getProfileFeed({ subaccount: auth });
    expect(friends.items).toEqual([]);
    expect(requests[0].body).toEqual({ type: 'for_you_feed' });
    expect(requests[1].body).toEqual({ type: 'top_traders_feed' });
    expect(requests[2].body).toEqual({
      type: 'friends_feed',
      view_as: subaccountToHex(auth),
    });
    expect(requests[3].body).toEqual({
      type: 'profile_feed',
      subaccount: subaccountToHex(auth),
    });
  });

  it('routes only the five retained signed reads through query with the linked signer', async () => {
    const { client, requests } = mockClient();
    client.setLinkedSigner(
      createWalletClient({ account: linked, chain: ink, transport: http() }),
    );
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
    expect(requests).toHaveLength(5);
    for (const { url, body } of requests) {
      expect(url).toBe('https://mobile.example/v1/mobile/query');
      expect(body.sender).toBe(subaccountToHex(auth));
      expect(body).not.toHaveProperty('viewer_token');
      expect(body).not.toHaveProperty('view_as');
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

  it('rejects signing main feeds at the type and runtime boundaries before HTTP', async () => {
    const { client, requests } = mockClient();
    // @ts-expect-error Main feeds no longer accept a signing identity.
    await expect(client.getForYouFeed({ auth })).rejects.toThrow(
      'only support public queries',
    );
    // @ts-expect-error Top Traders is also public-only.
    await expect(client.getTopTradersFeed({ auth })).rejects.toThrow(
      'only support public queries',
    );
    // @ts-expect-error Friends selects a public perspective instead of authenticating it.
    await expect(client.getFriendsFeed({ auth, viewAs: auth })).rejects.toThrow(
      'cannot include viewAs',
    );
    // @ts-expect-error Friends always requires viewAs, including pagination.
    await expect(client.getFriendsFeed({})).rejects.toThrow('requires viewAs');
    expect(requests).toHaveLength(0);
  });

  it('rejects mixed contexts and missing update credentials, and only requires a wallet for Q', async () => {
    const { client, requests } = mockClient();
    await expect(
      // @ts-expect-error A signed read cannot carry a public credential.
      client.getMarketFeed({ productId: 2, auth, viewerToken: 'forbidden' }),
    ).rejects.toThrow('cannot include viewerToken');
    await expect(
      // @ts-expect-error Signed reads select their perspective from the verified sender.
      client.getProfileFeed({ subaccount: auth, auth, viewAs: auth }),
    ).rejects.toThrow('cannot include viewAs');
    const update = {
      sessionId: 's',
      visibleItemIds: [],
      visiblePositionIds: [],
      viewportRevision: 0,
      requestSeq: 0,
    };
    // @ts-expect-error Public updates require the original browser credential.
    await expect(client.getFeedUpdates(update)).rejects.toThrow(
      'require the session viewerToken',
    );
    await expect(
      // @ts-expect-error Update perspectives are inherited from the session.
      client.getFeedUpdates({ ...update, viewerToken: 'token', viewAs: auth }),
    ).rejects.toThrow('inherit viewAs');
    client.opts.walletClient = undefined;
    await expect(
      client.getMarketFeed({ auth, productId: 2 }),
    ).rejects.toBeInstanceOf(WalletNotProvidedError);
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
      viewAs: auth,
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
    expect(requests[0].body.view_as).toBe(subaccountToHex(auth));
  });

  it('preserves typed HTTP failures and rejects non-envelope framework errors', async () => {
    const { client } = mockClient(
      {
        status: 'failure',
        error: 'expired',
        error_code: MOBILE_ERROR_CODES.SOCIAL_FEED_SESSION_EXPIRED,
        request_type: 'public_query_friends_feed',
      },
      410,
    );
    await expect(client.getFriendsFeed({ viewAs: auth })).rejects.toMatchObject(
      {
        errorCode: 6312,
        requestType: 'public_query_friends_feed',
        httpStatus: 410,
      },
    );
    await expect(
      client.getFriendsFeed({ viewAs: auth }),
    ).rejects.toBeInstanceOf(MobileServerFailureError);
    await expect(
      mockClient('invalid JSON', 422).client.getForYouFeed(),
    ).rejects.toThrow('Unexpected response');
    await expect(
      mockClient({ items: [] }).client.getForYouFeed(),
    ).rejects.toThrow('missing success envelope');
  });
});

describe('[mobile-client]: social feed response mapping', () => {
  it.each([true, false, null])(
    'preserves follow state %s and unavailable likes',
    (isFollowing) => {
      const author = mapMobileFeedAuthor({
        ...row.author,
        is_following: isFollowing,
      });
      const interaction = mapMobileFeedInteraction({
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        liked_by_me: null,
      });
      expect(author.isFollowing).toBe(isFollowing);
      expect(interaction.likedByMe).toBeNull();
    },
  );
  it('preserves precision, signed zero, nullable liquidation facts, and omitted patch fields', () => {
    const patch: MobileServerFeedItemPatch = {
      item_id: itemId,
      version: '9007199254740993',
      quantity_x18: '123456789012345678901234567890',
      notional_x18: null,
      average_price_x18: '0',
      realized_pnl_delta_x18: '-1000000000000000001',
    };
    const mapped = mapMobileFeedItemPatch(patch);
    expect(mapped.quantity?.toFixed()).toBe(patch.quantity_x18);
    expect(mapped.realizedPnlDelta?.toFixed()).toBe('-1000000000000000001');
    expect(mapped.averagePrice?.isZero()).toBe(true);
    expect(mapped.notional).toBeNull();
    expect(mapped.version).toBe('9007199254740993');
    expect(mapped).not.toHaveProperty('entryPrice');
    expect(patch).toHaveProperty('quantity_x18');
  });

  it('converts every row price to decimal units while retaining x18 amounts', () => {
    const mapped = mapMobileSocialTradeRow(row);
    expect(mapped.quantity.toFixed()).toBe(row.quantity_x18);
    expect(mapped.notional?.toFixed()).toBe(row.notional_x18);
    expect(mapped.averagePrice?.toFixed()).toBe('2500.123456789012345678');
    expect(mapped).not.toHaveProperty('quantityX18');
    const liquidated = mapMobileSocialTradeRow({
      ...row,
      action: 'liquidated',
      notional_x18: null,
      average_price_x18: null,
      entry_price_x18: '2600000000000000000000',
      liquidation_oracle_price_x18: '2500000000000000000000',
      liquidation_execution_price_x18: null,
      realized_pnl_delta_x18: '-1000000000000000001',
    });
    expect(liquidated.action).toBe('liquidated');
    if (liquidated.action !== 'liquidated')
      throw new Error('Expected liquidation');
    expect(liquidated.entryPrice?.toFixed()).toBe('2600');
    expect(liquidated.liquidationOraclePrice?.toFixed()).toBe('2500');
    expect(liquidated.liquidationExecutionPrice).toBeNull();
    expect(liquidated.averagePrice).toBeNull();
    expect(liquidated.notional).toBeNull();
    expect(liquidated.realizedPnlDelta?.toFixed()).toBe('-1000000000000000001');
    const execution = mapMobileSocialTradeRow({
      ...row,
      action: 'liquidated',
      notional_x18: row.notional_x18,
      entry_price_x18: null,
      liquidation_oracle_price_x18: null,
      liquidation_execution_price_x18: '2499123456789012345678',
      realized_pnl_delta_x18: null,
    });
    if (execution.action !== 'liquidated')
      throw new Error('Expected liquidation');
    expect(execution.liquidationExecutionPrice?.toFixed()).toBe(
      '2499.123456789012345678',
    );
    expect(execution.liquidationOraclePrice).toBeNull();
    expect(execution.entryPrice).toBeNull();
    expect(execution.realizedPnlDelta).toBeNull();
  });

  it('maps price patches independently and distinguishes omission from explicit null', () => {
    const patch = mapMobileFeedItemPatch({
      item_id: itemId,
      version: '2',
      entry_price_x18: '2600000000000000000000',
      average_price_x18: '2500123456789012345678',
      liquidation_oracle_price_x18: null,
      liquidation_execution_price_x18: '2499000000000000000000',
      leverage_at_ms: null,
    });
    expect(patch.entryPrice?.toFixed()).toBe('2600');
    expect(patch.averagePrice?.toFixed()).toBe('2500.123456789012345678');
    expect(patch.liquidationOraclePrice).toBeNull();
    expect(patch.liquidationExecutionPrice?.toFixed()).toBe('2499');
    expect(patch.leverageAtMs).toBeNull();
    expect(patch).not.toHaveProperty('notional');
    expect(patch).not.toHaveProperty('realizedPnlDelta');
    expect(patch).not.toHaveProperty('interaction');
  });

  it('reports invalid credentials with the operation in a dedicated error', async () => {
    const { client, requests } = mockClient();
    // @ts-expect-error Exercise the runtime boundary used by JavaScript callers.
    await expect(client.getFriendsFeed({})).rejects.toBeInstanceOf(
      InvalidMobileFeedReadAccessError,
    );
    // @ts-expect-error Exercise the runtime boundary used by JavaScript callers.
    await expect(client.getFriendsFeed({})).rejects.toMatchObject({
      requestType: 'friends_feed',
    });
    expect(requests).toHaveLength(0);
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
    const card: MobileServerSocialTradeCard = {
      ...row,
      kind: 'trade_card',
      action: 'opened',
      text: '',
      mentions: [],
      author: {
        ...row.author,
        trader_badge: {
          code: 'shark',
          pnl_x18: '12345678901234567890123',
          metric_key: 'account_pnl_30d_equity',
          window: '30d',
          source_as_of_ms: 40,
          fetched_at_ms: 42,
          snapshot_id: 'Cohort',
        },
        trader_data_status: 'ready',
      },
      position: {
        ...response.position_patches[0],
        product_id: 2,
        market: row.market,
        direction: 'long',
        entry_price_x18: '2500123456789012345678',
        pnl: {
          ...response.position_patches[0].pnl,
          amount_x18: '-1000000000000000001',
          quality: 'ready',
        },
      },
      interaction: {
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        liked_by_me: null,
      },
      comment_preview: { items: [], total_count: 0, next_cursor: null },
    };
    const mappedCard = mapMobileSocialTradeCard(card);
    expect(mappedCard.position.entryPrice?.toFixed()).toBe(
      '2500.123456789012345678',
    );
    expect(mappedCard.position.notional.toFixed()).toBe('2000000000000000000');
    expect(mappedCard.position.pnl.amount?.toFixed()).toBe(
      '-1000000000000000001',
    );
    expect(mappedCard.author.traderBadge?.pnl.toFixed()).toBe(
      '12345678901234567890123',
    );
    const mapped = mapMobileFeedUpdates(response);
    expect(mapped.positionPatches[0].quantity.toFixed()).toBe(
      '1000000000000000000',
    );
    expect(mapped.positionPatches[0].pnl.amount).toBeNull();
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
