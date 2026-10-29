import { describe, expect, it } from '@jest/globals';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import {
  mapMobileSocialFeedActionCandidate,
  mapMobileSocialFeedCommentsPage,
  mapMobileSocialFeedDrawingMutationResult,
  mapMobileSocialFeedDrawingResult,
  mapMobileSocialFeedItem,
  mapMobileSocialFeedItemPatch,
  mapMobileSocialFeedItemResponse,
  mapMobileSocialFeedMentionToServer,
  mapMobileSocialFeedPage,
  mapMobileSocialFeedPositionAction,
  mapMobileSocialFeedPositionChart,
  mapMobileSocialFeedPositionHistory,
  mapMobileSocialFeedPositionPatch,
  mapMobileSocialFeedPositionThoughts,
  mapMobileSocialFeedPresence,
  mapMobileSocialFeedTradeCard,
} from './dataMappers';
import { MobileClient } from './MobileClient';
import { MobileUnsupportedFeedItemError } from './types/MobileUnsupportedFeedItemError';
import {
  MobileServerSocialFeedItem,
  MobileServerSocialFeedPost,
  MobileServerSocialFeedReply,
} from './types/serverModelTypes';
import {
  MobileServerSocialFeedPositionHistoryResponse,
  MobileServerSocialFeedPositionThoughtsResponse,
} from './types/serverQueryTypes';
import { isMobileSocialFeedUploadedImage } from './utils';

const post: MobileServerSocialFeedPost = {
  id: '88888888-8888-4888-8888-888888888888',
  kind: 'post',
  has_analysis: true,
  author: {
    subaccount:
      '0x1111111111111111111111111111111111111111000000000000000000000000',
    username: 'alice',
    display_name: 'Alice',
    avatar_url: null,
    is_following: false,
    trader_badge: null,
    trader_data_status: 'unavailable',
  },
  created_at_ms: 1791072000000,
  display_at_ms: 1791072000000,
  version: '1',
  market: {
    product_id: 2,
    symbol: 'BTC-PERP',
    logo_url: null,
    category: 'crypto',
    source_categories: ['crypto'],
  },
  capabilities: {
    can_like: true,
    can_comment: true,
    can_record_view: true,
  },
  images: [],
  text: 'BTC 回踩后继续持有多仓。',
  mentions: [],
  position: {
    position_id: '22222222-2222-4222-8222-222222222222',
    product_id: 2,
    market: {
      product_id: 2,
      symbol: 'BTC-PERP',
      logo_url: null,
      category: 'crypto',
      source_categories: ['crypto'],
    },
    display_basis: 'current_position',
    direction: 'long',
    margin_mode: 'cross',
    state: 'open',
    entry_price_x18: '100000000000000000000000',
    quantity_x18: '100000000000000000',
    notional_x18: '10200000000000000000000',
    leverage: {
      value: null,
      basis: 'not_applicable',
    },
    leverage_at_ms: null,
    pnl: {
      amount_x18: '200000000000000000000',
      basis: 'unrealized_excl_fees_funding',
      mode: 'live',
      as_of_ms: 1791072060000,
      quality: 'ready',
    },
    snapshot_at_ms: null,
    state_as_of_ms: 1791072060000,
    position_version: '3',
    history_quality: 'complete',
  },
  interaction: {
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    liked_by_me: false,
  },
  comment_preview: {
    items: [],
    total_count: 0,
    next_cursor: null,
  },
  drawing: {
    data: {
      example: 'frontend-defined drawing document',
    },
    created_at_ms: 1791072000000,
    updated_at_ms: 1791072000000,
  },
};
const reply: MobileServerSocialFeedReply = {
  id: '33333333-3333-4333-8333-333333333333',
  kind: 'reply',
  has_analysis: false,
  author: {
    subaccount:
      '0x2222222222222222222222222222222222222222000000000000000000000000',
    username: 'bob',
    display_name: 'Bob',
    avatar_url: null,
    is_following: false,
    trader_badge: null,
    trader_data_status: 'unavailable',
  },
  created_at_ms: 1791072120000,
  display_at_ms: 1791072120000,
  version: '1',
  market: {
    product_id: 2,
    symbol: 'BTC-PERP',
    logo_url: null,
    category: 'crypto',
    source_categories: ['crypto'],
  },
  capabilities: {
    can_like: false,
    can_comment: true,
    can_record_view: false,
  },
  images: [],
  text: '我会继续观察支撑位。',
  mentions: [],
  root_item_id: '11111111-1111-4111-8111-111111111111',
  reply_to_author: null,
  attached_position: null,
  attachment_status: 'none',
  original: {
    id: '11111111-1111-4111-8111-111111111111',
    author: {
      subaccount:
        '0x1111111111111111111111111111111111111111000000000000000000000000',
      username: 'alice',
      display_name: 'Alice',
      avatar_url: null,
      is_following: false,
      trader_badge: null,
      trader_data_status: 'unavailable',
    },
    text_excerpt: 'BTC 回踩后继续持有多仓。',
    position: {
      position_id: '22222222-2222-4222-8222-222222222222',
      market: {
        product_id: 2,
        symbol: 'BTC-PERP',
        logo_url: null,
        category: 'crypto',
        source_categories: ['crypto'],
      },
      direction: 'long',
      state: 'open',
      notional_x18: '10200000000000000000000',
    },
    has_analysis: false,
  },
  interaction: {
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    liked_by_me: false,
  },
  drawing: null,
};
const history: MobileServerSocialFeedPositionHistoryResponse = {
  owner: post.author,
  position: {
    position_id: '22222222-2222-4222-8222-222222222222',
    product_id: 2,
    market: {
      product_id: 2,
      symbol: 'BTC-PERP',
      logo_url: null,
      category: 'crypto',
      source_categories: ['crypto'],
    },
    display_basis: 'current_position',
    direction: 'long',
    margin_mode: 'cross',
    state: 'open',
    entry_price_x18: '100000000000000000000000',
    quantity_x18: '100000000000000000',
    notional_x18: '10200000000000000000000',
    leverage: {
      value: null,
      basis: 'not_applicable',
    },
    leverage_at_ms: null,
    pnl: {
      amount_x18: '200000000000000000000',
      basis: 'unrealized_excl_fees_funding',
      mode: 'live',
      as_of_ms: 1791072060000,
      quality: 'ready',
    },
    snapshot_at_ms: null,
    state_as_of_ms: 1791072060000,
    position_version: '3',
    history_quality: 'complete',
    estimated_liquidation_price_x18: null,
    funding_pnl_x18: '0',
    liquidation_price_quality: 'unavailable',
    liquidation_price_as_of_ms: null,
    funding_quality: 'ready',
    funding_as_of_ms: 1791072060000,
  },
  summary: {
    action_count: 1,
    take_count: 1,
  },
  timeline: [
    {
      kind: 'action',
      action: {
        id: '44444444-4444-4444-8444-444444444444',
        position_id: '22222222-2222-4222-8222-222222222222',
        action: 'opened',
        direction: 'long',
        margin_mode: 'cross',
        quantity_before_x18: '0',
        quantity_after_x18: '100000000000000000',
        executed_quantity_x18: '100000000000000000',
        executed_notional_x18: '10000000000000000000000',
        average_price_x18: '100000000000000000000000',
        entry_price_before_x18: null,
        realized_pnl_delta_x18: '0',
        leverage: {
          value: null,
          basis: 'not_applicable',
        },
        leverage_at_ms: null,
        first_event_at_ms: 1791072000000,
        last_event_at_ms: 1791072000000,
        version: '1',
        liquidation_oracle_price_x18: null,
        liquidation_notional_x18: null,
      },
      related_item_id: '11111111-1111-4111-8111-111111111111',
      related_take: {
        id: '11111111-1111-4111-8111-111111111111',
        kind: 'trade_card',
        has_analysis: false,
        author: {
          subaccount:
            '0x1111111111111111111111111111111111111111000000000000000000000000',
          username: 'alice',
          display_name: 'Alice',
          avatar_url: null,
          is_following: false,
          trader_badge: null,
          trader_data_status: 'unavailable',
        },
        created_at_ms: 1791072000000,
        display_at_ms: 1791072000000,
        version: '1',
        market: {
          product_id: 2,
          symbol: 'BTC-PERP',
          logo_url: null,
          category: 'crypto',
          source_categories: ['crypto'],
        },
        capabilities: {
          can_like: true,
          can_comment: true,
          can_record_view: true,
        },
        images: [],
        text: '持有这一仓位，关注后续价格变化。',
        mentions: [],
        position: {
          position_id: '22222222-2222-4222-8222-222222222222',
          product_id: 2,
          market: {
            product_id: 2,
            symbol: 'BTC-PERP',
            logo_url: null,
            category: 'crypto',
            source_categories: ['crypto'],
          },
          display_basis: 'current_position',
          direction: 'long',
          margin_mode: 'cross',
          state: 'open',
          entry_price_x18: '100000000000000000000000',
          quantity_x18: '100000000000000000',
          notional_x18: '10200000000000000000000',
          leverage: {
            value: null,
            basis: 'not_applicable',
          },
          leverage_at_ms: null,
          pnl: {
            amount_x18: '200000000000000000000',
            basis: 'unrealized_excl_fees_funding',
            mode: 'live',
            as_of_ms: 1791072060000,
            quality: 'ready',
          },
          snapshot_at_ms: null,
          state_as_of_ms: 1791072060000,
          position_version: '3',
          history_quality: 'complete',
        },
        interaction: {
          like_count: 12,
          comment_count: 0,
          view_count: 80,
          liked_by_me: false,
        },
        comment_preview: {
          items: [],
          total_count: 0,
          next_cursor: null,
        },
        drawing: null,
        action: 'opened',
      },
    },
  ],
  next_cursor: null,
  history_quality: 'complete',
  trading_context: {
    product_id: 2,
    suggested_direction: 'long',
    viewer_position_id: '22222222-2222-4222-8222-222222222222',
    can_reduce: true,
    resolution: 'unique',
    candidates: [
      {
        position_id: '22222222-2222-4222-8222-222222222222',
        identity_subaccount:
          '0x1111111111111111111111111111111111111111000000000000000000000000',
        trading_subaccount:
          '0x1111111111111111111111111111111111111111000000000000000000000000',
        product_id: 2,
        margin_mode: 'cross',
        iso_subaccount_name: null,
        direction: 'long',
        state_as_of_ms: 1791072060000,
      },
    ],
  },
  read_session: {
    session_id: '66666666-6666-4666-8666-666666666666',
    mode: 'position',
    expires_at_ms: 1791072900000,
    update_cursor: null,
    viewer_token: 'viewer_example_opaque',
  },
};

describe('[mobile-client]: content mapping', () => {
  it('rejects unsupported feed item kinds with the typed error', () => {
    const server = {
      kind: 'future_kind',
    } as unknown as MobileServerSocialFeedItem;
    expect(() => mapMobileSocialFeedItem(server)).toThrow(
      MobileUnsupportedFeedItemError,
    );
    expect(() => mapMobileSocialFeedItem(server)).toThrow('future_kind');
  });

  it.each([
    { label: 'timeline entry', entry: { kind: 'future_kind' } },
    {
      label: 'history take',
      entry: { kind: 'take', item: { kind: 'future_kind' } },
    },
  ])(
    'rejects unsupported $label kinds before accessing their payload',
    ({ entry }) => {
      const server = {
        ...history,
        timeline: [entry],
      } as unknown as MobileServerSocialFeedPositionHistoryResponse;
      expect(() => mapMobileSocialFeedPositionHistory(server)).toThrow(
        MobileUnsupportedFeedItemError,
      );
      expect(() => mapMobileSocialFeedPositionHistory(server)).toThrow(
        'future_kind',
      );
    },
  );

  it('maps shared post and trade card fields consistently, including history takes', () => {
    const serverCard = {
      ...post,
      kind: 'trade_card',
      action: 'opened',
    } as const;
    const mappedPost = mapMobileSocialFeedItem(post);
    const mappedCard = mapMobileSocialFeedTradeCard(serverCard);
    expect(mappedCard).toEqual({
      ...mappedPost,
      kind: 'trade_card',
      action: 'opened',
    });
    const mappedHistory = mapMobileSocialFeedPositionHistory({
      ...history,
      timeline: [
        { kind: 'take', item: post },
        { kind: 'take', item: serverCard },
      ],
    });
    expect(mappedHistory.timeline).toEqual([
      { kind: 'take', item: mappedPost },
      { kind: 'take', item: mappedCard },
    ]);
  });

  it.each([
    'position_closed',
    'already_published',
    'unavailable',
    null,
  ] as const)('preserves action publication reason %s', (reason) => {
    const candidate = mapMobileSocialFeedActionCandidate({
      action_id: 'action',
      position_id: post.position.position_id,
      action: 'opened',
      can_publish: reason === null,
      unavailable_reason: reason,
    });
    expect(candidate.unavailableReason).toBe(reason);
    expect(candidate.canPublish).toBe(reason === null);
  });

  it('maps all supported item kinds without dropping items or page metadata', () => {
    const items: MobileServerSocialFeedItem[] = [
      {
        ...post,
        id: '11111111-1111-4111-8111-111111111111',
        kind: 'trade_card',
        action: 'opened',
      },
      {
        ...post,
        id: '44444444-4444-4444-8444-444444444444',
        kind: 'trade_row',
        action: 'increased',
        position_id: post.position.position_id,
        direction: 'long',
        margin_mode: 'cross',
        leverage: { value: null, basis: 'not_applicable' },
        leverage_at_ms: null,
        trade_count: 2,
        quantity_x18: '100000000000000000',
        notional_x18: '10200000000000000000000',
        average_price_x18: '102000000000000000000000',
      },
      post,
      reply,
    ];
    const page = mapMobileSocialFeedPage({
      items,
      read_session: { ...history.read_session, mode: 'feed' },
      next_cursor: 'NextCursor',
      watermark: 'Watermark',
    });

    expect(page.items.map(({ id, kind }) => ({ id, kind }))).toEqual(
      items.map(({ id, kind }) => ({ id, kind })),
    );
    expect(page.items[0]).toMatchObject({
      kind: 'trade_card',
      action: 'opened',
    });
    expect(page.items[1]).toMatchObject({ kind: 'trade_row', tradeCount: 2 });
    expect(page.items[2]).toMatchObject({ kind: 'post', text: post.text });
    expect(page.items[3]).toMatchObject({
      kind: 'reply',
      rootItemId: reply.root_item_id,
    });
    expect(page.nextCursor).toBe('NextCursor');
    expect(page.watermark).toBe('Watermark');
    expect(page.readSession).toMatchObject({
      mode: 'feed',
      sessionId: history.read_session.session_id,
      viewerToken: history.read_session.viewer_token,
    });
  });

  it('maps empty image arrays in feeds, item details, and comments', () => {
    const serverReply = { ...reply };
    const serverPost = {
      ...post,
      comment_preview: {
        ...post.comment_preview,
        items: [serverReply],
      },
    };
    const serverCard = {
      ...serverPost,
      kind: 'trade_card',
      action: 'opened',
    } as const;
    const items: MobileServerSocialFeedItem[] = [
      serverPost,
      serverCard,
      serverReply,
    ];
    const page = mapMobileSocialFeedPage({
      items,
      next_cursor: null,
      watermark: 'Watermark',
      read_session: history.read_session,
    });
    expect(page.items).toMatchObject([
      {
        kind: 'post',
        images: [],
        commentPreview: { items: [{ images: [] }] },
      },
      {
        kind: 'trade_card',
        images: [],
        commentPreview: { items: [{ images: [] }] },
      },
      { kind: 'reply', images: [] },
    ]);
    for (const item of items) {
      expect(
        mapMobileSocialFeedItemResponse({
          item,
          read_session: history.read_session,
        }).item,
      ).toMatchObject({ kind: item.kind, images: [] });
    }
    const comments = mapMobileSocialFeedCommentsPage({
      comments: [{ ...serverReply, replies: [] }],
      total_count: 1,
      top_level_count: 1,
      next_cursor: null,
      previous_cursor: null,
      anchor_reply_id: null,
      read_session: history.read_session,
    });
    expect(comments.comments).toMatchObject([{ kind: 'reply', images: [] }]);
  });

  it('maps feed images and read sessions without obsolete view tracking', () => {
    const mapped = mapMobileSocialFeedItem({
      ...post,
      images: [
        {
          image_id: '88888888-8888-4888-8888-888888888888',
          url: '/v1/mobile/feed/images/88888888-8888-4888-8888-888888888888/standard',
          width: 1024,
          height: 256,
          content_type: 'image/png',
          byte_size: 123456,
          thumbnail: {
            url: '/v1/mobile/feed/images/88888888-8888-4888-8888-888888888888/thumbnail',
            width: 512,
            height: 128,
          },
        },
      ],
    });
    expect(mapped.kind).toBe('post');
    if (mapped.kind !== 'post') throw new Error('Expected post');
    expect(mapped.images).toEqual([
      {
        imageId: '88888888-8888-4888-8888-888888888888',
        url: '/v1/mobile/feed/images/88888888-8888-4888-8888-888888888888/standard',
        width: 1024,
        height: 256,
        contentType: 'image/png',
        byteSize: 123456,
        thumbnail: {
          url: '/v1/mobile/feed/images/88888888-8888-4888-8888-888888888888/thumbnail',
          width: 512,
          height: 128,
        },
      },
    ]);
    expect(
      mapMobileSocialFeedPage({
        items: [],
        next_cursor: null,
        watermark: 'w',
        read_session: history.read_session,
      }).readSession,
    ).toEqual({
      sessionId: history.read_session.session_id,
      mode: history.read_session.mode,
      expiresAtMs: history.read_session.expires_at_ms,
      updateCursor: history.read_session.update_cursor,
      viewerToken: history.read_session.viewer_token,
    });
  });

  it('maps posts, drawings, reply previews, and nullable badges from the documented response', () => {
    const mapped = mapMobileSocialFeedItem({
      ...post,
      comment_preview: { items: [reply], total_count: 1, next_cursor: null },
    });
    expect(mapped.kind).toBe('post');
    if (mapped.kind !== 'post') throw new Error('Expected post');
    expect(mapped.text).toBe(post.text);
    expect(mapped.drawing?.data).toEqual(post.drawing?.data);
    expect(mapped.author.traderBadge).toBeNull();
    expect(mapped.position.quantity.toFixed()).toBe(post.position.quantity_x18);
    expect(mapped.position.notional.toFixed()).toBe(post.position.notional_x18);
    expect(mapped.commentPreview.items[0].kind).toBe('reply');
    expect(mapped.commentPreview.items[0].rootItemId).toBe(reply.root_item_id);
    expect(
      mapped.commentPreview.items[0].original.author.traderBadge,
    ).toBeNull();
    expect(mapped.commentPreview.items[0].attachedPosition).toBeNull();
    expect(mapped.commentPreview.items[0].attachmentStatus).toBe('none');
    expect(mapped.commentPreview.items[0]).not.toHaveProperty('replyToItemId');
  });

  it.each([false, 0, { lines: [] }])(
    'preserves valid drawing data %p rather than treating it as missing',
    (data) => {
      const result = mapMobileSocialFeedDrawingResult({
        item_id: post.id,
        item_version: '9',
        drawing: { data, created_at_ms: 10, updated_at_ms: 20 },
      });
      expect(result.drawing).toEqual({
        data,
        createdAtMs: 10,
        updatedAtMs: 20,
      });
    },
  );

  it.each([false, 0, null, { lines: [] }])(
    'maps saved drawing mutations with non-null drawings and data %p',
    (data) => {
      const result = mapMobileSocialFeedDrawingMutationResult({
        item_id: post.id,
        item_version: '9',
        drawing: { data, created_at_ms: 10, updated_at_ms: 20 },
      });
      expect(result.itemId).toBe(post.id);
      expect(result.itemVersion).toBe('9');
      expect(result.drawing.data).toEqual(data);
      expect(result.drawing).toEqual({
        data,
        createdAtMs: 10,
        updatedAtMs: 20,
      });
    },
  );

  it('distinguishes missing drawings and explicit attachment clearing from omitted patches', () => {
    expect(
      mapMobileSocialFeedDrawingResult({
        item_id: post.id,
        item_version: '1',
        drawing: null,
      }).drawing,
    ).toBeNull();
    const patch = {
      item_id: reply.id,
      version: '2',
      author: reply.author,
      display_at_ms: 22,
    };
    expect(mapMobileSocialFeedItemPatch(patch)).not.toHaveProperty(
      'attachedPosition',
    );
    expect(
      mapMobileSocialFeedItemPatch({
        ...patch,
        attached_position: null,
        attachment_status: 'unavailable',
      }),
    ).toMatchObject({
      attachedPosition: null,
      attachmentStatus: 'unavailable',
    });
    const attached = mapMobileSocialFeedItemPatch({
      ...patch,
      attached_position: post.position,
      attachment_status: 'visible',
    });
    expect(attached.attachedPosition?.positionId).toBe(
      post.position.position_id,
    );
    expect(attached.attachedPosition?.quantity.toFixed()).toBe(
      post.position.quantity_x18,
    );
  });

  it('maps a position session, related takes, history metrics, and trading targets', () => {
    const mapped = mapMobileSocialFeedPositionHistory(history);
    expect(mapped.readSession.mode).toBe('position');
    expect(mapped.readSession.viewerToken).toBe(
      history.read_session.viewer_token,
    );
    expect(mapped.summary).toEqual({
      actionCount: history.summary.action_count,
      takeCount: history.summary.take_count,
    });
    expect(mapped.tradingContext.viewerPositionId).toBe(
      history.trading_context.viewer_position_id,
    );
    expect(mapped.timeline[0].kind).toBe('action');
    expect(mapped.position.fundingPnl?.toFixed() ?? null).toBe(
      history.position.funding_pnl_x18,
    );
    const patch = mapMobileSocialFeedPositionPatch({
      ...post.position,
      current_position: {
        estimated_liquidation_price_x18: '2500123456789012345678',
        liquidation_price_quality: 'ready',
        liquidation_price_as_of_ms: 42,
        funding_pnl_x18: '-9007199254740993000001',
        funding_quality: 'ready',
        funding_as_of_ms: 42,
      },
    });
    expect(patch.currentPosition?.estimatedLiquidationPrice?.toFixed()).toBe(
      '2500.123456789012345678',
    );
    expect(patch.currentPosition?.fundingPnl?.toFixed()).toBe(
      '-9007199254740993000001',
    );
    expect(mapMobileSocialFeedPositionPatch(post.position)).not.toHaveProperty(
      'currentPosition',
    );
  });

  it('keeps execution, Oracle, and realized PnL independently nullable and precise', () => {
    const entry = history.timeline[0];
    if (entry.kind !== 'action') throw new Error('Expected history action');
    const mapped = mapMobileSocialFeedPositionAction({
      ...entry.action,
      action: 'liquidated',
      executed_quantity_x18: '1234567890123456789012345',
      executed_notional_x18: null,
      average_price_x18: '2500123456789012345678',
      entry_price_before_x18: null,
      liquidation_oracle_price_x18: null,
      liquidation_notional_x18: null,
      realized_pnl_delta_x18: '-9007199254740993000001',
    });
    expect(mapped.executedQuantity.toFixed()).toBe('1234567890123456789012345');
    expect(mapped.executedNotional).toBeNull();
    expect(mapped.averagePrice?.toFixed()).toBe('2500.123456789012345678');
    expect(mapped.entryPriceBefore).toBeNull();
    expect(mapped.liquidationOraclePrice).toBeNull();
    expect(mapped.liquidationNotional).toBeNull();
    expect(mapped.realizedPnlDelta?.toFixed()).toBe('-9007199254740993000001');
  });

  it('converts candle prices but retains volume in x18 and markers with unknown prices', () => {
    const mapped = mapMobileSocialFeedPositionChart({
      candles: [
        {
          timestamp_ms: 42,
          open_x18: '1000000000000000000',
          high_x18: '2000000000000000000',
          low_x18: '500000000000000000',
          close_x18: '1500000000000000000',
          volume_x18: '1234567890123456789012345',
        },
      ],
      action_markers: [
        {
          action_id: post.id,
          timestamp_ms: 42,
          price_x18: null,
          action: 'liquidated',
          direction: 'long',
          price_basis: 'liquidation_oracle',
        },
      ],
      estimated_liquidation_line: null,
      next_before_ms: null,
      as_of_ms: 42,
      data_quality: 'partial',
    });
    expect(mapped.candles[0].open.toFixed()).toBe('1');
    expect(mapped.candles[0].high.toFixed()).toBe('2');
    expect(mapped.candles[0].low.toFixed()).toBe('0.5');
    expect(mapped.candles[0].close.toFixed()).toBe('1.5');
    expect(mapped.candles[0].volume.toFixed()).toBe(
      '1234567890123456789012345',
    );
    expect(mapped.actionMarkers[0].price).toBeNull();
    expect(mapped.actionMarkers[0].priceBasis).toBe('liquidation_oracle');
    expect(mapped.estimatedLiquidationLine).toBeNull();
  });

  it('maps comment cursors and anchor without inventing an observation timestamp', () => {
    const result = mapMobileSocialFeedCommentsPage({
      comments: [{ ...reply, replies: [] }],
      next_cursor: 'NextOpaque',
      previous_cursor: 'PreviousOpaque',
      total_count: 8,
      top_level_count: 3,
      anchor_reply_id: reply.id,
      read_session: history.read_session,
    });
    expect(result.nextCursor).toBe('NextOpaque');
    expect(result.previousCursor).toBe('PreviousOpaque');
    expect(result.anchorReplyId).toBe(reply.id);
    expect(result.topLevelCount).toBe(3);
    expect(result).not.toHaveProperty('asOfMs');
  });

  it('maps presence lease metadata without assuming an as_of_ms field', () => {
    const result = mapMobileSocialFeedPresence({
      watcher_count: 1,
      watcher_preview: [reply.author],
      heartbeat_interval_seconds: 15,
      expires_in_seconds: 45,
    });
    expect(result.watcherCount).toBe(1);
    expect(result.watcherPreview[0].traderBadge).toBeNull();
    expect(result.heartbeatIntervalSeconds).toBe(15);
    expect(result.expiresInSeconds).toBe(45);
    expect(result).not.toHaveProperty('asOfMs');
  });

  it('preserves complete flat comment groups, descendant parents, counts, and an anchor at any depth', () => {
    const child = {
      ...reply,
      id: '44444444-4444-4444-8444-444444444444',
      reply_to_item_id: reply.id,
      reply_to_author: reply.author,
    };
    const grandchild = {
      ...child,
      id: '55555555-5555-4555-8555-555555555555',
      reply_to_item_id: child.id,
      images: [{ url: 'https://example.com/reply.png' }],
    };
    const mapped = mapMobileSocialFeedCommentsPage({
      comments: [
        {
          ...reply,
          reply_to_item_id: undefined,
          reply_to_author: null,
          replies: [child, grandchild],
        },
        { ...reply, id: '66666666-6666-4666-8666-666666666666', replies: [] },
      ],
      total_count: 12,
      top_level_count: 5,
      next_cursor: 'NextGroup',
      previous_cursor: 'PreviousGroup',
      anchor_reply_id: grandchild.id,
      read_session: history.read_session,
    });
    expect(mapped.comments.map((group) => group.id)).toEqual([
      reply.id,
      '66666666-6666-4666-8666-666666666666',
    ]);
    expect(mapped.comments[0]).not.toHaveProperty('replyToItemId');
    expect(mapped.comments[0].replyToAuthor).toBeNull();
    expect(mapped.comments[0].replies.map((item) => item.id)).toEqual([
      child.id,
      grandchild.id,
    ]);
    expect(
      mapped.comments[0].replies.map((item) => item.replyToItemId),
    ).toEqual([reply.id, child.id]);
    expect(mapped.comments[0].replies[1].images).toEqual(grandchild.images);
    expect(mapped.comments[0].replies[1].replyToAuthor?.displayName).toBe(
      reply.author.display_name,
    );
    expect(mapped.comments[0].replies[1].interaction.viewCount).toBe(
      reply.interaction.view_count,
    );
    expect(mapped.comments[0].replies[0]).not.toHaveProperty('replies');
    expect(mapped.comments[1].replies).toEqual([]);
    expect(mapped).toMatchObject({
      totalCount: 12,
      topLevelCount: 5,
      nextCursor: 'NextGroup',
      previousCursor: 'PreviousGroup',
      anchorReplyId: grandchild.id,
    });
  });

  it('preserves an empty comment window with continuation and whole-thread counts', () => {
    const mapped = mapMobileSocialFeedCommentsPage({
      comments: [],
      total_count: 8,
      top_level_count: 3,
      next_cursor: 'NextGroup',
      previous_cursor: null,
      anchor_reply_id: null,
      read_session: history.read_session,
    });
    expect(mapped.comments).toEqual([]);
    expect(mapped).toMatchObject({
      totalCount: 8,
      topLevelCount: 3,
      nextCursor: 'NextGroup',
    });
  });

  it('keeps mention labels and code-point offsets intact', () => {
    const result = mapMobileSocialFeedMentionToServer({
      subaccount: {
        subaccountOwner: '0x1111111111111111111111111111111111111111',
        subaccountName: 'default',
      },
      start: 2,
      end: 8,
      label: '@Alice',
    });
    expect(result).toMatchObject({ start: 2, end: 8, label: '@Alice' });
    expect(result.subaccount).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('[mobile-client]: position feed changes', () => {
  it('keeps an unnamed owner even when no timeline content is available', () => {
    const mapped = mapMobileSocialFeedPositionHistory({
      ...history,
      owner: {
        ...post.author,
        username: null,
        display_name: null,
        avatar_url: null,
        is_following: null,
      },
      timeline: [],
      summary: { action_count: 0, take_count: 0 },
    });
    expect(mapped.owner).toEqual({
      subaccount: post.author.subaccount,
      username: null,
      displayName: null,
      avatarUrl: null,
      isFollowing: null,
      traderBadge: null,
      traderDataStatus: 'unavailable',
    });
    expect(mapped.timeline).toEqual([]);
    expect(mapped.summary).toEqual({ actionCount: 0, takeCount: 0 });
  });

  it('maps recent actions without manufacturing related takes or complete-history counts', () => {
    const entry = history.timeline[0];
    if (entry.kind !== 'action') throw new Error('Expected action fixture');
    const mapped = mapMobileSocialFeedPositionHistory({
      ...history,
      timeline: [{ ...entry, related_take: null }],
      next_cursor: null,
      summary: { action_count: 1, take_count: 0 },
    });
    expect(mapped.timeline[0].kind).toBe('action');
    if (mapped.timeline[0].kind !== 'action') {
      throw new Error('Expected mapped action');
    }
    expect(mapped.timeline[0].relatedTake).toBeNull();
    expect(mapped.timeline[0].relatedItemId).toBe(entry.related_item_id);
    expect(mapped.timeline[0].action.executedQuantity.toFixed()).toBe(
      entry.action.executed_quantity_x18,
    );
    expect(mapped.owner.subaccount).toBe(post.author.subaccount);
    expect(mapped.summary).toEqual({ actionCount: 1, takeCount: 0 });
    expect(mapped.nextCursor).toBeNull();
  });

  function thoughtsPage(): MobileServerSocialFeedPositionThoughtsResponse {
    return {
      items: [
        {
          ...post,
          has_analysis: true,
          drawing: { data: false, created_at_ms: 20, updated_at_ms: 40 },
        },
        {
          ...post,
          id: '77777777-7777-4777-8777-777777777777',
          kind: 'trade_card',
          action: 'opened',
          display_at_ms: post.display_at_ms + 100,
          has_analysis: true,
          drawing: {
            data: { lines: [] },
            created_at_ms: 10,
            updated_at_ms: 50,
          },
        },
      ],
      next_cursor: 'Continue',
      read_session: { ...history.read_session, mode: 'position' },
    };
  }

  it('preserves thoughts order and complete parsed drawings independently of display/update time', () => {
    const server = thoughtsPage();
    const mapped = mapMobileSocialFeedPositionThoughts(server);
    expect(mapped.items.map((item) => item.id)).toEqual(
      server.items.map((item) => item.id),
    );
    expect(mapped.items[0].drawing).toEqual({
      data: false,
      createdAtMs: 20,
      updatedAtMs: 40,
    });
    expect(mapped.items[1].drawing.data).toEqual({ lines: [] });
    expect(mapped.items[1].kind).toBe('trade_card');
    expect(mapped.items[1].position.quantity.toFixed()).toBe(
      post.position.quantity_x18,
    );
    expect(mapped.nextCursor).toBe('Continue');
    expect(mapped.readSession.mode).toBe('position');
  });

  it.each([null, 'Continue'])(
    'preserves empty thought pages with cursor %s',
    (cursor) => {
      const mapped = mapMobileSocialFeedPositionThoughts({
        ...thoughtsPage(),
        items: [],
        next_cursor: cursor,
      });
      expect(mapped.items).toEqual([]);
      expect(mapped.nextCursor).toBe(cursor);
    },
  );

  it('maps mixed uploaded/external images in posts and replies without inventing metadata', () => {
    const images = [
      {
        image_id: '66666666-6666-4666-8666-666666666666',
        url: '/v1/mobile/feed/images/test/standard',
        width: 1024,
        height: 512,
        content_type: 'image/png' as const,
        byte_size: 100,
        thumbnail: {
          url: '/v1/mobile/feed/images/test/thumbnail',
          width: 512,
          height: 256,
        },
      },
      { url: 'https://example.com/first.png' },
      { url: 'https://example.com/second.png' },
    ];
    for (const item of [post, reply]) {
      const mapped = mapMobileSocialFeedItem({ ...item, images });
      if (mapped.kind === 'trade_row')
        throw new Error('Expected authored content');
      expect(mapped.images[0]).toMatchObject({
        imageId: images[0].image_id,
        thumbnail: { width: 512 },
      });
      expect(mapped.images.slice(1)).toEqual(images.slice(1));
      expect(
        mapped.images
          .filter(isMobileSocialFeedUploadedImage)
          .map((image) => image.imageId),
      ).toEqual([images[0].image_id]);
    }
  });
});

describe('[mobile-client]: position and image transport', () => {
  function clientWithResponse(data: Record<string, unknown>) {
    const client = new MobileClient({
      url: 'https://mobile.example/v1/mobile',
    });
    const requests: Record<string, unknown>[] = [];
    client.axiosInstance.defaults.adapter = (config) => {
      requests.push(JSON.parse(String(config.data)) as Record<string, unknown>);
      expect(config.url).toBe(
        `https://mobile.example/v1/mobile/${client.opts.walletClient ? 'execute' : 'public_query'}`,
      );
      return Promise.resolve({
        data: { status: 'success', ...data },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    };
    return { client, requests };
  }

  it('routes thoughts publicly, preserving continuation credentials after an empty page', async () => {
    const { client, requests } = clientWithResponse({
      items: [],
      next_cursor: 'Next',
      read_session: history.read_session,
    });
    const first = await client.getPositionThoughts({
      positionId: post.position.position_id,
      limit: 2,
    });
    await client.getPositionThoughts({
      positionId: post.position.position_id,
      limit: 2,
      sessionId: first.readSession.sessionId,
      viewerToken: first.readSession.viewerToken,
      cursor: first.nextCursor ?? undefined,
    });
    expect(requests).toEqual([
      {
        type: 'position_thoughts',
        position_id: post.position.position_id,
        limit: 2,
      },
      {
        type: 'position_thoughts',
        position_id: post.position.position_id,
        limit: 2,
        session_id: history.read_session.session_id,
        viewer_token: history.read_session.viewer_token,
        cursor: 'Next',
      },
    ]);
  });

  it('reads grouped comments through the public API and preserves paging credentials', async () => {
    const { client, requests } = clientWithResponse({
      comments: [{ ...reply, replies: [] }],
      total_count: 12,
      top_level_count: 5,
      next_cursor: 'NextGroup',
      previous_cursor: null,
      anchor_reply_id: null,
      read_session: history.read_session,
    });
    const page = await client.getFeedComments({
      rootItemId: post.id,
      limit: 1,
    });
    expect(page.comments[0].replies).toEqual([]);
    expect(page).toMatchObject({ totalCount: 12, topLevelCount: 5 });
    await client.getFeedComments({
      rootItemId: post.id,
      limit: 1,
      cursor: page.nextCursor ?? undefined,
      sessionId: page.readSession.sessionId,
      viewerToken: page.readSession.viewerToken,
    });
    expect(requests).toEqual([
      { type: 'feed_comments', root_item_id: post.id, limit: 1 },
      {
        type: 'feed_comments',
        root_item_id: post.id,
        limit: 1,
        cursor: 'NextGroup',
        session_id: history.read_session.session_id,
        viewer_token: history.read_session.viewer_token,
      },
    ]);
  });

  it('routes recent actions publicly without pagination fields and maps the owner', async () => {
    const { client, requests } = clientWithResponse({
      ...history,
      timeline: [],
      summary: { action_count: 0, take_count: 0 },
      next_cursor: null,
    });
    const result = await client.getPositionHistoryAll({
      positionId: post.position.position_id,
      viewerToken: 'ExistingViewer',
    });
    expect(requests).toEqual([
      {
        type: 'position_history_all',
        position_id: post.position.position_id,
        viewer_token: 'ExistingViewer',
      },
    ]);
    expect(result.owner.subaccount).toBe(post.author.subaccount);
    expect(result.timeline).toEqual([]);
  });

  it.each(['post', 'comment'] as const)(
    'passes image URL arrays through signed %s publication',
    async (kind) => {
      const { client, requests } = clientWithResponse(
        kind === 'post'
          ? { item: post }
          : { comment: reply, root_comment_count: 1 },
      );
      const account = privateKeyToAccount(
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907',
      );
      client.opts.walletClient = createWalletClient({
        account,
        chain: ink,
        transport: http(),
      });
      const params = {
        subaccountOwner: account.address,
        subaccountName: 'default',
        chainId: ink.id,
        verifyingAddr: '0x0000000000000000000000000000000000000001' as const,
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        text: 'external images',
        mentions: [],
        imageIds: [],
        imageUrls: ['https://example.com/A.png', 'https://example.com/B.png'],
      };
      if (kind === 'post')
        await client.createFeedPost({
          ...params,
          positionId: post.position.position_id,
        });
      else await client.createFeedComment({ ...params, rootItemId: post.id });
      expect(requests[0]).toMatchObject({
        type: `create_feed_${kind}`,
        image_ids: [],
        image_urls: params.imageUrls,
        signature: expect.stringMatching(/^0x[0-9a-f]+$/),
      });
      expect(requests[0]).not.toHaveProperty('image_url');
    },
  );
});
