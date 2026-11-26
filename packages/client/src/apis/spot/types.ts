import {
  EngineBurnNlpParams,
  EngineMintNlpParams,
  EngineTransferQuoteParams,
  EngineTransferQuoteV2Params,
  EngineWithdrawCollateralParams,
  EngineWithdrawCollateralV2Params,
} from '@nadohq/engine-client';
import { MobileSubmitTipParams } from '@nadohq/mobile-client';
import { BigNumberish } from '@nadohq/shared';
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
  amount: BigNumberish;
};

export type GetTokenWalletBalanceParams = TokenQueryParams;

export type GetTokenAllowanceParams = TokenQueryParams;

export type WithdrawCollateralParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineWithdrawCollateralParams>
>;

export type WithdrawCollateralV2Params = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineWithdrawCollateralV2Params>
>;

export type TransferQuoteParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineTransferQuoteParams>
>;

/** Params for {@link SpotExecuteAPI.transferQuoteV2}: a quote transfer charged a dynamic fee. */
export type TransferQuoteV2Params = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineTransferQuoteV2Params>
>;

/** Fresh Tip inputs; replay a SendTipError.retryRequest instead after an uncertain submission. */
export type SendTipParams = OptionalSignatureParams<
  OptionalSubaccountOwner<
    Omit<
      MobileSubmitTipParams,
      'withdrawal' | 'withdrawalSignature' | 'nonce' | 'expectedVersion'
    >
  >
> & {
  /** Net recipient amount in native USDT0 units (six decimals), excluding the separately approved fee. */
  amount: BigNumberish;
};

export type MintNlpParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineMintNlpParams>
>;

export type BurnNlpParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineBurnNlpParams>
>;

export interface MintMockERC20Params {
  productId: number;
  amount: BigNumberish;
}
