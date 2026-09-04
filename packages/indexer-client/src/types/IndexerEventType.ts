/**
 * All balance-change event types emitted by the indexer. This is also the set of
 * transaction types that can open/close a position (`openReason` / `closeReason`).
 */
export const INDEXER_EVENT_TYPES = [
  'liquidate_subaccount',
  'deposit_collateral',
  'withdraw_collateral',
  'withdraw_collateral_v2',
  'settle_pnl',
  'match_orders',
  'transfer_quote',
  'mint_nlp',
  'burn_nlp',
  'claim_builder_fee',
  'delist_product',
] as const;

export type IndexerEventType = (typeof INDEXER_EVENT_TYPES)[number];
