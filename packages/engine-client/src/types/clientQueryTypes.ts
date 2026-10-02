import {
  BalanceHealthContributions,
  BalanceSide,
  BalanceWithProduct,
  EIP712OrderParams,
  HealthGroup,
  HealthStatusByType,
  MarketWithProduct,
  OrderAppendix,
  PerpBalanceWithProduct,
  ProductEngineType,
  SignedEIP712OrderParams,
  SpotBalanceWithProduct,
  Subaccount,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import {
  EngineServerNoncesParams,
  EngineServerTimeResponse,
} from './serverQueryTypes';

export interface GetEngineSubaccountSummaryResponse extends SubaccountSummaryState {
  exists: boolean;
  preState?: SubaccountSummaryState;
}

export interface SubaccountSummaryState {
  balances: BalanceWithProduct[];
  health: HealthStatusByType;
}

export type GetEngineSubaccountSummaryParams = Subaccount;

export type GetEngineIsolatedPositionsParams = Subaccount;

export interface SubaccountIsolatedPosition {
  subaccount: Subaccount;
  healths: BalanceHealthContributions;
  quoteBalance: SpotBalanceWithProduct;
  baseBalance: PerpBalanceWithProduct;
}

export type GetEngineIsolatedPositionsResponse = SubaccountIsolatedPosition[];

export type SubaccountTx = {
  type: 'apply_delta';
  tx: SubaccountProductDeltaTx;
};

export interface SubaccountProductDeltaTx {
  productId: number;
  amountDelta: BigNumber;
  vQuoteDelta: BigNumber;
}

export interface GetEngineContractsResponse {
  chainId: number;
  endpointAddr: string;
}

export type GetEngineEstimatedSubaccountSummaryParams = Subaccount & {
  txs: SubaccountTx[];
  preState?: boolean;
};

export type GetEngineNoncesParams = EngineServerNoncesParams;

export interface GetEngineNoncesResponse {
  orderNonce: string;
  txNonce: string;
}

export interface GetEngineSymbolsParams {
  productType?: ProductEngineType;
  productIds?: number[];
}

export interface EngineSymbolsResponse {
  // mapping of product symbol to symbols info
  symbols: Record<string, EngineSymbol>;
}

export interface EngineSymbol {
  type: ProductEngineType;
  productId: number;
  symbol: string;
  priceIncrement: BigNumber;
  sizeIncrement: BigNumber;
  minSize: BigNumber;
  makerFeeRate: BigNumber;
  takerFeeRate: BigNumber;
  longWeightInitial: BigNumber;
  longWeightMaintenance: BigNumber;
  // undefined when there is no max open interest limit (always undefined for spot products)
  maxOpenInterest: BigNumber | undefined;
  isolatedOnly: boolean;
}

export type GetEngineAllMarketsResponse = MarketWithProduct[];

export interface GetEngineHealthGroupsResponse {
  healthGroups: HealthGroup[];
}

export interface GetEngineOrderParams {
  productId: number;
  digest: string;
}

export interface EngineOrder extends Subaccount {
  productId: number;
  price: BigNumber;
  // Amount initially requested
  totalAmount: BigNumber;
  // Amount still unfilled
  unfilledAmount: BigNumber;
  expiration: number;
  nonce: string;
  digest: string;
  placementTime: number;
  appendix: OrderAppendix;
}

export type GetEngineOrderResponse = EngineOrder;

export interface ValidateSignedEngineOrderParams {
  productId: number;
  signedOrder: SignedEIP712OrderParams;
}

export interface ValidateEngineOrderParams {
  productId: number;
  chainId: number;
  order: EIP712OrderParams;
}

export interface ValidateEngineOrderResponse {
  productId: number;
  valid: boolean;
}

export interface GetEngineSubaccountOrdersParams extends Subaccount {
  productId: number;
}

export interface EngineSubaccountOrders {
  productId: number;
  orders: EngineOrder[];
}

export type GetEngineSubaccountOrdersResponse = EngineSubaccountOrders;

export interface GetEngineSubaccountProductOrdersParams extends Subaccount {
  productIds: number[];
}

export interface GetEngineSubaccountProductOrdersResponse {
  productOrders: EngineSubaccountOrders[];
}

export type GetEngineSubaccountFeeRatesParams = Subaccount;

export interface SubaccountOrderFeeRates {
  maker: BigNumber;
  taker: BigNumber;
}

export interface GetEngineSubaccountFeeRatesResponse {
  // By Product ID
  orders: Record<number, SubaccountOrderFeeRates>;
  withdrawal: Record<number, BigNumber>;
  liquidationSequencerFee: BigNumber;
  healthCheckSequencerFee: BigNumber;
  takerSequencerFee: BigNumber;
  feeTier: number;
}

export interface EnginePriceTickLiquidity {
  price: BigNumber;
  liquidity: BigNumber;
}

export interface GetEngineMarketLiquidityParams {
  productId: number;
  // The minimum depth in base price ticks (i.e. per side
  depth: number;
}

export interface GetEngineMarketLiquidityResponse {
  bids: EnginePriceTickLiquidity[];
  asks: EnginePriceTickLiquidity[];
}

export interface GetEngineMarketPriceParams {
  productId: number;
}

export interface EngineMarketPrice {
  productId: number;
  bid: BigNumber;
  ask: BigNumber;
}

export type GetEngineMarketPriceResponse = EngineMarketPrice;

export interface GetEngineMarketPricesParams {
  productIds: number[];
}

export interface GetEngineMarketPricesResponse {
  marketPrices: EngineMarketPrice[];
}

export interface GetEngineMaxOrderSizeParams extends Subaccount {
  price: BigNumber;
  // Optional average execution price for multi-price orders
  // For longs, must be >= `price`; for shorts, <= `price`. Defaults to `price` when omitted.
  avgPrice?: BigNumber;
  productId: number;
  // Note: When `reduceOnly` is true, `side` must be opposite of the current position, otherwise it returns 0.
  side: BalanceSide;
  // If not given, engine defaults to true (leverage/borrow enabled) for spot
  // Do not pass this for perp products
  spotLeverage?: boolean;
  // If not given, engine defaults to false. If true, the max order size will be capped to the subaccount's current position size;
  // If no position exists, it will return 0.
  reduceOnly?: boolean;
  isolated?: boolean;
  // If not given, engine defaults to true (do not borrow margin for isolated orders)
  // Max order size query for `isolated` includes available transfer from the cross subaccount
  isoBorrowMargin?: boolean;
}

export type GetEngineMaxOrderSizeResponse = BigNumber;

export interface GetEngineMaxWithdrawableParams extends Subaccount {
  productId: number;
  // If not given, engine defaults to true (leverage/borrow enabled)
  spotLeverage?: boolean;
}

export type GetEngineMaxWithdrawableResponse = BigNumber;

/**
 * Response of {@link EngineQueryClient.getMaxWithdrawable} when called with
 * `{ withDynamicFee: true }`: the max withdrawable with the current dynamic fee of
 * Withdraw Collateral V2 reserved instead of the flat fee.
 */
export interface GetEngineMaxWithdrawableWithDynamicFeeResponse {
  /** Max withdrawable amount, with the current dynamic fee reserved. */
  maxWithdrawable: BigNumber;
  /**
   * The dynamic fee reserved, in the product's x18 units. Omitted when the subaccount has no
   * deposits.
   */
  fee?: BigNumber;
}

/**
 * Params for the `dynamic_fee_quote` query. Withdraw Collateral V2 and Transfer Quote V2 are
 * charged a dynamic fee: at most the flat V1 fee (the cap), lower when platform-wide V2
 * withdrawal and transfer demand is low. This query returns the fee a request would be charged
 * right now. The fee is priced again at execution, so pass a `maxFeeX18` with some headroom.
 */
export type GetEngineDynamicFeeQuoteParams =
  | (Subaccount & {
      /** Fee for a Withdraw Collateral V2 of the given spot product. */
      kind: 'withdrawal';
      /** Spot product to withdraw. */
      productId: number;
    })
  | (Subaccount & {
      /** Fee for a Transfer Quote V2 to the given recipient subaccount (same wallet). */
      kind: 'transfer_quote';
      /** Name of the recipient subaccount, under the same wallet as the sender. */
      recipientSubaccountName: string;
    });

/**
 * Response of the `dynamic_fee_quote` query: the fee a V2 withdrawal or V2 quote transfer would
 * be charged right now.
 */
export interface GetEngineDynamicFeeQuoteResponse {
  /** Fee a request would be charged now. Never above `feeCap`. */
  requiredFee: BigNumber;
  /** The cap: the flat V1 fee for this withdrawal or transfer. */
  feeCap: BigNumber;
  /** Current V2 demand, from 0 (fee is free) to 1e18 (fee is the cap). The fee grows with it. */
  pressure: BigNumber;
}

export type GetEngineTimeResponse = EngineServerTimeResponse;

export type GetEngineLinkedSignerParams = Subaccount;

export interface GetEngineLinkedSignerResponse {
  signer: string;
}

export type GetEngineInsuranceResponse = BigNumber;

/**
 * Given an IP, backend will either:
 * - Allow queries only through archive / engine (query_only)
 * - Block all requests (blocked)
 * - Allow all requests (null)
 */
export type GetEngineIpBlockStatusResponse = 'query_only' | 'blocked' | null;

/**
 * ISO 3166-1 alpha-2 country code detected by the gateway (e.g. `'US'`, `'NO'`),
 * or `null` if the gateway did not provide one (e.g. local environments).
 *
 * Suitable for region-based UI gating such as geoblocking trading competitions.
 */
export type GetEngineCountryCodeResponse = string | null;

export interface GetEngineMaxMintNlpAmountParams extends Subaccount {
  // If not given, engine defaults to true (leverage/borrow enabled)
  spotLeverage?: boolean;
}

export type GetEngineMaxMintNlpAmountResponse = BigNumber;

export type GetEngineMaxBurnNlpAmountParams = Subaccount;

export type GetEngineMaxBurnNlpAmountResponse = BigNumber;

export type GetEngineNlpLockedBalancesParams = Subaccount;

export interface EngineNlpBalance {
  productId: number;
  balance: BigNumber;
}

export interface EngineNlpLockedBalance extends EngineNlpBalance {
  unlockedAt: number;
}

export interface GetEngineNlpLockedBalancesResponse {
  lockedBalances: EngineNlpLockedBalance[];
  balanceLocked: EngineNlpBalance;
  balanceUnlocked: EngineNlpBalance;
}

export interface NlpPool {
  poolId: number;
  subaccountHex: string;
  ownerAddress: string;
  balanceWeight: BigNumber;
  subaccountInfo: GetEngineSubaccountSummaryResponse;
  openOrders: EngineOrder[];
}

export interface GetEngineNlpPoolInfoResponse {
  nlpPools: NlpPool[];
}

/**
 * Params for the cached (`edge`) market prices query. Unlike the live
 * {@link GetEngineMarketPricesParams}, `productIds` is optional — omit it to return every
 * product currently in the cache.
 */
export interface GetEngineCachedMarketPricesParams {
  productIds?: number[];
}

export interface GetEngineCachedBboHistoryParams {
  productIds?: number[];
  // Down-sampling stride in ms. Default 500, must be >= 500, rounded up to a multiple of 500
  intervalMs?: number;
  // Upper time bound (epoch ms). Omit for the most recent samples
  maxTimeMs?: number;
  // Max samples per product. Default 500, capped at 3600
  limit?: number;
}

export interface EngineBboHistorySample {
  productId: number;
  // Sample time, epoch milliseconds
  timestamp: number;
  bid: BigNumber;
  ask: BigNumber;
}

export interface GetEngineCachedBboHistoryResponse {
  // The effective (normalized) sampling stride applied
  intervalMs: number;
  // The effective per-product sample cap applied
  limit: number;
  // Samples sorted ascending by (timestamp, productId)
  history: EngineBboHistorySample[];
}

export interface EnginePingParams {
  id?: number;
  // If provided, echoed back so the caller can measure round-trip latency / clock offset
  clientTime?: number;
}

export interface EnginePingResponse {
  id?: number;
  // Epoch ms
  serverTime: number;
  // Epoch ms, echoed from the request (only present when provided in the request)
  clientTime?: number;
}

export interface EngineCachedTimeParams {
  id?: number;
}
