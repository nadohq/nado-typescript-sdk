import { BigDecimal } from '@vertex-protocol/utils';

export const QUOTE_PRODUCT_ID = 0;

/**
 * Representation of the ProductEngineType enum used within the contract
 * Enums do not get reflected in the ABI, so this must be manually defined
 */
export enum ProductEngineType {
  SPOT,
  PERP,
}

/**
 * Maps a raw ProductEngineType enum value to the proper type
 * @param val
 */
export function toProductEngineType(val: number): ProductEngineType {
  switch (val) {
    case 0:
      return ProductEngineType.SPOT;
    case 1:
      return ProductEngineType.PERP;
    default:
      throw new Error(`Unknown product engine type: ${val}`);
  }
}

/**
 * Shared properties across products
 */
interface BaseProduct {
  type: ProductEngineType;
  productId: number;
  // Latest price given by oracle
  oraclePrice: BigDecimal;
  // Weight used to calculate initial health for a long position
  longWeightInitial: BigDecimal;
  // Weight used to calculate initial health for a short position
  shortWeightInitial: BigDecimal;
  // Weight used to calculate maint. health for a long position
  longWeightMaintenance: BigDecimal;
  // Weight used to calculate maint. health for a short position
  shortWeightMaintenance: BigDecimal;
  // Health penalty term for large position sizes
  largePositionPenalty: BigDecimal;
  // LP state
  totalLpQuoteAmount: BigDecimal;
  totalLpBaseAmount: BigDecimal;
  totalLpSupply: BigDecimal;
}

/**
 * Represents a product stored in PerpEngine
 */
export interface PerpProduct extends BaseProduct {
  type: ProductEngineType.PERP;
  // Current open interest
  openInterest: BigDecimal;
}

/**
 * Represents a product stored in SpotEngine.
 *
 * See the calculation {@link (calcBorrowRatePerSecond:UTILS)} for more details on interest parameters
 */
export interface SpotProduct extends BaseProduct {
  type: ProductEngineType.SPOT;
  tokenAddr: string;
  interestFloor: BigDecimal;
  interestInflectionUtil: BigDecimal;
  interestSmallCap: BigDecimal;
  interestLargeCap: BigDecimal;

  // Total deposited for this product
  totalDeposited: BigDecimal;
  // Total borrowed for this product
  totalBorrowed: BigDecimal;
}

export type Product = PerpProduct | SpotProduct;
