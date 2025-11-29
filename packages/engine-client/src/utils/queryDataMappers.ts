import {
  BalanceHealthContributions,
  calcTotalBorrowed,
  calcTotalDeposited,
  mapValues,
  PerpMarket,
  ProductEngineType,
  removeDecimals,
  SpotMarket,
  subaccountFromHex,
  toBigDecimal,
  unpackOrderAppendix,
} from '@nadohq/shared';
import {
  EngineMarketPrice,
  EngineNlpLockedBalance,
  EngineOrder,
  EnginePriceTickLiquidity,
  EngineServerIsolatedPositionsResponse,
  EngineServerMarketPrice,
  EngineServerNlpLockedBalancesResponse,
  EngineServerNlpPoolInfoResponse,
  EngineServerOrderResponse,
  EngineServerPerpProduct,
  EngineServerPriceTickLiquidity,
  EngineServerSpotProduct,
  EngineServerSubaccountInfoResponse,
  EngineServerSubaccountInfoState,
  EngineServerSymbol,
  EngineServerSymbolsResponse,
  EngineSymbol,
  EngineSymbolsResponse,
  GetEngineIsolatedPositionsResponse,
  GetEngineNlpLockedBalancesResponse,
  GetEngineNlpPoolInfoResponse,
  GetEngineSubaccountSummaryResponse,
  SubaccountSummaryState,
} from '../types';
import { mapEngineServerProductType } from './productEngineTypeMappers';

export function mapEngineServerTickLiquidity(
  tick: EngineServerPriceTickLiquidity,
): EnginePriceTickLiquidity {
  return {
    price: removeDecimals(tick[0]),
    liquidity: toBigDecimal(tick[1]),
  };
}

export function mapEngineServerOrder(
  order: EngineServerOrderResponse,
): EngineOrder {
  const subaccount = subaccountFromHex(order.sender);
  return {
    digest: order.digest,
    expiration: Number(order.expiration),
    nonce: order.nonce,
    price: removeDecimals(order.price_x18),
    productId: order.product_id,
    subaccountOwner: subaccount.subaccountOwner,
    subaccountName: subaccount.subaccountName,
    totalAmount: toBigDecimal(order.amount),
    unfilledAmount: toBigDecimal(order.unfilled_amount),
    placementTime: order.placed_at,
    appendix: unpackOrderAppendix(order.appendix),
  };
}

export function mapEngineServerSpotProduct(
  product: EngineServerSpotProduct,
): SpotMarket {
  return {
    type: ProductEngineType.SPOT,
    productId: product.product_id,
    minSize: toBigDecimal(product.book_info.min_size),
    priceIncrement: removeDecimals(product.book_info.price_increment_x18),
    sizeIncrement: toBigDecimal(product.book_info.size_increment),
    product: {
      productId: product.product_id,
      type: ProductEngineType.SPOT,
      totalBorrowed: calcTotalBorrowed(
        product.state.total_borrows_normalized,
        product.state.cumulative_borrows_multiplier_x18,
      ),
      totalDeposited: calcTotalDeposited(
        product.state.total_deposits_normalized,
        product.state.cumulative_deposits_multiplier_x18,
      ),
      oraclePrice: removeDecimals(product.oracle_price_x18),
      interestFloor: removeDecimals(product.config.interest_floor_x18),
      interestInflectionUtil: removeDecimals(
        product.config.interest_inflection_util_x18,
      ),
      interestLargeCap: removeDecimals(product.config.interest_large_cap_x18),
      interestSmallCap: removeDecimals(product.config.interest_small_cap_x18),
      minDepositRate: removeDecimals(product.config.min_deposit_rate_x18),
      longWeightInitial: removeDecimals(product.risk.long_weight_initial_x18),
      longWeightMaintenance: removeDecimals(
        product.risk.long_weight_maintenance_x18,
      ),
      shortWeightInitial: removeDecimals(product.risk.short_weight_initial_x18),
      shortWeightMaintenance: removeDecimals(
        product.risk.short_weight_maintenance_x18,
      ),
      tokenAddr: product.config.token,
    },
  };
}

export function mapEngineServerPerpProduct(
  product: EngineServerPerpProduct,
): PerpMarket {
  return {
    type: ProductEngineType.PERP,
    productId: product.product_id,
    minSize: toBigDecimal(product.book_info.min_size),
    priceIncrement: removeDecimals(product.book_info.price_increment_x18),
    sizeIncrement: toBigDecimal(product.book_info.size_increment),
    product: {
      productId: product.product_id,
      type: ProductEngineType.PERP,
      oraclePrice: removeDecimals(product.oracle_price_x18),
      longWeightInitial: removeDecimals(product.risk.long_weight_initial_x18),
      longWeightMaintenance: removeDecimals(
        product.risk.long_weight_maintenance_x18,
      ),
      shortWeightInitial: removeDecimals(product.risk.short_weight_initial_x18),
      shortWeightMaintenance: removeDecimals(
        product.risk.short_weight_maintenance_x18,
      ),
      openInterest: toBigDecimal(product.state.open_interest),
      cumulativeFundingLong: removeDecimals(
        product.state.cumulative_funding_long_x18,
      ),
      cumulativeFundingShort: removeDecimals(
        product.state.cumulative_funding_short_x18,
      ),
    },
  };
}

export function mapEngineServerBalanceHealthContributions(
  healthContributionsForBalance: string[],
): BalanceHealthContributions {
  return {
    initial: toBigDecimal(healthContributionsForBalance[0]),
    maintenance: toBigDecimal(healthContributionsForBalance[1]),
    unweighted: toBigDecimal(healthContributionsForBalance[2]),
  };
}

export function mapSubaccountSummary(
  baseResponse: EngineServerSubaccountInfoResponse,
): GetEngineSubaccountSummaryResponse {
  return {
    exists: baseResponse.exists,
    ...mapSubaccountSummaryState(
      baseResponse,
      baseResponse.spot_products,
      baseResponse.perp_products,
    ),
    preState: baseResponse.pre_state
      ? mapSubaccountSummaryState(
          baseResponse.pre_state,
          baseResponse.spot_products,
          baseResponse.perp_products,
        )
      : undefined,
  };
}

function mapSubaccountSummaryState(
  state: EngineServerSubaccountInfoState,
  spotProducts: EngineServerSubaccountInfoResponse['spot_products'],
  perpProducts: EngineServerSubaccountInfoResponse['perp_products'],
): SubaccountSummaryState {
  const balances: SubaccountSummaryState['balances'] = [];

  state.spot_balances.forEach((spotBalance) => {
    const product = spotProducts.find(
      (product) => product.product_id === spotBalance.product_id,
    );
    if (!product) {
      throw Error(`Could not find product ${spotBalance.product_id}`);
    }

    balances.push({
      amount: toBigDecimal(spotBalance.balance.amount),
      healthContributions: mapEngineServerBalanceHealthContributions(
        state.health_contributions[spotBalance.product_id],
      ),
      ...mapEngineServerSpotProduct(product).product,
    });
  });

  state.perp_balances.forEach((perpBalance) => {
    const product = perpProducts.find(
      (product) => product.product_id === perpBalance.product_id,
    );
    if (!product) {
      throw Error(`Could not find product ${perpBalance.product_id}`);
    }

    balances.push({
      amount: toBigDecimal(perpBalance.balance.amount),
      vQuoteBalance: toBigDecimal(perpBalance.balance.v_quote_balance),
      healthContributions: mapEngineServerBalanceHealthContributions(
        state.health_contributions[perpBalance.product_id],
      ),
      ...mapEngineServerPerpProduct(product).product,
    });
  });

  return {
    balances,
    health: {
      initial: {
        health: toBigDecimal(state.healths[0].health),
        assets: toBigDecimal(state.healths[0].assets),
        liabilities: toBigDecimal(state.healths[0].liabilities),
      },
      maintenance: {
        health: toBigDecimal(state.healths[1].health),
        assets: toBigDecimal(state.healths[1].assets),
        liabilities: toBigDecimal(state.healths[1].liabilities),
      },
      unweighted: {
        health: toBigDecimal(state.healths[2].health),
        assets: toBigDecimal(state.healths[2].assets),
        liabilities: toBigDecimal(state.healths[2].liabilities),
      },
    },
  };
}

export function mapEngineServerIsolatedPositions(
  baseResponse: EngineServerIsolatedPositionsResponse,
): GetEngineIsolatedPositionsResponse {
  return baseResponse.isolated_positions.map((position) => {
    const perpBalance = position.base_balance;
    const quoteBalance = position.quote_balance;

    return {
      subaccount: subaccountFromHex(position.subaccount),
      healths: {
        initial: toBigDecimal(position.healths[0].health),
        maintenance: toBigDecimal(position.healths[1].health),
        unweighted: toBigDecimal(position.healths[2].health),
      },
      baseBalance: {
        amount: toBigDecimal(perpBalance.balance.amount),
        vQuoteBalance: toBigDecimal(perpBalance.balance.v_quote_balance),
        // Health contributions === healths for an isolated position
        healthContributions: {
          initial: toBigDecimal(position.base_healths[0]),
          maintenance: toBigDecimal(position.base_healths[1]),
          unweighted: toBigDecimal(position.base_healths[2]),
        },
        ...mapEngineServerPerpProduct(position.base_product).product,
      },
      quoteBalance: {
        amount: toBigDecimal(quoteBalance.balance.amount),
        healthContributions: {
          initial: toBigDecimal(position.quote_healths[0]),
          maintenance: toBigDecimal(position.quote_healths[1]),
          unweighted: toBigDecimal(position.quote_healths[2]),
        },
        ...mapEngineServerSpotProduct(position.quote_product).product,
      },
    };
  });
}

export function mapEngineServerSymbols(
  baseResponse: EngineServerSymbolsResponse,
): EngineSymbolsResponse {
  const symbols: Record<string, EngineSymbol> = mapValues(
    baseResponse.symbols,
    mapEngineServerSymbol,
  );

  return {
    symbols,
  };
}

export function mapEngineServerSymbol(
  engineServerSymbol: EngineServerSymbol,
): EngineSymbol {
  return {
    type: mapEngineServerProductType(engineServerSymbol.type),
    productId: engineServerSymbol.product_id,
    symbol: engineServerSymbol.symbol,
    priceIncrement: removeDecimals(engineServerSymbol.price_increment_x18),
    sizeIncrement: toBigDecimal(engineServerSymbol.size_increment),
    minSize: toBigDecimal(engineServerSymbol.min_size),
    makerFeeRate: removeDecimals(engineServerSymbol.maker_fee_rate_x18),
    takerFeeRate: removeDecimals(engineServerSymbol.taker_fee_rate_x18),
    longWeightInitial: removeDecimals(
      engineServerSymbol.long_weight_initial_x18,
    ),
    longWeightMaintenance: removeDecimals(
      engineServerSymbol.long_weight_maintenance_x18,
    ),
    maxOpenInterest: removeDecimals(engineServerSymbol.max_open_interest_x18),
  };
}

export function mapEngineMarketPrice(
  baseResponse: EngineServerMarketPrice,
): EngineMarketPrice {
  return {
    ask: removeDecimals(baseResponse.ask_x18),
    bid: removeDecimals(baseResponse.bid_x18),
    productId: baseResponse.product_id,
  };
}

export function mapEngineServerNlpLockedBalances(
  baseResponse: EngineServerNlpLockedBalancesResponse,
): GetEngineNlpLockedBalancesResponse {
  const lockedBalances: EngineNlpLockedBalance[] =
    baseResponse.locked_balances.map((lockedBalance) => ({
      productId: lockedBalance.balance.product_id,
      balance: toBigDecimal(lockedBalance.balance.balance.amount),
      unlockedAt: lockedBalance.unlocked_at,
    }));

  return {
    lockedBalances,
    balanceLocked: {
      productId: baseResponse.balance_locked.product_id,
      balance: toBigDecimal(baseResponse.balance_locked.balance.amount),
    },
    balanceUnlocked: {
      productId: baseResponse.balance_unlocked.product_id,
      balance: toBigDecimal(baseResponse.balance_unlocked.balance.amount),
    },
  };
}

export function mapEngineServerNlpPoolInfo(
  baseResponse: EngineServerNlpPoolInfoResponse,
): GetEngineNlpPoolInfoResponse {
  return {
    nlpPools: baseResponse.nlp_pools.map((pool) => ({
      poolId: pool.pool_id,
      subaccountHex: pool.subaccount,
      ownerAddress: pool.owner,
      balanceWeight: removeDecimals(pool.balance_weight_x18),
      subaccountInfo: mapSubaccountSummary(pool.subaccount_info),
      openOrders: pool.open_orders.map(mapEngineServerOrder),
    })),
  };
}
