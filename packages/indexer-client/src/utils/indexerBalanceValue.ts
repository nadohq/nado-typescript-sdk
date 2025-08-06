import { BigDecimal } from '@nadohq/utils';
import { IndexerPerpBalance, IndexerSpotBalance } from '../types';

/**
 * Most of these calculations take oraclePrice as a separate parameter. This allows us to not rely on the Snapshot
 * interfaces to give clients the optionality to pass either the pre or post balance
 */

/**
 * Calculates the quote value of an indexer spot balance
 *
 * @param balance
 * @param oraclePrice
 */
export function calcIndexerSpotBalanceValue(
  balance: IndexerSpotBalance,
  oraclePrice: BigDecimal,
): BigDecimal {
  return balance.amount.multipliedBy(oraclePrice);
}

/**
 * Calculates the notional value of an indexer perp balance
 *
 * @param balance
 * @param oraclePrice
 */
export function calcIndexerPerpBalanceNotionalValue(
  balance: IndexerPerpBalance,
  oraclePrice: BigDecimal,
): BigDecimal {
  return balance.amount.multipliedBy(oraclePrice).abs();
}

/**
 * Calculates the true quote value of a indexer perp balance, which is the same as its unrealized pnl / unsettled quote
 *
 * @param balance
 * @param oraclePrice
 */
export function calcIndexerPerpBalanceValue(
  balance: IndexerPerpBalance,
  oraclePrice: BigDecimal,
): BigDecimal {
  return balance.amount.multipliedBy(oraclePrice).plus(balance.vQuoteBalance);
}
