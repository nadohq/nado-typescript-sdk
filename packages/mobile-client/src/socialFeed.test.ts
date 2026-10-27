import { describe, expect, it } from '@jest/globals';
import { Subaccount, subaccountToHex } from '@nadohq/shared';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import {
  mapMobileSocialFeedAuthor,
  mapMobileSocialFeedInteraction,
  mapMobileSocialFeedItemPatch,
  mapMobileSocialFeedTopTradersPage,
  mapMobileSocialFeedTradeCard,
  mapMobileSocialFeedTradeRow,
  mapMobileSocialFeedUpdates,
} from './dataMappers';
import { MobileClient } from './MobileClient';
import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileServerSocialFeedItemPatch,
  MobileServerSocialFeedReadSession,
  MobileServerSocialFeedTopTradersResponse,
  MobileServerSocialFeedTradeCard,
  MobileServerSocialFeedTradeRow,
  MobileServerSocialFeedUpdatesResponse,
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
const subaccount: Subaccount = {
  subaccountOwner: owner.address,
  subaccountName: 'default',
};

const row: MobileServerSocialFeedTradeRow = {
  id: itemId,
  kind: 'trade_row',
  action: 'increased',
  has_analysis: false,
  drawing: null,
  author: {
    subaccount: subaccountToHex(subaccount),
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
const readSession: MobileServerSocialFeedReadSession = {
  session_id: 'OpaqueSession',
  mode: 'feed',
  expires_at_ms: 42,
  view_tracking: { mode: 'detail_visit' },
  update_cursor: null,
  viewer_token: 'OpaqueViewer',
};
const emptyPage: MobileServerSocialFeedTopTradersResponse = {
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
const emptyUpdates: MobileServerSocialFeedUpdatesResponse = {
  item_patches: [],
  position_patches: [],
  unavailable_targets: [],
  new_items_count: 0,
  update_cursor: 'Update',
  reset: true,
  viewport_revision: 0,
  request_seq: 1,
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
  it.each(['none', 'owner', 'linked'] as const)(
    'routes all eight reads publicly with %s wallet configuration',
    async (walletMode) => {
      const { client, requests } = mockClient();
      if (walletMode === 'none') client.opts.walletClient = undefined;
      if (walletMode === 'linked') {
        client.setLinkedSigner(
          createWalletClient({
            account: linked,
            chain: ink,
            transport: http(),
          }),
        );
      }
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
      await client.getProfileFeed({ subaccount, viewAs });
      await client.getMarketFeed({ productId: 2, viewAs });
      await client.getPositionFeed({
        positionId: positionId.toUpperCase(),
        viewAs,
      });
      await client.getFeedItem({
        itemId: itemId.toUpperCase(),
        viewEventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
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
      expect(requests[3].body.subaccount).toBe(subaccountToHex(subaccount));
      expect(requests[3].body.subaccount).not.toBe(requests[3].body.view_as);
      expect(requests[5].body.position_id).toBe(positionId.toUpperCase());
      expect(requests[6].body.item_id).toBe(itemId.toUpperCase());
      expect(requests[6].body.view_event_id).toBe(
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      );
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
    },
  );

  it('reports detail visits with the registered view event over public_execute', async () => {
    const { client, requests } = mockClient({
      status: 'success',
      accepted_item_ids: [itemId],
      duplicate_item_ids: [],
    });
    client.opts.walletClient = undefined;
    const result = await client.recordFeedViews({
      sessionId: 'OpaqueSession',
      viewerToken: 'OpaqueViewer',
      viewEventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      itemId,
    });
    expect(result).toEqual({
      acceptedItemIds: [itemId],
      duplicateItemIds: [],
    });
    expect(requests).toEqual([
      {
        url: 'https://mobile.example/v1/mobile/public_execute',
        body: {
          type: 'record_feed_views',
          session_id: 'OpaqueSession',
          viewer_token: 'OpaqueViewer',
          view_event_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          item_ids: [itemId],
        },
      },
    ]);
  });

  it('preserves update IDs, session credentials, and cursors unchanged', async () => {
    const { client, requests } = mockClient();
    client.opts.walletClient = undefined;
    await client.getFeedUpdates({
      sessionId: 'OpaqueSession',
      viewerToken: 'OpaqueViewer',
      updateCursor: 'OpaqueCursor',
      visibleItemIds: [itemId.toUpperCase()],
      visiblePositionIds: [positionId.toUpperCase()],
      viewportRevision: 0,
      requestSeq: 0,
    });
    expect(requests[0].body).toEqual({
      type: 'feed_updates',
      session_id: 'OpaqueSession',
      viewer_token: 'OpaqueViewer',
      update_cursor: 'OpaqueCursor',
      visible_item_ids: [itemId.toUpperCase()],
      visible_position_ids: [positionId.toUpperCase()],
      viewport_revision: 0,
      request_seq: 0,
    });
  });

  it('passes a nullable read-session baseline directly to updates', async () => {
    const { client, requests } = mockClient();
    const page = await client.getForYouFeed();
    await client.getFeedUpdates({
      sessionId: page.readSession.sessionId,
      viewerToken: page.readSession.viewerToken,
      updateCursor: page.readSession.updateCursor,
      visibleItemIds: [],
      visiblePositionIds: [],
      viewportRevision: 0,
      requestSeq: 1,
    });
    expect(requests[1].body.update_cursor).toBeNull();
    expect(requests[1].body.viewer_token).toBe('OpaqueViewer');
  });

  it('browses without a wallet and never infers viewAs from the profile target', async () => {
    const { client, requests } = mockClient({
      status: 'success',
      ...emptyPage,
    });
    client.opts.walletClient = undefined;
    await client.getForYouFeed();
    await client.getTopTradersFeed();
    const friends = await client.getFriendsFeed({ viewAs: subaccount });
    await client.getProfileFeed({ subaccount });
    expect(friends.items).toEqual([]);
    expect(requests[0].body).toEqual({ type: 'for_you_feed' });
    expect(requests[1].body).toEqual({ type: 'top_traders_feed' });
    expect(requests[2].body).toEqual({
      type: 'friends_feed',
      view_as: subaccountToHex(subaccount),
    });
    expect(requests[3].body).toEqual({
      type: 'profile_feed',
      subaccount: subaccountToHex(subaccount),
    });
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
        view_tracking: { mode: 'detail_visit' },
        update_cursor: null,
        viewer_token: 'Viewer',
      },
    });
    const page = await client.getForYouFeed({
      viewAs: subaccount,
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
    expect(requests[0].body.view_as).toBe(subaccountToHex(subaccount));
  });

  it.each([
    [
      400,
      MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS,
      'public_query_friends_feed',
    ],
    [
      400,
      MOBILE_ERROR_CODES.SOCIAL_FEED_SESSION_MISMATCH,
      'public_query_feed_updates',
    ],
    [410, MOBILE_ERROR_CODES.SOCIAL_FEED_QUERY_REMOVED, 'query_for_you_feed'],
  ])(
    'preserves HTTP %s and feed error %s without automatic retries',
    async (httpStatus, errorCode, requestType) => {
      const { client, requests } = mockClient(
        {
          status: 'failure',
          error: 'Rejected feed request',
          error_code: errorCode,
          request_type: requestType,
        },
        httpStatus,
      );
      await expect(client.getForYouFeed()).rejects.toMatchObject({
        name: 'MobileServerFailureError',
        httpStatus,
        errorCode,
        requestType,
      });
      expect(requests).toHaveLength(1);
    },
  );

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
    await expect(
      client.getFriendsFeed({ viewAs: subaccount }),
    ).rejects.toMatchObject({
      errorCode: 6312,
      requestType: 'public_query_friends_feed',
      httpStatus: 410,
    });
    await expect(
      client.getFriendsFeed({ viewAs: subaccount }),
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
  it('preserves nullable Top Traders badges and maps available badges without losing page metadata', () => {
    const server: MobileServerSocialFeedTopTradersResponse = {
      ...emptyPage,
      next_cursor: 'NextCursor',
      items: [
        row,
        {
          ...row,
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          author: {
            ...row.author,
            trader_data_status: 'ready',
            trader_badge: {
              code: 'shark',
              pnl_x18: '12345678901234567890123',
              metric_key: 'account_pnl_30d_equity',
              window: '30d',
              source_as_of_ms: 40,
              fetched_at_ms: 42,
              snapshot_id: 'Cohort',
            },
          },
        },
      ],
    };
    const page = mapMobileSocialFeedTopTradersPage(server);

    expect(page.items.map((item) => item.id)).toEqual(
      server.items.map((item) => item.id),
    );
    expect(page.items[0].author.traderBadge).toBeNull();
    expect(page.items[0].author.traderDataStatus).toBe('unavailable');
    expect(page.items[1].author.traderDataStatus).toBe('ready');
    expect(page.items[1].author.traderBadge?.pnl.toFixed()).toBe(
      '12345678901234567890123',
    );
    expect(page.items[1].author.traderBadge?.snapshotId).toBe('Cohort');
    expect(page.nextCursor).toBe('NextCursor');
    expect(page.watermark).toBe('Watermark');
    expect(page.rankingVersion).toBe('chronological-v1');
    expect(page.readSession.sessionId).toBe(readSession.session_id);
    expect(page.cohort).toEqual({
      snapshotId: 'Cohort',
      status: 'ready',
      coverage: {
        scope: 'eligible_content_candidates',
        totalAuthors: 0,
        queriedAuthors: 0,
        complete: true,
      },
    });
  });

  it.each([true, false, null])(
    'preserves follow state %s and unavailable likes',
    (isFollowing) => {
      const author = mapMobileSocialFeedAuthor({
        ...row.author,
        is_following: isFollowing,
      });
      const interaction = mapMobileSocialFeedInteraction({
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
    const patch: MobileServerSocialFeedItemPatch = {
      author: row.author,
      display_at_ms: 42,
      item_id: itemId,
      version: '9007199254740993',
      quantity_x18: '123456789012345678901234567890',
      notional_x18: null,
      average_price_x18: '0',
      realized_pnl_delta_x18: '-1000000000000000001',
    };
    const mapped = mapMobileSocialFeedItemPatch(patch);
    expect(mapped.quantity?.toFixed()).toBe(patch.quantity_x18);
    expect(mapped.realizedPnlDelta?.toFixed()).toBe('-1000000000000000001');
    expect(mapped.averagePrice?.isZero()).toBe(true);
    expect(mapped.notional).toBeNull();
    expect(mapped.version).toBe('9007199254740993');
    expect(mapped).not.toHaveProperty('entryPrice');
    expect(patch).toHaveProperty('quantity_x18');
  });

  it('converts every row price to decimal units while retaining x18 amounts', () => {
    const mapped = mapMobileSocialFeedTradeRow(row);
    expect(mapped.quantity.toFixed()).toBe(row.quantity_x18);
    expect(mapped.notional?.toFixed()).toBe(row.notional_x18);
    expect(mapped.averagePrice?.toFixed()).toBe('2500.123456789012345678');
    expect(mapped).not.toHaveProperty('quantityX18');
    const liquidated = mapMobileSocialFeedTradeRow({
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
    const execution = mapMobileSocialFeedTradeRow({
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
    const patch = mapMobileSocialFeedItemPatch({
      author: row.author,
      display_at_ms: 42,
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

  it('delivers reset author updates even when the item version is unchanged', async () => {
    const previous = mapMobileSocialFeedTradeRow(row);
    const patch: MobileServerSocialFeedItemPatch = {
      item_id: itemId,
      version: row.version,
      display_at_ms: 100,
      author: {
        ...row.author,
        username: 'renamed',
        display_name: 'Renamed Trader',
        avatar_url: 'https://example.com/avatar.png',
        is_following: true,
        trader_data_status: 'ready',
        trader_badge: {
          code: 'whale',
          pnl_x18: '123456789012345678901234',
          metric_key: 'account_pnl_30d_equity',
          window: '30d',
          source_as_of_ms: 90,
          fetched_at_ms: 95,
          snapshot_id: 'NewCohort',
        },
      },
    };
    const { client } = mockClient({
      status: 'success',
      ...emptyUpdates,
      item_patches: [patch],
    });
    const updates = await client.getFeedUpdates({
      sessionId: readSession.session_id,
      viewerToken: readSession.viewer_token,
      visibleItemIds: [previous.id],
      visiblePositionIds: [],
      viewportRevision: 0,
      requestSeq: 1,
    });
    const mapped = updates.itemPatches[0];
    expect(updates.reset).toBe(true);
    expect(mapped.version).toBe(previous.version);
    expect(previous.author.username).toBeNull();
    expect(mapped.displayAtMs).toBe(100);
    expect(mapped.author).toMatchObject({
      subaccount: row.author.subaccount,
      username: 'renamed',
      displayName: 'Renamed Trader',
      avatarUrl: 'https://example.com/avatar.png',
      isFollowing: true,
      traderDataStatus: 'ready',
      traderBadge: { code: 'whale', snapshotId: 'NewCohort' },
    });
    expect(mapped.author.traderBadge?.pnl.toFixed()).toBe(
      '123456789012345678901234',
    );
    expect(mapped).not.toHaveProperty('quantity');

    const cleared = mapMobileSocialFeedItemPatch({
      ...patch,
      author: row.author,
    });
    expect(cleared.author).toMatchObject({
      username: null,
      displayName: null,
      avatarUrl: null,
      isFollowing: null,
      traderBadge: null,
      traderDataStatus: 'unavailable',
    });
  });

  it('maps nested position PnL and revocations without losing sequence or baseline', () => {
    const response: MobileServerSocialFeedUpdatesResponse = {
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
    };
    const card: MobileServerSocialFeedTradeCard = {
      ...row,
      kind: 'trade_card',
      action: 'opened',
      images: [],
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
    const mappedCard = mapMobileSocialFeedTradeCard(card);
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
    const mapped = mapMobileSocialFeedUpdates(response);
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
