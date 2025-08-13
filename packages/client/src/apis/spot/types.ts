import {
  EngineBurnVlpParams,
  EngineMintVlpParams,
  EngineTransferQuoteParams,
  EngineWithdrawCollateralParams,
} from '@nadohq/engine-client';
import { BigDecimalish } from '@nadohq/utils';
import { OptionalSignatureParams, OptionalSubaccountOwner } from '../types';

export type ProductIdOrTokenAddress =
  | {
      productId: number;
    }
  | {
      tokenAddress: string;
    };

type TokenQueryParams = {
  address: string;
} & ProductIdOrTokenAddress;

export type ApproveAllowanceParams = ProductIdOrTokenAddress & {
  amount: BigDecimalish;
};

export type GetTokenWalletBalanceParams = TokenQueryParams;

export type GetTokenAllowanceParams = TokenQueryParams;

export type WithdrawCollateralParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineWithdrawCollateralParams>
>;

export type TransferQuoteParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineTransferQuoteParams>
>;

export type MintVlpParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineMintVlpParams>
>;

export type BurnVlpParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineBurnVlpParams>
>;

export interface MintMockERC20Params {
  productId: number;
  amount: BigDecimalish;
}
