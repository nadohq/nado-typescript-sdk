import { Balance, PerpBalance, SpotBalance } from '../types/balanceTypes';
import {
  ProductEngineType,
  PerpProduct,
  SpotProduct,
  Product,
} from '../types/productTypes';

export function isSpotProduct(product: Product): product is SpotProduct {
  return product.type === ProductEngineType.SPOT;
}

export function isSpotBalance(balance: Balance): balance is SpotBalance {
  return balance.type === ProductEngineType.SPOT;
}

export function isPerpProduct(product: Product): product is PerpProduct {
  return product.type === ProductEngineType.PERP;
}

export function isPerpBalance(balance: Balance): balance is PerpBalance {
  return balance.type === ProductEngineType.PERP;
}
