import {
  PerpProduct,
  Product,
  ProductEngineType,
  SpotProduct,
} from './productTypes';
import { BigDecimal } from '@nadohq/utils';

/**
 * Shared properties of a market
 */
export interface Market {
  productId: number;
  type: ProductEngineType;
  product: Product;
  // Minimum order size to be placed on the book (i.e. not an IOC order)
  minSize: BigDecimal;
  // Price increment for the orderbook, order prices must be placed at multiples of this increment
  priceIncrement: BigDecimal;
  // Size increment for the orderbook, order sizes must be placed at multiples of this increment
  sizeIncrement: BigDecimal;
}

/**
 * Perp market with perp product info
 */
export interface PerpMarket extends Market {
  type: ProductEngineType.PERP;
  product: PerpProduct;
}

/**
 * Spot market with spot product info
 */
export interface SpotMarket extends Market {
  type: ProductEngineType.SPOT;
  product: SpotProduct;
}

export type MarketWithProduct = PerpMarket | SpotMarket;
