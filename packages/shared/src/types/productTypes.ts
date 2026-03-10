import BigNumber from 'bignumber.js';

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
  oraclePrice: BigNumber;
  // Weight used to calculate initial health for a long position
  longWeightInitial: BigNumber;
  // Weight used to calculate initial health for a short position
  shortWeightInitial: BigNumber;
  // Weight used to calculate maint. health for a long position
  longWeightMaintenance: BigNumber;
  // Weight used to calculate maint. health for a short position
  shortWeightMaintenance: BigNumber;
}

/**
 * Represents a product stored in PerpEngine
 */
export interface PerpProduct extends BaseProduct {
  type: ProductEngineType.PERP;
  // Current open interest
  openInterest: BigNumber;
  cumulativeFundingLong: BigNumber;
  cumulativeFundingShort: BigNumber;
}

/**
 * Represents a product stored in SpotEngine.
 *
 * @see {@link calcBorrowRatePerSecond} for more details on the calculation and interest parameters
 */
export interface SpotProduct extends BaseProduct {
  type: ProductEngineType.SPOT;
  tokenAddr: string;
  interestFloor: BigNumber;
  interestInflectionUtil: BigNumber;
  interestSmallCap: BigNumber;
  interestLargeCap: BigNumber;
  minDepositRate: BigNumber;

  // Total deposited for this product
  totalDeposited: BigNumber;
  // Total borrowed for this product
  totalBorrowed: BigNumber;
}

export type Product = PerpProduct | SpotProduct;
