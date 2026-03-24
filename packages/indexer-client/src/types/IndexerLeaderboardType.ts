/**
 * Leaderboard ranking metric.
 * - `pnl` ranks by absolute PnL value
 * - `roi` ranks by percentage ROI value
 * - `volume` ranks by trading volume
 * - `liquidation` ranks by liquidation count
 * - `balance` ranks by spot balance
 */
export type IndexerLeaderboardRankType =
  | 'pnl'
  | 'roi'
  | 'volume'
  | 'liquidation'
  | 'balance';
