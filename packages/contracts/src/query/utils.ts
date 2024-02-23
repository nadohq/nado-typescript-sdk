import { fromX18, toBigDecimal } from '@vertex-protocol/utils';
import {
  BalanceHealthContributions,
  PerpProduct,
  ProductEngineType,
  SpotProduct,
} from '../common';
import { FQuerier } from '../typechain-types';
import { calcTotalBorrowed, calcTotalDeposited } from '../utils';

export function mapContractSpotProduct(
  product: FQuerier.SpotProductStructOutput,
): SpotProduct {
  return {
    productId: Number(product.productId),
    type: ProductEngineType.SPOT,
    tokenAddr: product.config.token,
    interestSmallCap: fromX18(product.config.interestSmallCapX18),
    interestLargeCap: fromX18(product.config.interestLargeCapX18),
    interestFloor: fromX18(product.config.interestFloorX18),
    interestInflectionUtil: fromX18(product.config.interestInflectionUtilX18),
    totalBorrowed: calcTotalBorrowed(
      product.state.totalBorrowsNormalized,
      product.state.cumulativeBorrowsMultiplierX18,
    ),
    totalDeposited: calcTotalDeposited(
      product.state.totalDepositsNormalized,
      product.state.cumulativeDepositsMultiplierX18,
    ),
    shortWeightInitial: fromX18(product.risk.shortWeightInitialX18),
    shortWeightMaintenance: fromX18(product.risk.shortWeightMaintenanceX18),
    longWeightInitial: fromX18(product.risk.longWeightInitialX18),
    longWeightMaintenance: fromX18(product.risk.longWeightMaintenanceX18),
    oraclePrice: fromX18(product.oraclePriceX18),
    totalLpBaseAmount: toBigDecimal(product.lpState.base.amount),
    totalLpQuoteAmount: toBigDecimal(product.lpState.quote.amount),
    totalLpSupply: toBigDecimal(product.lpState.supply),
  };
}

export function mapContractPerpProduct(
  product: FQuerier.PerpProductStructOutput,
): PerpProduct {
  return {
    productId: Number(product.productId),
    type: ProductEngineType.PERP,
    shortWeightInitial: fromX18(product.risk.shortWeightInitialX18),
    shortWeightMaintenance: fromX18(product.risk.shortWeightMaintenanceX18),
    longWeightInitial: fromX18(product.risk.longWeightInitialX18),
    longWeightMaintenance: fromX18(product.risk.longWeightMaintenanceX18),
    cumulativeFundingLong: fromX18(product.state.cumulativeFundingLongX18),
    cumulativeFundingShort: fromX18(product.state.cumulativeFundingShortX18),
    oraclePrice: fromX18(product.oraclePriceX18),
    openInterest: toBigDecimal(product.state.openInterest),
    totalLpBaseAmount: toBigDecimal(product.lpState.base),
    totalLpQuoteAmount: toBigDecimal(product.lpState.quote),
    totalLpSupply: toBigDecimal(product.lpState.supply),
  };
}

export function mapHealthContributions(
  contributionsForProduct: bigint[],
): BalanceHealthContributions {
  // Initial, maint, unweighted
  return {
    initial: toBigDecimal(contributionsForProduct[0]),
    maintenance: toBigDecimal(contributionsForProduct[1]),
    unweighted: toBigDecimal(contributionsForProduct[2]),
  };
}
