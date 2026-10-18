import { describe, expect, it } from '@jest/globals';
import {
  mapMobileSocialFeedComments,
  mapMobileSocialFeedDrawingResult,
  mapMobileSocialFeedItem,
  mapMobileSocialFeedItemPatch,
  mapMobileSocialFeedMentionToServer,
  mapMobileSocialFeedPositionAction,
  mapMobileSocialFeedPositionChart,
  mapMobileSocialFeedPositionHistory,
  mapMobileSocialFeedPositionPatch,
  mapMobileSocialFeedPresence,
} from './dataMappers';
import {
  MobileServerSocialFeedPost,
  MobileServerSocialFeedReply,
} from './types/serverModelTypes';
import { MobileServerSocialFeedPositionHistoryResponse } from './types/serverQueryTypes';

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
    view_tracking: {
      min_visible_ratio: 0.5,
      min_duration_ms: 1000,
    },
  },
};

describe('[mobile-client]: content mapping', () => {
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
    const result = mapMobileSocialFeedComments({
      comments: [reply],
      next_cursor: 'NextOpaque',
      previous_cursor: 'PreviousOpaque',
      total_count: 8,
      anchor_reply_id: reply.id,
      read_session: history.read_session,
    });
    expect(result.nextCursor).toBe('NextOpaque');
    expect(result.previousCursor).toBe('PreviousOpaque');
    expect(result.anchorReplyId).toBe(reply.id);
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
