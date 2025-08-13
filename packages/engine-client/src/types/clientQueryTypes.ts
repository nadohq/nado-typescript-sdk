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
} from '@nadohq/contracts';
import { BigDecimal } from '@nadohq/utils';
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
  /**
   * Address for the orderbook contract, with the product ID being the index
   */
  orderbookAddrs: string[];
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
  expiration: BigDecimal;
  // Margin being transferred for the order, will be null if not an iso order
  margin: BigDecimal | null;
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
  orderbookAddr: string;
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

export interface EngineMinDepositRate {
  productId: number;
  minDepositRate: BigDecimal;
}

export interface GetEngineMinDepositRatesResponse {
  minDepositRates: Record<number, EngineMinDepositRate>;
}

/**
 * Given an IP, backend will either:
 * - Allow queries only through archive / engine (query_only)
 * - Block all requests (blocked)
 * - Allow all requests (null)
 */
export type GetEngineIpBlockStatusResponse = 'query_only' | 'blocked' | null;

export interface GetEngineMaxMintVlpAmountParams extends Subaccount {
  // If not given, engine defaults to true (leverage/borrow enabled)
  spotLeverage?: boolean;
}

export type GetEngineMaxMintVlpAmountResponse = BigDecimal;
