import { HealthStatus } from '@nadohq/contracts';
import {
  EngineServerHealthBreakdown,
  EngineServerPerpBalance,
  EngineServerPerpProduct,
  EngineServerProductType,
  EngineServerSpotBalance,
  EngineServerSpotProduct,
} from './serverQueryModelTypes';

export interface EngineServerNoncesParams {
  address: string;
}

export interface EngineServerSubaccountInfoQueryParams {
  subaccount: string;
  txns?: Array<{
    apply_delta: {
      product_id: number;
      subaccount: string;
      amount_delta: string;
      v_quote_delta: string;
    };
  }>;
}

export interface EngineServerIsolatedPositionsQueryParams {
  subaccount: string;
}

export interface EngineServerSymbolsQueryParams {
  product_type?: EngineServerProductType;
  product_ids?: number[];
}

export interface EngineServerMarketPriceQueryParams {
  product_id: number;
}

export interface EngineServerMarketPricesQueryParams {
  product_ids: number[];
}

export interface EngineServerGetOrderQueryParams {
  product_id: number;
  digest: string;
}

export interface EngineServerValidateOrderQueryParams {
  product_id: number;
  // Bytes for order, does not need to be signed
  order: string;
}

export interface EngineServerOrdersQueryParams {
  sender: string;
  product_ids: number[];
}

export interface EngineServerSubaccountOrdersQueryParams {
  sender: string;
  product_id: number;
}

export interface EngineServerSubaccountFeeRatesParams {
  sender: string;
}

export interface EngineServerMarketLiquidityQueryParams {
  product_id: number;
  depth: number;
}

export interface EngineServerMaxWithdrawableQueryParams {
  sender: string;
  product_id: number;
  // If not given, engine defaults to true (leverage/borrow enabled)
  spot_leverage: string | null;
}

export interface EngineServerMaxOrderSizeQueryParams {
  sender: string;
  product_id: number;
  price_x18: string;
  // Note: When `reduce_only` is true, `direction` must be opposite of the current position, otherwise it returns 0.
  direction: 'long' | 'short';
  // If not given, engine defaults to true (leverage/borrow enabled)
  spot_leverage: string | null;
  // If not given, engine defaults to false. If true, the max order size will be capped to the subaccount's current position size;
  // If no position exists, it will return 0.
  reduce_only: string | null;
}

export interface EngineServerLinkedSignerParams {
  subaccount: string;
}

export interface EngineServerMaxMintVlpQueryParams {
  sender: string;
  // If not given, engine defaults to true (leverage/borrow enabled)
  spot_leverage: string | null;
}

export interface EngineServerQueryRequestByType {
  all_products: Record<string, never>;
  contracts: Record<string, never>;
  edge_all_products: Record<string, never>;
  fee_rates: EngineServerSubaccountFeeRatesParams;
  health_groups: Record<string, never>;
  insurance: Record<string, never>;
  isolated_positions: EngineServerIsolatedPositionsQueryParams;
  linked_signer: EngineServerLinkedSignerParams;
  market_liquidity: EngineServerMarketLiquidityQueryParams;
  market_price: EngineServerMarketPriceQueryParams;
  market_prices: EngineServerMarketPricesQueryParams;
  max_vlp_mintable: EngineServerMaxMintVlpQueryParams;
  max_order_size: EngineServerMaxOrderSizeQueryParams;
  max_withdrawable: EngineServerMaxWithdrawableQueryParams;
  min_deposit_rates: Record<string, never>;
  nonces: EngineServerNoncesParams;
  order: EngineServerGetOrderQueryParams;
  orders: EngineServerOrdersQueryParams;
  status: Record<string, never>;
  subaccount_info: Omit<EngineServerSubaccountInfoQueryParams, 'txns'> & {
    // JSON serialized txns
    txns?: string;
  };
  subaccount_orders: EngineServerSubaccountOrdersQueryParams;
  symbols: EngineServerSymbolsQueryParams;
  validate_order: EngineServerValidateOrderQueryParams;
}

export type EngineServerQueryRequestType = keyof EngineServerQueryRequestByType;

export type EngineServerQueryRequest<
  TRequestType extends EngineServerQueryRequestType,
> = {
  type: TRequestType;
} & EngineServerQueryRequestByType[TRequestType];

export interface EngineServerContractsResponse {
  chain_id: string;
  endpoint_addr: string;
  // Index is product ID
  book_addrs: string[];
}

// Unless in active state, engine is not fully operational
export type EngineServerStatusResponse =
  | 'started'
  | 'active'
  | 'stopping'
  | 'syncing'
  | 'live_syncing'
  | 'failed';

export interface EngineServerNoncesResponse {
  order_nonce: string;
  tx_nonce: string;
}

export interface EngineServerSubaccountInfoResponse {
  exists: boolean;
  subaccount: string;
  healths: [
    initial: EngineServerHealthBreakdown,
    maintenance: EngineServerHealthBreakdown,
    unweighted: EngineServerHealthBreakdown,
  ];
  // First index is product ID, each subarray is of length 3 [initial, maintenance, unweighted]
  health_contributions: string[][];
  spot_count: number;
  perp_count: number;
  spot_balances: EngineServerSpotBalance[];
  perp_balances: EngineServerPerpBalance[];
  spot_products: EngineServerSpotProduct[];
  perp_products: EngineServerPerpProduct[];
}

export interface EngineServerIsolatedPosition {
  subaccount: string;
  healths: [
    initial: HealthStatus,
    maintenance: HealthStatus,
    unweighted: HealthStatus,
  ];
  quote_healths: [initial: string, maintenance: string, unweighted: string];
  base_healths: [initial: string, maintenance: string, unweighted: string];
  quote_balance: EngineServerSpotBalance;
  base_balance: EngineServerPerpBalance;
  quote_product: EngineServerSpotProduct;
  base_product: EngineServerPerpProduct;
}

export type EngineServerIsolatedPositionsResponse = {
  isolated_positions: EngineServerIsolatedPosition[];
};

export interface EngineServerSymbol {
  type: EngineServerProductType;
  product_id: number;
  symbol: string;
  price_increment_x18: string;
  size_increment: string;
  min_size: string;
  min_depth_x18: string;
  max_spread_rate_x18: string;
  maker_fee_rate_x18: string;
  taker_fee_rate_x18: string;
  long_weight_initial_x18: string;
  long_weight_maintenance_x18: string;
}

export interface EngineServerSymbolsResponse {
  symbols: Record<string, EngineServerSymbol>;
}

export interface EngineServerAllProductsResponse {
  spot_products: EngineServerSpotProduct[];
  perp_products: EngineServerPerpProduct[];
}

export interface EngineServerHealthGroupsResponse {
  health_groups: [spotProductId: number, perpProductId: number][];
}

// Price, liquidity pairs
export type EngineServerPriceTickLiquidity = [
  priceX18: string,
  liquidity: string,
];

export interface EngineServerMarketLiquidityResponse {
  bids: EngineServerPriceTickLiquidity[];
  asks: EngineServerPriceTickLiquidity[];
}

export interface EngineServerSubaccountOrders {
  sender: string;
  product_id: number;
  orders: EngineServerOrder[];
}

export type EngineServerSubaccountOrdersResponse = EngineServerSubaccountOrders;

export interface EngineServerProductOrdersResponse {
  sender: string;
  product_orders: EngineServerSubaccountOrders[];
}

export interface EngineServerFeeRatesResponse {
  liquidation_sequencer_fee: string;
  health_check_sequencer_fee: string;
  taker_sequencer_fee: string;
  // Product ID is the index
  withdraw_sequencer_fees: string[];
  taker_fee_rates_x18: string[];
  maker_fee_rates_x18: string[];
}

export interface EngineServerMarketPrice {
  product_id: number;
  bid_x18: string;
  ask_x18: string;
}

export type EngineServerMarketPriceResponse = EngineServerMarketPrice;

export interface EngineServerMarketPricesResponse {
  market_prices: EngineServerMarketPrice[];
}

export interface EngineServerOrder {
  product_id: number;
  sender: string;
  price_x18: string;
  amount: string;
  expiration: string;
  nonce: string;
  unfilled_amount: string;
  digest: string;
  placed_at: number;
  order_type: string;
  margin: string | null;
}

export type EngineServerOrderResponse = EngineServerOrder;

export interface EngineServerValidateOrderResponse {
  product_id: number;
  order: string;
  valid: boolean;
}

export interface EngineServerMaxOrderSizeResponse {
  max_order_size: string;
}

export interface EngineServerMaxWithdrawableResponse {
  max_withdrawable: string;
}

export type EngineServerTimeResponse = number;

export interface EngineServerIpBlockResponse {
  blocked: boolean;
  reason: string;
}

export interface EngineServerLinkedSignerResponse {
  linked_signer: string;
}

export interface EngineInsuranceResponse {
  insurance: string;
}

export interface EngineServerMinDepositRate {
  product_id: number;
  min_deposit_rate_x18: string;
}

export interface EngineServerMinDepositRatesResponse {
  // product_id -> EngineServerMinDepositRate
  min_deposit_rates: Record<number, EngineServerMinDepositRate>;
}

export interface EngineServerEdgeAllProductsResponse {
  // chain_id -> EngineServerAllProductsResponse
  edge_all_products: Record<number, EngineServerAllProductsResponse>;
}

export interface EngineServerMaxMintVlpResponse {
  max_quote_amount: string;
}

export interface EngineServerQueryResponseByType {
  all_products: EngineServerAllProductsResponse;
  contracts: EngineServerContractsResponse;
  edge_all_products: EngineServerEdgeAllProductsResponse;
  fee_rates: EngineServerFeeRatesResponse;
  health_groups: EngineServerHealthGroupsResponse;
  insurance: EngineInsuranceResponse;
  isolated_positions: EngineServerIsolatedPositionsResponse;
  linked_signer: EngineServerLinkedSignerResponse;
  market_liquidity: EngineServerMarketLiquidityResponse;
  market_price: EngineServerMarketPriceResponse;
  market_prices: EngineServerMarketPricesResponse;
  max_vlp_mintable: EngineServerMaxMintVlpResponse;
  max_order_size: EngineServerMaxOrderSizeResponse;
  max_withdrawable: EngineServerMaxWithdrawableResponse;
  min_deposit_rates: EngineServerMinDepositRatesResponse;
  nonces: EngineServerNoncesResponse;
  order: EngineServerOrderResponse;
  orders: EngineServerProductOrdersResponse;
  status: EngineServerStatusResponse;
  subaccount_info: EngineServerSubaccountInfoResponse;
  subaccount_orders: EngineServerSubaccountOrdersResponse;
  symbols: EngineServerSymbolsResponse;
  validate_order: EngineServerValidateOrderResponse;
}

export interface EngineServerQuerySuccessResponse<
  TQueryType extends
    keyof EngineServerQueryResponseByType = EngineServerQueryRequestType,
> {
  status: 'success';
  data: EngineServerQueryResponseByType[TQueryType];
}

export interface EngineServerQueryFailureResponse {
  status: 'failure';
  error: string;
  error_code: number;
}

export type EngineServerQueryResponse<
  TQueryType extends
    keyof EngineServerQueryResponseByType = EngineServerQueryRequestType,
> =
  | EngineServerQuerySuccessResponse<TQueryType>
  | EngineServerQueryFailureResponse;
