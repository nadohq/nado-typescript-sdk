import {
  BalanceHealthContributions,
  BalanceSide,
  BalanceWithProduct,
  BigDecimal,
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
import {
  EngineServerNoncesParams,
  EngineServerTimeResponse,
} from './serverQueryTypes';

export type GetEngineSubaccountSummaryResponse = {
  exists: boolean;
  balances: BalanceWithProduct[];
  health: HealthStatusByType;
};

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
  amountDelta: BigDecimal;
  vQuoteDelta: BigDecimal;
}

export interface GetEngineContractsResponse {
  chainId: number;
  endpointAddr: string;
}

export type GetEngineEstimatedSubaccountSummaryParams = Subaccount & {
  txs: SubaccountTx[];
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
  priceIncrement: BigDecimal;
  sizeIncrement: BigDecimal;
  minSize: BigDecimal;
  minDepth: BigDecimal;
  maxSpreadRate: BigDecimal;
  makerFeeRate: BigDecimal;
  takerFeeRate: BigDecimal;
  longWeightInitial: BigDecimal;
  longWeightMaintenance: BigDecimal;
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
  price: BigDecimal;
  // Amount initially requested
  totalAmount: BigDecimal;
  // Amount still unfilled
  unfilledAmount: BigDecimal;
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
  maker: BigDecimal;
  taker: BigDecimal;
}

export interface GetEngineSubaccountFeeRatesResponse {
  // By Product ID
  orders: Record<number, SubaccountOrderFeeRates>;
  withdrawal: Record<number, BigDecimal>;
  liquidationSequencerFee: BigDecimal;
  healthCheckSequencerFee: BigDecimal;
  takerSequencerFee: BigDecimal;
  feeTier: number;
}

export interface EnginePriceTickLiquidity {
  price: BigDecimal;
  liquidity: BigDecimal;
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
  bid: BigDecimal;
  ask: BigDecimal;
}

export type GetEngineMarketPriceResponse = EngineMarketPrice;

export interface GetEngineMarketPricesParams {
  productIds: number[];
}

export interface GetEngineMarketPricesResponse {
  marketPrices: EngineMarketPrice[];
}

export interface GetEngineMaxOrderSizeParams extends Subaccount {
  price: BigDecimal;
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

export type GetEngineMaxOrderSizeResponse = BigDecimal;

export interface GetEngineMaxWithdrawableParams extends Subaccount {
  productId: number;
  // If not given, engine defaults to true (leverage/borrow enabled)
  spotLeverage?: boolean;
}

export type GetEngineMaxWithdrawableResponse = BigDecimal;

export type GetEngineTimeResponse = EngineServerTimeResponse;

export type GetEngineLinkedSignerParams = Subaccount;

export interface GetEngineLinkedSignerResponse {
  signer: string;
}

export type GetEngineInsuranceResponse = BigDecimal;

/**
 * Given an IP, backend will either:
 * - Allow queries only through archive / engine (query_only)
 * - Block all requests (blocked)
 * - Allow all requests (null)
 */
export type GetEngineIpBlockStatusResponse = 'query_only' | 'blocked' | null;

export interface GetEngineMaxMintNlpAmountParams extends Subaccount {
  // If not given, engine defaults to true (leverage/borrow enabled)
  spotLeverage?: boolean;
}

export type GetEngineMaxMintNlpAmountResponse = BigDecimal;

export type GetEngineMaxBurnNlpAmountParams = Subaccount;

export type GetEngineMaxBurnNlpAmountResponse = BigDecimal;

export type GetEngineNlpLockedBalancesParams = Subaccount;

export interface EngineNlpBalance {
  productId: number;
  balance: BigDecimal;
}

export interface EngineNlpLockedBalance extends EngineNlpBalance {
  unlockedAt: number;
}

export interface GetEngineNlpLockedBalancesResponse {
  lockedBalances: EngineNlpLockedBalance[];
  balanceLocked: EngineNlpBalance;
  balanceUnlocked: EngineNlpBalance;
}
