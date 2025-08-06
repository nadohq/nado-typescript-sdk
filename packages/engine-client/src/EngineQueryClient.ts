import {
  encodeSignedOrder,
  MarketWithProduct,
  subaccountToHex,
} from '@vertex-protocol/contracts';
import {
  addDecimals,
  BigDecimal,
  mapValues,
  removeDecimals,
  toBigDecimal,
  toIntegerString,
} from '@vertex-protocol/utils';
import { EngineBaseClient } from './EngineBaseClient';
import {
  EngineServerStatusResponse,
  EngineServerSubaccountInfoQueryParams,
  EngineSymbolsResponse,
  GetEngineAllMarketsResponse,
  GetEngineContractsResponse,
  GetEngineEstimatedSubaccountSummaryParams,
  GetEngineHealthGroupsResponse,
  GetEngineInsuranceResponse,
  GetEngineIsolatedPositionsParams,
  GetEngineIsolatedPositionsResponse,
  GetEngineLinkedSignerParams,
  GetEngineLinkedSignerResponse,
  GetEngineMarketLiquidityParams,
  GetEngineMarketLiquidityResponse,
  GetEngineMarketPriceParams,
  GetEngineMarketPriceResponse,
  GetEngineMarketPricesParams,
  GetEngineMarketPricesResponse,
  GetEngineMaxMintVlpAmountParams,
  GetEngineMaxMintVlpAmountResponse,
  GetEngineMaxOrderSizeParams,
  GetEngineMaxOrderSizeResponse,
  GetEngineMaxWithdrawableParams,
  GetEngineMaxWithdrawableResponse,
  GetEngineMinDepositRatesResponse,
  GetEngineOrderParams,
  GetEngineOrderResponse,
  GetEngineSubaccountFeeRatesParams,
  GetEngineSubaccountFeeRatesResponse,
  GetEngineSubaccountOrdersParams,
  GetEngineSubaccountOrdersResponse,
  GetEngineSubaccountProductOrdersParams,
  GetEngineSubaccountProductOrdersResponse,
  GetEngineSubaccountSummaryParams,
  GetEngineSubaccountSummaryResponse,
  GetEngineSymbolsParams,
  SubaccountOrderFeeRates,
  ValidateEngineOrderParams,
  ValidateEngineOrderResponse,
  ValidateSignedEngineOrderParams,
} from './types';
import { mapProductEngineType } from './utils/productEngineTypeMappers';
import {
  mapEngineMarketPrice,
  mapEngineServerIsolatedPositions,
  mapEngineServerOrder,
  mapEngineServerPerpProduct,
  mapEngineServerSpotProduct,
  mapEngineServerSymbols,
  mapEngineServerTickLiquidity,
  mapSubaccountSummary,
} from './utils/queryDataMappers';

export class EngineQueryClient extends EngineBaseClient {
  /**
   * Retrieves the set of contracts that the engine is interfacing with
   */
  async getContracts(): Promise<GetEngineContractsResponse> {
    const baseResponse = await this.query('contracts', {});
    return {
      chainId: Number(baseResponse.chain_id),
      endpointAddr: baseResponse.endpoint_addr,
      orderbookAddrs: baseResponse.book_addrs,
    };
  }

  /**
   * Retrieves current engine status
   */
  async getStatus(): Promise<EngineServerStatusResponse> {
    return this.query('status', {});
  }

  /**
   * Retrieves a subaccount summary reflective of the state within the offchain engine. This adheres to the
   * same return interface as the contract version
   *
   * @param params
   */
  async getSubaccountSummary(
    params: GetEngineSubaccountSummaryParams,
  ): Promise<GetEngineSubaccountSummaryResponse> {
    const subaccount = subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    });
    const baseResponse = await this.query('subaccount_info', {
      subaccount,
    });

    return mapSubaccountSummary(baseResponse);
  }

  /**
   * Retrieves a list of isolated positions
   *
   * @param params
   */
  async getIsolatedPositions(
    params: GetEngineIsolatedPositionsParams,
  ): Promise<GetEngineIsolatedPositionsResponse> {
    const subaccount = subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    });
    const baseResponse = await this.query('isolated_positions', {
      subaccount,
    });

    return mapEngineServerIsolatedPositions(baseResponse);
  }

  /**
   * Retrieves an estimated subaccount summary with the applied transactions
   *
   * @param params
   */
  async getEstimatedSubaccountSummary(
    params: GetEngineEstimatedSubaccountSummaryParams,
  ): Promise<GetEngineSubaccountSummaryResponse> {
    const subaccount = subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    });
    const queryParams: EngineServerSubaccountInfoQueryParams = {
      subaccount: subaccount,
      txns: params.txs.map(
        (
          tx,
        ): NonNullable<
          EngineServerSubaccountInfoQueryParams['txns']
        >[number] => {
          switch (tx.type) {
            case 'apply_delta':
              return {
                apply_delta: {
                  product_id: tx.tx.productId,
                  subaccount,
                  amount_delta: toIntegerString(tx.tx.amountDelta),
                  v_quote_delta: toIntegerString(tx.tx.vQuoteDelta),
                },
              };
          }
        },
      ),
    };
    const baseResponse = await this.query('subaccount_info', {
      subaccount: queryParams.subaccount,
      txns: JSON.stringify(queryParams.txns),
    });

    return mapSubaccountSummary(baseResponse);
  }

  /**
   * Retrieves symbols and product info
   *
   * @param params
   */
  async getSymbols(
    params: GetEngineSymbolsParams,
  ): Promise<EngineSymbolsResponse> {
    const baseResponse = await this.query('symbols', {
      product_ids: params.productIds,
      product_type:
        params.productType != null
          ? mapProductEngineType(params.productType)
          : undefined,
    });
    return mapEngineServerSymbols(baseResponse);
  }

  /**
   * Retrieves all market states as per the offchain engine. Same return interface as contracts
   */
  async getAllMarkets(): Promise<GetEngineAllMarketsResponse> {
    const markets: MarketWithProduct[] = [];

    const baseResponse = await this.query('all_products', {});
    baseResponse.spot_products.forEach((spotProduct) => {
      markets.push(mapEngineServerSpotProduct(spotProduct));
    });
    baseResponse.perp_products.forEach((perpProduct) => {
      markets.push(mapEngineServerPerpProduct(perpProduct));
    });

    return markets;
  }

  /**
   * Retrieves all markets by chain id.
   */
  async getEdgeAllMarkets(): Promise<Record<number, MarketWithProduct[]>> {
    const baseResponse = await this.query('edge_all_products', {});

    return mapValues(baseResponse.edge_all_products, (allProducts) => {
      const markets: MarketWithProduct[] = [];

      allProducts.spot_products.forEach((spotProduct) => {
        markets.push(mapEngineServerSpotProduct(spotProduct));
      });

      allProducts.perp_products.forEach((perpProduct) => {
        markets.push(mapEngineServerPerpProduct(perpProduct));
      });

      return markets;
    });
  }

  /**
   * Retrieves all health groups (linked spot & perp products) from the engine
   */
  async getHealthGroups(): Promise<GetEngineHealthGroupsResponse> {
    const baseResponse = await this.query('health_groups', {});

    return {
      healthGroups: baseResponse.health_groups.map(
        ([spotProductId, perpProductId]) => {
          return {
            spotProductId,
            perpProductId,
          };
        },
      ),
    };
  }

  /**
   * Retrieves min deposit rates for all spot products from the engine
   */
  async getMinDepositRates(): Promise<GetEngineMinDepositRatesResponse> {
    const baseResponse = await this.query('min_deposit_rates', {});

    return {
      minDepositRates: mapValues(baseResponse.min_deposit_rates, (m) => {
        return {
          productId: m.product_id,
          minDepositRate: removeDecimals(m.min_deposit_rate_x18),
        };
      }),
    };
  }

  /**
   * Retrieves an order from the offchain engine
   *
   * @param params
   */
  async getOrder(
    params: GetEngineOrderParams,
  ): Promise<GetEngineOrderResponse> {
    const baseResponse = await this.query('order', {
      digest: params.digest,
      product_id: params.productId,
    });

    return mapEngineServerOrder(baseResponse);
  }

  /**
   * Signs and validates with the engine that the order is valid to be submitted (i.e. does not violate health reqs)
   *
   * @param params
   */
  async validateOrderParams(
    params: ValidateEngineOrderParams,
  ): Promise<ValidateEngineOrderResponse> {
    const signedOrder = {
      order: params.order,
      signature: await this.sign(
        'place_order',
        params.orderbookAddr,
        params.chainId,
        params.order,
      ),
    };
    return this.validateSignedOrderParams({
      signedOrder,
      productId: params.productId,
    });
  }

  /**
   * Validates an existing signed order with the engine as a pre-check for health
   *
   * @param params
   */
  async validateSignedOrderParams(
    params: ValidateSignedEngineOrderParams,
  ): Promise<ValidateEngineOrderResponse> {
    const baseResponse = await this.query('validate_order', {
      product_id: params.productId,
      order: encodeSignedOrder(params.signedOrder),
    });

    return {
      productId: baseResponse.product_id,
      valid: baseResponse.valid,
    };
  }

  /**
   * Get all subaccount orders from the engine, per product ID
   * @param params
   */
  async getSubaccountOrders(
    params: GetEngineSubaccountOrdersParams,
  ): Promise<GetEngineSubaccountOrdersResponse> {
    const baseResponse = await this.query('subaccount_orders', {
      sender: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
      product_id: params.productId,
    });

    return {
      orders: baseResponse.orders.map(mapEngineServerOrder),
      productId: params.productId,
    };
  }

  /**
   * Get all subaccount orders from the engine, for multiple products
   * @param params
   */
  async getSubaccountMultiProductOrders(
    params: GetEngineSubaccountProductOrdersParams,
  ): Promise<GetEngineSubaccountProductOrdersResponse> {
    const baseResponse = await this.query('orders', {
      sender: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
      product_ids: params.productIds,
    });

    return {
      productOrders: baseResponse.product_orders.map((orders) => {
        return {
          orders: orders.orders.map(mapEngineServerOrder),
          productId: orders.product_id,
        };
      }),
    };
  }

  /**
   * Gets maker & taker fee rates for order fees
   * @param params
   */
  async getSubaccountFeeRates(
    params: GetEngineSubaccountFeeRatesParams,
  ): Promise<GetEngineSubaccountFeeRatesResponse> {
    const baseResponse = await this.query('fee_rates', {
      sender: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
    });

    return {
      healthCheckSequencerFee: toBigDecimal(
        baseResponse.health_check_sequencer_fee,
      ),
      liquidationSequencerFee: toBigDecimal(
        baseResponse.liquidation_sequencer_fee,
      ),
      takerSequencerFee: toBigDecimal(baseResponse.taker_sequencer_fee),
      orders: baseResponse.taker_fee_rates_x18.reduce(
        (acc, takerRateX18, currIndex) => {
          acc[currIndex] = {
            taker: removeDecimals(takerRateX18),
            maker: removeDecimals(baseResponse.maker_fee_rates_x18[currIndex]),
          };
          return acc;
        },
        {} as Record<number, SubaccountOrderFeeRates>,
      ),
      withdrawal: baseResponse.withdraw_sequencer_fees.reduce(
        (acc, productFee, currIndex) => {
          acc[currIndex] = toBigDecimal(productFee);
          return acc;
        },
        {} as Record<number, BigDecimal>,
      ),
    };
  }

  /**
   * Gets "price ticks" for a given market, useful for constructing liquidity levels at each price
   * @param params
   */
  async getMarketLiquidity(
    params: GetEngineMarketLiquidityParams,
  ): Promise<GetEngineMarketLiquidityResponse> {
    const baseResponse = await this.query('market_liquidity', {
      product_id: params.productId,
      depth: params.depth,
    });
    return {
      asks: baseResponse.asks.map(mapEngineServerTickLiquidity),
      bids: baseResponse.bids.map(mapEngineServerTickLiquidity),
    };
  }

  /**
   * Retrieves the latest price for a given market
   * @param params
   */
  async getMarketPrice(
    params: GetEngineMarketPriceParams,
  ): Promise<GetEngineMarketPriceResponse> {
    const baseResponse = await this.query('market_price', {
      product_id: params.productId,
    });
    return mapEngineMarketPrice(baseResponse);
  }

  /**
   * Retrieves the latest prices for provided markets
   * @param params
   */
  async getMarketPrices(
    params: GetEngineMarketPricesParams,
  ): Promise<GetEngineMarketPricesResponse> {
    const baseResponse = await this.query('market_prices', {
      product_ids: params.productIds,
    });
    return {
      marketPrices: baseResponse.market_prices.map(mapEngineMarketPrice),
    };
  }

  /**
   * Retrieves the estimated max order size for a product
   * @param params
   */
  async getMaxOrderSize(
    params: GetEngineMaxOrderSizeParams,
  ): Promise<GetEngineMaxOrderSizeResponse> {
    const baseResponse = await this.query('max_order_size', {
      direction: params.side,
      price_x18: toIntegerString(addDecimals(params.price)),
      product_id: params.productId,
      sender: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
      spot_leverage:
        params.spotLeverage != null ? String(params.spotLeverage) : null,
      reduce_only: params.reduceOnly != null ? String(params.reduceOnly) : null,
    });

    return toBigDecimal(baseResponse.max_order_size);
  }

  /**
   * Retrieves the estimated max withdrawal size for a product
   * @param params
   */
  async getMaxWithdrawable(
    params: GetEngineMaxWithdrawableParams,
  ): Promise<GetEngineMaxWithdrawableResponse> {
    const baseResponse = await this.query('max_withdrawable', {
      product_id: params.productId,
      sender: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
      spot_leverage:
        params.spotLeverage != null ? String(params.spotLeverage) : null,
    });

    return toBigDecimal(baseResponse.max_withdrawable);
  }

  /**
   * Retrieves the estimated max quote amount for minting VLP.
   *
   * @param params
   */
  async getMaxMintVlpAmount(
    params: GetEngineMaxMintVlpAmountParams,
  ): Promise<GetEngineMaxMintVlpAmountResponse> {
    const baseResponse = await this.query('max_vlp_mintable', {
      sender: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
      spot_leverage:
        params.spotLeverage != null ? String(params.spotLeverage) : null,
    });

    return toBigDecimal(baseResponse.max_quote_amount);
  }

  /**
   * Gets the currently linked signer for the subaccount
   * @param params
   * @returns
   */
  public async getLinkedSigner(
    params: GetEngineLinkedSignerParams,
  ): Promise<GetEngineLinkedSignerResponse> {
    const baseResponse = await this.query('linked_signer', {
      subaccount: subaccountToHex({
        subaccountOwner: params.subaccountOwner,
        subaccountName: params.subaccountName,
      }),
    });

    return {
      signer: baseResponse.linked_signer,
    };
  }

  /**
   * Gets the insurance funds in USDC.
   * @returns
   */
  public async getInsurance(): Promise<GetEngineInsuranceResponse> {
    const baseResponse = await this.query('insurance', {});

    return toBigDecimal(baseResponse.insurance);
  }

  /**
   * Gets the orderbook contract address for a given product
   * @param productId
   * @returns
   */
  public async getOrderbookAddress(productId: number): Promise<string> {
    const contracts = await this.getContracts();
    return contracts.orderbookAddrs[productId];
  }
}
