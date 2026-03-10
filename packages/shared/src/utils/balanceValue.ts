import BigNumber from 'bignumber.js';
import {
  PerpBalanceWithProduct,
  SpotBalanceWithProduct,
} from '../types/balanceTypes';

/**
 * Calculates the quote value of a spot balance, in terms of quote units
 *
 * @param balanceWithProduct
 */
export function calcSpotBalanceValue(
  balanceWithProduct: SpotBalanceWithProduct,
): BigNumber {
  return balanceWithProduct.amount.multipliedBy(balanceWithProduct.oraclePrice);
}

/**
 * Calculates the notional value of a perp balance, in terms of quote units
 *
 * @param balanceWithProduct
 */
export function calcPerpBalanceNotionalValue(
  balanceWithProduct: PerpBalanceWithProduct,
): BigNumber {
  return balanceWithProduct.amount
    .multipliedBy(balanceWithProduct.oraclePrice)
    .abs();
}

/**
 * Calculates the true quote value of a perp balance, which is the same as its unrealized pnl / unsettled quote, in terms of quote units
 *
 * @param balanceWithProduct
 */
export function calcPerpBalanceValue(
  balanceWithProduct: PerpBalanceWithProduct,
): BigNumber {
  return balanceWithProduct.amount
    .multipliedBy(balanceWithProduct.oraclePrice)
    .plus(balanceWithProduct.vQuoteBalance);
}
