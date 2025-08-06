import { getAllMarkets, GetAllMarketsResponse } from '@nadohq/contracts';
import {
  GetEngineMarketLiquidityParams,
  GetEngineMarketPriceParams,
  GetEngineMarketPricesParams,
  GetEngineMaxOrderSizeParams,
  GetEngineSubaccountOrdersParams,
  GetEngineSubaccountProductOrdersParams,
  ValidateEngineOrderParams,
} from '@nadohq/engine-client';
import {
  GetIndexerCandlesticksParams,
  GetIndexerEdgeCandlesticksParams,
  GetIndexerEdgeMarketSnapshotsParams,
  GetIndexerFundingRateParams,
  GetIndexerMarketSnapshotsParams,
  GetIndexerMultiProductFundingRatesParams,
  GetIndexerMultiProductSnapshotsParams,
  GetIndexerOrdersParams,
  GetIndexerOrdersResponse,
  GetIndexerProductSnapshotsParams,
} from '@nadohq/indexer-client';
import { BaseNadoAPI } from '../base';
import { GetTriggerOrdersParams } from './types';

export class MarketQueryAPI extends BaseNadoAPI {
  /**
   * Retrieves all market states from the on-chain contracts
   */
  async getAllMarkets(): Promise<GetAllMarketsResponse> {
    return getAllMarkets(this.context.contracts);
  }

  /**
   * Retrieves all market states from the offchain engine
   */
  async getAllEngineMarkets(): Promise<GetAllMarketsResponse> {
    return this.context.engineClient.getAllMarkets();
  }

  /**
   * Get all edge engine markets
   */
  async getEdgeAllEngineMarkets(): Promise<
    Record<number, GetAllMarketsResponse>
  > {
    return this.context.engineClient.getEdgeAllMarkets();
  }

  /**
   * Retrieves all spread health groups
   */
  async getHealthGroups() {
    return this.context.engineClient.getHealthGroups();
  }

  /**
   * Queries engine to determine if the order can be submitted within health requirements
   */
  async validateOrderParams(params: ValidateEngineOrderParams) {
    return this.context.engineClient.validateOrderParams(params);
  }

  /**
   * Queries the offchain engine to retrieve status of any open orders for the given subaccount
   * @param params
   */
  async getOpenSubaccountOrders(params: GetEngineSubaccountOrdersParams) {
    return this.context.engineClient.getSubaccountOrders(params);
  }

  /**
   * Queries the offchain engine to retrieve status of any open orders for the given subaccount for multiple products
   * @param params
   */
  async getOpenSubaccountMultiProductOrders(
    params: GetEngineSubaccountProductOrdersParams,
  ) {
    return this.context.engineClient.getSubaccountMultiProductOrders(params);
  }

  /**
   * Queries the offchain trigger service to list trigger orders. Requires a signature
   * @param params
   */
  async getTriggerOrders(params: GetTriggerOrdersParams) {
    return this.context.triggerClient.listOrders({
      ...params,
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  /**
   * Queries indexer to fetch historical orders
   *
   * @param params
   */
  async getHistoricalOrders(
    params: GetIndexerOrdersParams,
  ): Promise<GetIndexerOrdersResponse> {
    return this.context.indexerClient.getOrders(params);
  }

  /**
   * Queries engine to determine maximum order size
   * @param params
   */
  async getMaxOrderSize(params: GetEngineMaxOrderSizeParams) {
    return this.context.engineClient.getMaxOrderSize(params);
  }

  /**
   * Retrieves liquidity per price tick from the engine. The engine will skip price levels that have no liquidity,
   * so it is not guaranteed that the bids/asks are evenly spaced
   */
  async getMarketLiquidity(params: GetEngineMarketLiquidityParams) {
    return this.context.engineClient.getMarketLiquidity(params);
  }

  /**
   * Historical candlesticks from the indexer, use getLatestMarketPrice for the latest orderbook prices
   *
   * @param params
   */
  async getCandlesticks(params: GetIndexerCandlesticksParams) {
    return this.context.indexerClient.getCandlesticks(params);
  }

  /**
   * Historical candlesticks from Edge, use getLatestMarketPrice for the latest orderbook prices
   *
   * @param params
   */
  async getEdgeCandlesticks(params: GetIndexerEdgeCandlesticksParams) {
    return this.context.indexerClient.getEdgeCandlesticks(params);
  }

  /**
   * Retrieves the latest off-chain orderbook price from the engine
   *
   * @param params
   */
  async getLatestMarketPrice(params: GetEngineMarketPriceParams) {
    return this.context.engineClient.getMarketPrice(params);
  }

  /**
   * Retrieves the latest off-chain orderbook price from the engine for multiple markets
   *
   * @param params
   */
  async getLatestMarketPrices(params: GetEngineMarketPricesParams) {
    return this.context.engineClient.getMarketPrices(params);
  }

  /**
   * Retrieves the latest funding rate for a perp product
   *
   * @param params
   */
  async getFundingRate(params: GetIndexerFundingRateParams) {
    return this.context.indexerClient.getFundingRate(params);
  }

  /**
   * Retrieves the latest funding rate for multiple perp products
   *
   * @param params
   */
  async getMultiProductFundingRates(
    params: GetIndexerMultiProductFundingRatesParams,
  ) {
    return this.context.indexerClient.getMultiProductFundingRates(params);
  }

  /**
   * Retrieves the historical snapshots for a product from the indexer
   *
   * @param params
   */
  async getProductSnapshots(params: GetIndexerProductSnapshotsParams) {
    return this.context.indexerClient.getProductSnapshots(params);
  }

  /**
   * Retrieves the historical snapshots for a market from the indexer
   *
   * @param params
   */
  async getMarketSnapshots(params: GetIndexerMarketSnapshotsParams) {
    return this.context.indexerClient.getMarketSnapshots(params);
  }

  /**
   * Retrieves the historical snapshots for a market from Edge
   *
   * @param params
   */
  async getEdgeMarketSnapshots(params: GetIndexerEdgeMarketSnapshotsParams) {
    return this.context.indexerClient.getEdgeMarketSnapshots(params);
  }

  /**
   * Retrieves the historical snapshots for multiple products from the indexer
   *
   * @param params
   */
  async getMultiProductSnapshots(
    params: GetIndexerMultiProductSnapshotsParams,
  ) {
    return this.context.indexerClient.getMultiProductSnapshots(params);
  }
}
