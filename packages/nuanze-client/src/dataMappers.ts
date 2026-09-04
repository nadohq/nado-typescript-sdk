import { toBigNumber } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import {
  NuanzeCandle,
  NuanzeCollateralFlow,
  NuanzeCollateralFlowPoint,
  NuanzeFollowedLeaderboardItem,
  NuanzeFundamentalsKeyData,
  NuanzeFundamentalsPerformance,
  NuanzeFundamentalsValuation,
  NuanzeFundingObservation,
  NuanzeFundingRate,
  NuanzeLatestTicker,
  NuanzeLeaderboardItem,
  NuanzeMarket,
  NuanzeMarketDetail,
  NuanzeMarketPosition,
  NuanzeMarketPositioningBase,
  NuanzeMarketTrade,
  NuanzeOpenPosition,
  NuanzePlatformDeltas,
  NuanzePositioningCellBase,
  NuanzePositioningTotals,
  NuanzeSeriesPoint,
  NuanzeStockFundamentals,
  NuanzeSubaccountLeaderboardItem,
  NuanzeWalletPosition,
  NuanzeWalletTrade,
} from './types/clientModelTypes';
import {
  GetNuanzeCollateralFlowSeriesResponse,
  GetNuanzeCollateralFlowSummaryResponse,
  GetNuanzeCollateralFlowsResponse,
  GetNuanzeFollowedLeaderboardResponse,
  GetNuanzeFundingRatesResponse,
  GetNuanzeLeaderboardResponse,
  GetNuanzeMarketByTickerResponse,
  GetNuanzeMarketCandlesResponse,
  GetNuanzeMarketPositioningResponse,
  GetNuanzeMarketPositionsResponse,
  GetNuanzeMarketTradesResponse,
  GetNuanzeMarketsResponse,
  GetNuanzeNewsResponse,
  GetNuanzeOpenPositionsResponse,
  GetNuanzePlatformSummaryResponse,
  GetNuanzeSubaccountLeaderboardResponse,
  GetNuanzeWalletPnlResponse,
  GetNuanzeWalletPnlSeriesResponse,
  GetNuanzeWalletPositionsResponse,
  GetNuanzeWalletSummaryResponse,
  GetNuanzeWalletTradesResponse,
} from './types/clientTypes';
import {
  NuanzeServerCandle,
  NuanzeServerCohortPositioningCell,
  NuanzeServerCollateralFlow,
  NuanzeServerCollateralFlowPoint,
  NuanzeServerFollowedLeaderboardItem,
  NuanzeServerFundamentalsKeyData,
  NuanzeServerFundamentalsPerformance,
  NuanzeServerFundamentalsValuation,
  NuanzeServerFundingObservation,
  NuanzeServerFundingRate,
  NuanzeServerLatestTicker,
  NuanzeServerLeaderboardItem,
  NuanzeServerMarket,
  NuanzeServerMarketDetail,
  NuanzeServerMarketPosition,
  NuanzeServerMarketPositioningBase,
  NuanzeServerMarketPositioningResponse,
  NuanzeServerMarketTrade,
  NuanzeServerNotionalBucketPositioningCell,
  NuanzeServerOpenPosition,
  NuanzeServerPlatformDeltas,
  NuanzeServerPositioningCellBase,
  NuanzeServerPositioningTotals,
  NuanzeServerSeriesPoint,
  NuanzeServerSidePositioningCell,
  NuanzeServerStockFundamentals,
  NuanzeServerSubaccountLeaderboardItem,
  NuanzeServerWalletPosition,
  NuanzeServerWalletTrade,
} from './types/serverModelTypes';
import {
  NuanzeServerCollateralFlowSeriesResponse,
  NuanzeServerCollateralFlowSummaryResponse,
  NuanzeServerCollateralFlowsResponse,
  NuanzeServerFollowedLeaderboardResponse,
  NuanzeServerFundingRatesResponse,
  NuanzeServerLeaderboardResponse,
  NuanzeServerMarketCandlesResponse,
  NuanzeServerMarketPositionsResponse,
  NuanzeServerMarketTradesResponse,
  NuanzeServerMarketsResponse,
  NuanzeServerNewsResponse,
  NuanzeServerOpenPositionsResponse,
  NuanzeServerPlatformSummaryResponse,
  NuanzeServerSubaccountLeaderboardResponse,
  NuanzeServerWalletPnlResponse,
  NuanzeServerWalletPnlSeriesResponse,
  NuanzeServerWalletPositionsResponse,
  NuanzeServerWalletSummaryResponse,
  NuanzeServerWalletTradesResponse,
} from './types/serverQueryTypes';

function mapNuanzeDecimal(value: string | null): BigNumber | null {
  return value === null ? null : toBigNumber(value);
}

/**
 * Maps a server-side latest ticker to its client-side representation, converting decimal strings to
 * `BigNumber`.
 */
export function mapNuanzeLatestTicker(
  server: NuanzeServerLatestTicker,
): NuanzeLatestTicker {
  return {
    midPrice: mapNuanzeDecimal(server.midPrice),
    bidPrice: mapNuanzeDecimal(server.bidPrice),
    askPrice: mapNuanzeDecimal(server.askPrice),
    volume24h: mapNuanzeDecimal(server.volume24h),
    openInterest: mapNuanzeDecimal(server.openInterest),
    priceChange24hPct: mapNuanzeDecimal(server.priceChange24hPct),
    updatedAt: server.updatedAt,
  };
}

/**
 * Maps a server-side market to its client-side representation. Only the decimal fields change: IDs,
 * enums, and timestamps keep their wire types.
 */
export function mapNuanzeMarket(server: NuanzeServerMarket): NuanzeMarket {
  return {
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    tradingStatus: server.tradingStatus,
    priceIncrement: toBigNumber(server.priceIncrement),
    sizeIncrement: toBigNumber(server.sizeIncrement),
    minSize: toBigNumber(server.minSize),
    latest:
      server.latest === null ? null : mapNuanzeLatestTicker(server.latest),
    skew: mapNuanzeDecimal(server.skew),
    skewUpdatedAt: server.skewUpdatedAt,
    updatedAt: server.updatedAt,
  };
}

/**
 * Maps a server-side `GET /markets` response to its client-side representation.
 */
export function mapNuanzeMarketsResponse(
  server: NuanzeServerMarketsResponse,
): GetNuanzeMarketsResponse {
  return {
    markets: server.markets.map(mapNuanzeMarket),
    count: server.count,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side `GET /news` response. Stories have no decimal fields.
 */
export function mapNuanzeNewsResponse(
  server: NuanzeServerNewsResponse,
): GetNuanzeNewsResponse {
  return {
    stories: server.stories,
    nextCursor: server.nextCursor,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side funding observation to `BigNumber` rates.
 */
export function mapNuanzeFundingObservation(
  server: NuanzeServerFundingObservation,
): NuanzeFundingObservation {
  return {
    rate: toBigNumber(server.rate),
    annualizedRate: toBigNumber(server.annualizedRate),
    observedAt: server.observedAt,
  };
}

/**
 * Maps a server-side funding rate row.
 */
export function mapNuanzeFundingRate(
  server: NuanzeServerFundingRate,
): NuanzeFundingRate {
  return {
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    ...mapNuanzeFundingObservation(server),
  };
}

/**
 * Maps a server-side `GET /funding/rates` response.
 */
export function mapNuanzeFundingRatesResponse(
  server: NuanzeServerFundingRatesResponse,
): GetNuanzeFundingRatesResponse {
  return {
    rates: server.rates.map(mapNuanzeFundingRate),
    asOf: server.asOf,
  };
}

function mapNuanzeFundamentalsKeyData(
  server: NuanzeServerFundamentalsKeyData,
): NuanzeFundamentalsKeyData {
  return {
    dividendYield: mapNuanzeDecimal(server.dividendYield),
    employees: server.employees,
    enterpriseValue: mapNuanzeDecimal(server.enterpriseValue),
    sharesOutstanding: mapNuanzeDecimal(server.sharesOutstanding),
    beta: mapNuanzeDecimal(server.beta),
    fiftyTwoWeekHigh: mapNuanzeDecimal(server.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: mapNuanzeDecimal(server.fiftyTwoWeekLow),
    volume: mapNuanzeDecimal(server.volume),
    averageVolume: mapNuanzeDecimal(server.averageVolume),
    circulatingSupply: mapNuanzeDecimal(server.circulatingSupply),
    totalSupply: mapNuanzeDecimal(server.totalSupply),
    maxSupply: mapNuanzeDecimal(server.maxSupply),
    fullyDilutedValuation: mapNuanzeDecimal(server.fullyDilutedValuation),
    ath: mapNuanzeDecimal(server.ath),
    atl: mapNuanzeDecimal(server.atl),
    high24h: mapNuanzeDecimal(server.high24h),
    low24h: mapNuanzeDecimal(server.low24h),
  };
}

function mapNuanzeFundamentalsValuation(
  server: NuanzeServerFundamentalsValuation,
): NuanzeFundamentalsValuation {
  return {
    trailingPE: mapNuanzeDecimal(server.trailingPE),
    forwardPE: mapNuanzeDecimal(server.forwardPE),
    priceToBook: mapNuanzeDecimal(server.priceToBook),
    enterpriseToRevenue: mapNuanzeDecimal(server.enterpriseToRevenue),
    enterpriseToEbitda: mapNuanzeDecimal(server.enterpriseToEbitda),
    revenue: mapNuanzeDecimal(server.revenue),
    profitMargins: mapNuanzeDecimal(server.profitMargins),
  };
}

function mapNuanzeFundamentalsPerformance(
  server: NuanzeServerFundamentalsPerformance,
): NuanzeFundamentalsPerformance {
  return {
    oneMonth: mapNuanzeDecimal(server.oneMonth),
    threeMonth: mapNuanzeDecimal(server.threeMonth),
    ytd: mapNuanzeDecimal(server.ytd),
    oneYear: mapNuanzeDecimal(server.oneYear),
  };
}

/**
 * Maps a server-side fundamentals projection. Employee counts stay integers.
 */
export function mapNuanzeStockFundamentals(
  server: NuanzeServerStockFundamentals,
): NuanzeStockFundamentals {
  return {
    productId: server.productId,
    source: server.source,
    quoteType: server.quoteType,
    currency: server.currency,
    name: server.name,
    description: server.description,
    sector: server.sector,
    industry: server.industry,
    website: server.website,
    employees: server.employees,
    marketCap: mapNuanzeDecimal(server.marketCap),
    keyData: mapNuanzeFundamentalsKeyData(server.keyData),
    valuation: mapNuanzeFundamentalsValuation(server.valuation),
    performance: mapNuanzeFundamentalsPerformance(server.performance),
    social: server.social,
    updatedAt: server.updatedAt,
  };
}

/**
 * Maps a server-side market detail to its client-side representation.
 */
export function mapNuanzeMarketDetail(
  server: NuanzeServerMarketDetail,
): NuanzeMarketDetail {
  return {
    ...mapNuanzeMarket(server),
    primaryProductId: server.primaryProductId,
    availableVenues: server.availableVenues,
    primaryVenue: server.primaryVenue,
    funding:
      server.funding === null
        ? null
        : mapNuanzeFundingObservation(server.funding),
    fundamentals:
      server.fundamentals === null
        ? null
        : mapNuanzeStockFundamentals(server.fundamentals),
    news: server.news,
    componentUpdatedAt: server.componentUpdatedAt,
  };
}

/**
 * Maps a server-side `GET /markets/{ticker}` response.
 */
export function mapNuanzeMarketByTickerResponse(
  server: NuanzeServerMarketDetail,
): GetNuanzeMarketByTickerResponse {
  return mapNuanzeMarketDetail(server);
}

/**
 * Maps a server-side leaderboard row.
 */
export function mapNuanzeLeaderboardItem(
  server: NuanzeServerLeaderboardItem,
): NuanzeLeaderboardItem {
  return {
    rank: server.rank,
    rankDelta: server.rankDelta,
    address: server.address,
    accountPnl: toBigNumber(server.accountPnl),
    pnl24h: mapNuanzeDecimal(server.pnl24h),
    pnl7d: mapNuanzeDecimal(server.pnl7d),
    pnl30d: mapNuanzeDecimal(server.pnl30d),
    pnlAll: toBigNumber(server.pnlAll),
    wins: server.wins,
    losses: server.losses,
    winRate: mapNuanzeDecimal(server.winRate),
    productIds: server.productIds,
    productCount: server.productCount,
  };
}

/**
 * Maps a server-side `GET /leaderboard` response.
 */
export function mapNuanzeLeaderboardResponse(
  server: NuanzeServerLeaderboardResponse,
): GetNuanzeLeaderboardResponse {
  return {
    timeframe: server.timeframe,
    items: server.items.map(mapNuanzeLeaderboardItem),
    limit: server.limit,
    offset: server.offset,
    total: server.total,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side followed-leaderboard row.
 */
export function mapNuanzeFollowedLeaderboardItem(
  server: NuanzeServerFollowedLeaderboardItem,
): NuanzeFollowedLeaderboardItem {
  return {
    subaccountHex: server.subaccountHex,
    username: server.username,
    displayName: server.displayName,
    pnl: mapNuanzeDecimal(server.pnl),
    wins: server.wins,
    losses: server.losses,
    winRate: mapNuanzeDecimal(server.winRate),
    trades: server.trades,
    productIds: server.productIds,
    productCount: server.productCount,
    globalRank: server.globalRank,
  };
}

/**
 * Maps a server-side public subaccount leaderboard row.
 */
export function mapNuanzeSubaccountLeaderboardItem(
  server: NuanzeServerSubaccountLeaderboardItem,
): NuanzeSubaccountLeaderboardItem {
  return {
    subaccountHex: server.subaccountHex,
    username: server.username,
    displayName: server.displayName,
    pnl: mapNuanzeDecimal(server.pnl),
    wins: server.wins,
    losses: server.losses,
    winRate: mapNuanzeDecimal(server.winRate),
    trades: server.trades,
    productIds: server.productIds,
    productCount: server.productCount,
    globalRank: server.globalRank,
  };
}

/**
 * Maps a server-side `GET /leaderboard/subaccounts` response.
 */
export function mapNuanzeSubaccountLeaderboardResponse(
  server: NuanzeServerSubaccountLeaderboardResponse,
): GetNuanzeSubaccountLeaderboardResponse {
  return {
    timeframe: server.timeframe,
    totalCount: server.totalCount,
    items: server.items.map(mapNuanzeSubaccountLeaderboardItem),
    nextCursor: server.nextCursor,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side `GET /wallets/leaderboard` response.
 */
export function mapNuanzeFollowedLeaderboardResponse(
  server: NuanzeServerFollowedLeaderboardResponse,
): GetNuanzeFollowedLeaderboardResponse {
  return {
    timeframe: server.timeframe,
    items: server.items.map(mapNuanzeFollowedLeaderboardItem),
    nextCursor: server.nextCursor,
    asOf: server.asOf,
  };
}

function mapNuanzePlatformDeltas(
  server: NuanzeServerPlatformDeltas,
): NuanzePlatformDeltas {
  return {
    volumePct: mapNuanzeDecimal(server.volumePct),
    tradesPct: mapNuanzeDecimal(server.tradesPct),
    tradersPct: mapNuanzeDecimal(server.tradersPct),
  };
}

/**
 * Maps a server-side `GET /platform/summary` response.
 */
export function mapNuanzePlatformSummaryResponse(
  server: NuanzeServerPlatformSummaryResponse,
): GetNuanzePlatformSummaryResponse {
  return {
    window: server.window,
    volume24h: toBigNumber(server.volume24h),
    trades24h: server.trades24h,
    traders24h: server.traders24h,
    windowVolume: toBigNumber(server.windowVolume),
    windowTrades: server.windowTrades,
    windowTraders: server.windowTraders,
    deltas: mapNuanzePlatformDeltas(server.deltas),
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side `GET /wallets/{address}` response.
 */
export function mapNuanzeWalletSummaryResponse(
  server: NuanzeServerWalletSummaryResponse,
): GetNuanzeWalletSummaryResponse {
  return {
    address: server.address,
    subaccountName: server.subaccountName,
    subaccountCount: server.subaccountCount,
    pnlWindow: server.pnlWindow,
    accountPnl: toBigNumber(server.accountPnl),
    windowPnl: toBigNumber(server.windowPnl),
    equity: mapNuanzeDecimal(server.equity),
    cumulativeVolume: toBigNumber(server.cumulativeVolume),
    windowVolume: toBigNumber(server.windowVolume),
    totalTrades: server.totalTrades,
    wins: server.wins,
    losses: server.losses,
    winRate: mapNuanzeDecimal(server.winRate),
    snapshotAt: server.snapshotAt,
    coverage: server.coverage,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side wallet position snapshot.
 */
export function mapNuanzeWalletPosition(
  server: NuanzeServerWalletPosition,
): NuanzeWalletPosition {
  return {
    subaccountName: server.subaccountName,
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    side: server.side,
    isSpot: server.isSpot,
    amount: toBigNumber(server.amount),
    oraclePrice: toBigNumber(server.oraclePrice),
    notional: toBigNumber(server.notional),
    unrealizedPnl: toBigNumber(server.unrealizedPnl),
    snapshotAt: server.snapshotAt,
  };
}

/**
 * Maps a server-side `GET /wallets/{address}/positions` response.
 */
export function mapNuanzeWalletPositionsResponse(
  server: NuanzeServerWalletPositionsResponse,
): GetNuanzeWalletPositionsResponse {
  return {
    address: server.address,
    positions: server.positions.map(mapNuanzeWalletPosition),
    count: server.count,
    newestSnapshotAt: server.newestSnapshotAt,
    oldestSnapshotAt: server.oldestSnapshotAt,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side market tape row.
 */
export function mapNuanzeMarketTrade(
  server: NuanzeServerMarketTrade,
): NuanzeMarketTrade {
  return {
    id: server.id,
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    side: server.side,
    price: toBigNumber(server.price),
    amount: toBigNumber(server.amount),
    notional: toBigNumber(server.notional),
    matchedAt: server.matchedAt,
  };
}

/**
 * Maps a server-side `GET /markets/{ticker}/trades` response.
 */
export function mapNuanzeMarketTradesResponse(
  server: NuanzeServerMarketTradesResponse,
): GetNuanzeMarketTradesResponse {
  return {
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    trades: server.trades.map(mapNuanzeMarketTrade),
    nextCursor: server.nextCursor,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side candle.
 */
export function mapNuanzeCandle(server: NuanzeServerCandle): NuanzeCandle {
  return {
    openTime: server.openTime,
    open: toBigNumber(server.open),
    high: toBigNumber(server.high),
    low: toBigNumber(server.low),
    close: toBigNumber(server.close),
    volume: toBigNumber(server.volume),
    complete: server.complete,
  };
}

/**
 * Maps a server-side `GET /markets/{ticker}/candles` response.
 */
export function mapNuanzeMarketCandlesResponse(
  server: NuanzeServerMarketCandlesResponse,
): GetNuanzeMarketCandlesResponse {
  return {
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    interval: server.interval,
    candles: server.candles.map(mapNuanzeCandle),
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side wallet trade.
 */
export function mapNuanzeWalletTrade(
  server: NuanzeServerWalletTrade,
): NuanzeWalletTrade {
  return {
    id: server.id,
    subaccountName: server.subaccountName,
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    side: server.side,
    isMaker: server.isMaker,
    price: toBigNumber(server.price),
    amount: toBigNumber(server.amount),
    notional: toBigNumber(server.notional),
    matchedAt: server.matchedAt,
  };
}

/**
 * Maps a server-side `GET /wallets/{address}/trades` response.
 */
export function mapNuanzeWalletTradesResponse(
  server: NuanzeServerWalletTradesResponse,
): GetNuanzeWalletTradesResponse {
  return {
    address: server.address,
    trades: server.trades.map(mapNuanzeWalletTrade),
    nextCursor: server.nextCursor,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side `GET /wallets/{address}/pnl` response.
 */
export function mapNuanzeWalletPnlResponse(
  server: NuanzeServerWalletPnlResponse,
): GetNuanzeWalletPnlResponse {
  return {
    address: server.address,
    subaccountName: server.subaccountName,
    window: server.window,
    windowStart: server.windowStart,
    windowEnd: server.windowEnd,
    openingAccountPnl: toBigNumber(server.openingAccountPnl),
    latestAccountPnl: toBigNumber(server.latestAccountPnl),
    windowPnl: toBigNumber(server.windowPnl),
    openingEquity: mapNuanzeDecimal(server.openingEquity),
    latestEquity: mapNuanzeDecimal(server.latestEquity),
    volumeDelta: toBigNumber(server.volumeDelta),
    sourceInterval: server.sourceInterval,
    latestSnapshotAt: server.latestSnapshotAt,
    coverage: server.coverage,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side series point.
 */
export function mapNuanzeSeriesPoint(
  server: NuanzeServerSeriesPoint,
): NuanzeSeriesPoint {
  return {
    timestamp: server.timestamp,
    value: mapNuanzeDecimal(server.value),
    synthetic: server.synthetic,
    provisional: server.provisional,
  };
}

/**
 * Maps a server-side `GET /wallets/{address}/pnl/series` response.
 */
export function mapNuanzeWalletPnlSeriesResponse(
  server: NuanzeServerWalletPnlSeriesResponse,
): GetNuanzeWalletPnlSeriesResponse {
  return {
    address: server.address,
    subaccountName: server.subaccountName,
    metric: server.metric,
    window: server.window,
    points: server.points.map(mapNuanzeSeriesPoint),
    sourceInterval: server.sourceInterval,
    coverage: server.coverage,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side collateral event.
 */
export function mapNuanzeCollateralFlow(
  server: NuanzeServerCollateralFlow,
): NuanzeCollateralFlow {
  return {
    id: server.id,
    eventType: server.eventType,
    productId: server.productId,
    symbol: server.symbol,
    assetAmount: toBigNumber(server.assetAmount),
    oraclePrice: mapNuanzeDecimal(server.oraclePrice),
    usdValue: mapNuanzeDecimal(server.usdValue),
    owner: server.owner,
    subaccountName: server.subaccountName,
    timestamp: server.timestamp,
    tags: server.tags,
  };
}

/**
 * Maps a server-side `GET /flows` response.
 */
export function mapNuanzeCollateralFlowsResponse(
  server: NuanzeServerCollateralFlowsResponse,
): GetNuanzeCollateralFlowsResponse {
  return {
    events: server.events.map(mapNuanzeCollateralFlow),
    nextCursor: server.nextCursor,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side `GET /flows/summary` response.
 */
export function mapNuanzeCollateralFlowSummaryResponse(
  server: NuanzeServerCollateralFlowSummaryResponse,
): GetNuanzeCollateralFlowSummaryResponse {
  return {
    timeframe: server.timeframe,
    deposited: toBigNumber(server.deposited),
    withdrawn: toBigNumber(server.withdrawn),
    net: toBigNumber(server.net),
    gross: toBigNumber(server.gross),
    depositCount: server.depositCount,
    withdrawalCount: server.withdrawalCount,
    valuedCount: server.valuedCount,
    unvaluedCount: server.unvaluedCount,
    priorNet: mapNuanzeDecimal(server.priorNet),
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side collateral flow series point.
 */
export function mapNuanzeCollateralFlowPoint(
  server: NuanzeServerCollateralFlowPoint,
): NuanzeCollateralFlowPoint {
  return {
    timestamp: server.timestamp,
    deposited: toBigNumber(server.deposited),
    withdrawn: toBigNumber(server.withdrawn),
    net: toBigNumber(server.net),
    cumulativeNet: toBigNumber(server.cumulativeNet),
    eventCount: server.eventCount,
    valuedCount: server.valuedCount,
    unvaluedCount: server.unvaluedCount,
  };
}

/**
 * Maps a server-side `GET /flows/series` response.
 */
export function mapNuanzeCollateralFlowSeriesResponse(
  server: NuanzeServerCollateralFlowSeriesResponse,
): GetNuanzeCollateralFlowSeriesResponse {
  return {
    timeframe: server.timeframe,
    bucket: server.bucket,
    points: server.points.map(mapNuanzeCollateralFlowPoint),
    asOf: server.asOf,
  };
}

function mapNuanzePositioningTotals(
  server: NuanzeServerPositioningTotals,
): NuanzePositioningTotals {
  return {
    longPositions: server.longPositions,
    shortPositions: server.shortPositions,
    longOwners: server.longOwners,
    shortOwners: server.shortOwners,
    netFlatOwners: server.netFlatOwners,
    longNotional: mapNuanzeDecimal(server.longNotional),
    shortNotional: mapNuanzeDecimal(server.shortNotional),
    longPositionPct: mapNuanzeDecimal(server.longPositionPct),
    shortPositionPct: mapNuanzeDecimal(server.shortPositionPct),
    longShortRatio: mapNuanzeDecimal(server.longShortRatio),
  };
}

function mapNuanzePositioningCellBase(
  server: NuanzeServerPositioningCellBase,
): NuanzePositioningCellBase {
  return {
    label: server.label,
    side: server.side,
    suppressed: server.suppressed,
    suppressionThreshold: server.suppressionThreshold,
    positions: server.positions,
    owners: server.owners,
    notional: mapNuanzeDecimal(server.notional),
    averageNotional: mapNuanzeDecimal(server.averageNotional),
    percentage: mapNuanzeDecimal(server.percentage),
  };
}

function mapNuanzeMarketPositioningBase(
  server: NuanzeServerMarketPositioningBase,
): NuanzeMarketPositioningBase {
  return {
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    effectiveMinPositionUsd: server.effectiveMinPositionUsd,
    suppressionThreshold: server.suppressionThreshold,
    totals: mapNuanzePositioningTotals(server.totals),
    newestSnapshotAt: server.newestSnapshotAt,
    oldestSnapshotAt: server.oldestSnapshotAt,
    asOf: server.asOf,
  };
}

/**
 * Maps a server-side `GET /markets/{ticker}/positioning` response.
 */
export function mapNuanzeMarketPositioningResponse(
  server: NuanzeServerMarketPositioningResponse,
): GetNuanzeMarketPositioningResponse {
  const base = mapNuanzeMarketPositioningBase(server);

  if (server.groupBy === 'side') {
    return {
      ...base,
      groupBy: 'side',
      cells: server.cells.map((cell: NuanzeServerSidePositioningCell) => ({
        ...mapNuanzePositioningCellBase(cell),
        key: cell.key,
      })),
    };
  }

  if (server.groupBy === 'cohort') {
    return {
      ...base,
      groupBy: 'cohort',
      cells: server.cells.map((cell: NuanzeServerCohortPositioningCell) => ({
        ...mapNuanzePositioningCellBase(cell),
        key: cell.key,
      })),
    };
  }

  return {
    ...base,
    groupBy: 'notionalBucket',
    cells: server.cells.map(
      (cell: NuanzeServerNotionalBucketPositioningCell) => ({
        ...mapNuanzePositioningCellBase(cell),
        key: cell.key,
      }),
    ),
  };
}

/**
 * Maps a server-side market position leg.
 */
export function mapNuanzeMarketPosition(
  server: NuanzeServerMarketPosition,
): NuanzeMarketPosition {
  return {
    subaccountOwner: server.subaccountOwner,
    subaccountName: server.subaccountName,
    symbol: server.symbol,
    marginKind: server.marginKind,
    side: server.side,
    amount: toBigNumber(server.amount),
    notional: toBigNumber(server.notional),
    upnl: toBigNumber(server.upnl),
    margin: mapNuanzeDecimal(server.margin),
    entryPrice: mapNuanzeDecimal(server.entryPrice),
  };
}

/**
 * Maps a server-side `GET /markets/{ticker}/positions` response.
 */
export function mapNuanzeMarketPositionsResponse(
  server: NuanzeServerMarketPositionsResponse,
): GetNuanzeMarketPositionsResponse {
  return {
    productId: server.productId,
    symbol: server.symbol,
    ticker: server.ticker,
    venue: server.venue,
    positions: server.positions.map(mapNuanzeMarketPosition),
    nextCursor: server.nextCursor,
    dataUpdatedAt: server.dataUpdatedAt,
    asOf: server.asOf,
  };
}

/**
 * Maps one server-side globally ranked open position leg.
 */
export function mapNuanzeOpenPosition(
  server: NuanzeServerOpenPosition,
): NuanzeOpenPosition {
  return {
    productId: server.productId,
    ticker: server.ticker,
    venue: server.venue,
    snapshotAt: server.snapshotAt,
    ...mapNuanzeMarketPosition(server),
  };
}

/**
 * Maps a server-side `GET /positions` response.
 */
export function mapNuanzeOpenPositionsResponse(
  server: NuanzeServerOpenPositionsResponse,
): GetNuanzeOpenPositionsResponse {
  return {
    positions: server.positions.map(mapNuanzeOpenPosition),
    nextCursor: server.nextCursor,
    dataUpdatedAt: server.dataUpdatedAt,
    asOf: server.asOf,
  };
}
