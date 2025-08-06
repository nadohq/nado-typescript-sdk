import { BigDecimalish } from '@nadohq/utils';
import { Bytes } from './bytes';

export interface MintMockERC20Params {
  productId: number;
  amount: BigDecimalish;
}

export interface SettlePnlParams {
  subaccounts: Bytes[];
  productIds: number[];
}
