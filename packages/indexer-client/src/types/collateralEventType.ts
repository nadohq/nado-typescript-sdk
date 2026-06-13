import { IndexerEventType } from './IndexerEventType';

export type CollateralEventType = Extract<
  IndexerEventType,
  | 'deposit_collateral'
  | 'withdraw_collateral'
  | 'withdraw_collateral_v2'
  | 'transfer_quote'
>;
