import { removeDecimals, toBigDecimal } from '@vertex-protocol/utils';
import { ReadContractReturnType } from 'viem';
import {
  BalanceHealthContributions,
  PerpProduct,
  ProductEngineType,
  SpotProduct,
  VertexAbis,
} from '../common';
import { calcTotalBorrowed, calcTotalDeposited } from '../utils';

type GetAllProductsResponse = ReadContractReturnType<
  VertexAbis['querier'],
  'getAllProducts'
>;

export function mapContractSpotProduct(
  product: GetAllProductsResponse['spotProducts'][number],
): SpotProduct {
  return {
    productId: Number(product.productId),
    type: ProductEngineType.SPOT,
    tokenAddr: product.config.token,
    interestSmallCap: removeDecimals(product.config.interestSmallCapX18),
    interestLargeCap: removeDecimals(product.config.interestLargeCapX18),
    interestFloor: removeDecimals(product.config.interestFloorX18),
    interestInflectionUtil: removeDecimals(
      product.config.interestInflectionUtilX18,
    ),
    totalBorrowed: calcTotalBorrowed(
      product.state.totalBorrowsNormalized,
      product.state.cumulativeBorrowsMultiplierX18,
    ),
    totalDeposited: calcTotalDeposited(
      product.state.totalDepositsNormalized,
      product.state.cumulativeDepositsMultiplierX18,
    ),
    shortWeightInitial: removeDecimals(product.risk.shortWeightInitialX18),
    shortWeightMaintenance: removeDecimals(
      product.risk.shortWeightMaintenanceX18,
    ),
    longWeightInitial: removeDecimals(product.risk.longWeightInitialX18),
    longWeightMaintenance: removeDecimals(
      product.risk.longWeightMaintenanceX18,
    ),
    oraclePrice: removeDecimals(product.oraclePriceX18),
  };
}

export function mapContractPerpProduct(
  product: GetAllProductsResponse['perpProducts'][number],
): PerpProduct {
  return {
    productId: Number(product.productId),
    type: ProductEngineType.PERP,
    shortWeightInitial: removeDecimals(product.risk.shortWeightInitialX18),
    shortWeightMaintenance: removeDecimals(
      product.risk.shortWeightMaintenanceX18,
    ),
    longWeightInitial: removeDecimals(product.risk.longWeightInitialX18),
    longWeightMaintenance: removeDecimals(
      product.risk.longWeightMaintenanceX18,
    ),
    cumulativeFundingLong: removeDecimals(
      product.state.cumulativeFundingLongX18,
    ),
    cumulativeFundingShort: removeDecimals(
      product.state.cumulativeFundingShortX18,
    ),
    oraclePrice: removeDecimals(product.oraclePriceX18),
    openInterest: toBigDecimal(product.state.openInterest),
  };
}

export function mapHealthContributions(
  contributionsForProduct: readonly bigint[],
): BalanceHealthContributions {
  // Initial, maint, unweighted
  return {
    initial: toBigDecimal(contributionsForProduct[0]),
    maintenance: toBigDecimal(contributionsForProduct[1]),
    unweighted: toBigDecimal(contributionsForProduct[2]),
  };
}
