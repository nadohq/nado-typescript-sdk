import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileSubmitTipParams,
} from '@nadohq/mobile-client';
import {
  approveDepositAllowance,
  depositCollateral,
  DepositCollateralParams,
  isWriteableContract,
  MOCK_ERC20_ABI,
  QUOTE_PRODUCT_ID,
  toBigInt,
  toBigNumber,
  WalletNotProvidedError,
} from '@nadohq/shared';
import { isAddress, zeroAddress } from 'viem';
import { BaseSpotAPI } from './BaseSpotAPI';
import { SendTipError } from './SendTipError';
import {
  SEND_TIP_VALIDATION_REASONS,
  SendTipValidationError,
} from './SendTipValidationError';
import {
  ApproveAllowanceParams,
  BurnNlpParams,
  MintMockERC20Params,
  MintNlpParams,
  SendTipParams,
  SendTipResult,
  TransferQuoteParams,
  TransferQuoteV2Params,
  WithdrawCollateralParams,
  WithdrawCollateralV2Params,
} from './types';

export class SpotExecuteAPI extends BaseSpotAPI {
  async deposit(params: DepositCollateralParams) {
    if (!isWriteableContract(this.context.contracts.endpoint)) {
      throw new WalletNotProvidedError();
    }

    return depositCollateral({
      endpoint: this.context.contracts.endpoint,
      subaccountName: params.subaccountName,
      productId: params.productId,
      amount: params.amount,
      referralCode: params.referralCode,
    });
  }

  async withdraw(params: WithdrawCollateralParams) {
    return this.context.engineClient.withdrawCollateral({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  /**
   * Withdraws collateral to a custom recipient address via the `withdraw_collateral_v2` execute,
   * charged a dynamic fee of at most the V1 withdrawal fee. The fee is priced at execution: if it
   * exceeds the optional `maxFeeX18`, the request fails with `FEE_TOO_LOW` (2135). Use
   * `getDynamicFeeQuote` for the current fee.
   *
   * When `sendTo` is the zero address, funds are sent to the subaccount owner. When `sendTo` is a
   * non-zero address, the transaction must be signed by the subaccount owner (linked signers are
   * not permitted).
   *
   * @param params
   */
  async withdrawV2(params: WithdrawCollateralV2Params) {
    return this.context.engineClient.withdrawCollateralV2({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  async approveAllowance(params: ApproveAllowanceParams) {
    const tokenContract = await this.getTokenContractForProduct(params);
    if (!isWriteableContract(tokenContract)) {
      throw new Error(
        'Token contract does not permit writes. Is a wallet client provided?',
      );
    }

    return approveDepositAllowance({
      amount: params.amount,
      endpoint: this.context.contracts.endpoint,
      tokenContract,
    });
  }

  /**
   * Transfers quote between subaccounts under the same wallet.
   *
   * @param params
   */
  async transferQuote(params: TransferQuoteParams) {
    return this.context.engineClient.transferQuote({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
      chainId: this.getWalletClientChainIdIfNeeded(params),
    });
  }

  /**
   * Transfers quote between subaccounts under the same wallet, charged a dynamic fee of at
   * most the V1 transfer fee. The fee is priced at execution: if it exceeds `maxFeeX18`, the
   * request fails with `FEE_TOO_LOW` (2135). Use `getDynamicFeeQuote` for the current fee.
   *
   * @param params
   */
  async transferQuoteV2(params: TransferQuoteV2Params) {
    return this.context.engineClient.transferQuoteV2({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
      chainId: this.getWalletClientChainIdIfNeeded(params),
    });
  }

  /**
   * Signs a net USDT0 withdrawal to the recipient's DDA and submits it through Mobile.
   * Every result retains a non-enumerable retryRequest, as does SendTipError after an uncertain result.
   * Replay it to reuse the original withdrawal with fresh outer authentication. For failed/FEE_TOO_LOW,
   * reconfirm the quoted fee explicitly before changing maxFeeX18 and passing the receipt's version
   * as expectedVersion. Signed requests must never be logged or persisted.
   * Never raise the confirmed fee cap automatically or create a fresh Tip after an uncertain submission.
   *
   * @throws {WalletNotProvidedError} If the owner wallet is unavailable.
   * @throws {SendTipValidationError} If the owner, signing context, native amount or recipient DDA is invalid.
   * @throws {Error} If DDA lookup or owner signing fails.
   * @throws {MobileServerFailureError} For a new Tip's known pre-admission rejection.
   * @throws {SendTipError} If Mobile submission fails and the signed request must remain available for retry.
   */
  async sendTip(
    params: SendTipParams | MobileSubmitTipParams,
  ): Promise<SendTipResult> {
    const isReplay = 'withdrawal' in params;
    const walletOwner = this.getWalletClientAddress();
    const subaccountOwner = this.getSubaccountOwnerIfNeeded(params);
    if (walletOwner.toLowerCase() !== subaccountOwner.toLowerCase()) {
      throw new SendTipValidationError(
        SEND_TIP_VALIDATION_REASONS.OWNER_WALLET_REQUIRED,
      );
    }
    const walletChainId = this.getWalletClientChainIdIfNeeded({});
    const endpointAddress = this.getEndpointAddress();
    const chainId = params.chainId ?? walletChainId;
    const verifyingAddr = params.verifyingAddr ?? endpointAddress;
    if (
      chainId !== walletChainId ||
      verifyingAddr.toLowerCase() !== endpointAddress.toLowerCase()
    ) {
      throw new SendTipValidationError(
        SEND_TIP_VALIDATION_REASONS.SIGNING_CONTEXT_MISMATCH,
      );
    }

    let request: MobileSubmitTipParams;
    if ('withdrawal' in params) {
      request = { ...params };
      // Mobile authentication expires independently of the signed Engine withdrawal.
      delete request.nonce;
    } else {
      const { amount, ...tipParams } = params;
      const nativeAmount = toBigNumber(amount);
      const isAmountValid =
        nativeAmount.isFinite() &&
        nativeAmount.isInteger() &&
        nativeAmount.isGreaterThan(0);
      if (!isAmountValid) {
        throw new SendTipValidationError(
          SEND_TIP_VALIDATION_REASONS.INVALID_AMOUNT,
        );
      }
      const { address } = await this.context.indexerClient.getSubaccountDDA({
        subaccount: params.recipientSubaccount,
      });
      if (!isAddress(address) || address === zeroAddress) {
        throw new SendTipValidationError(
          SEND_TIP_VALIDATION_REASONS.RECIPIENT_DDA_UNAVAILABLE,
        );
      }
      const { tx, signature } =
        await this.context.engineClient.payloadBuilder.buildWithdrawCollateralV2Payload(
          {
            subaccountOwner,
            subaccountName: params.subaccountName,
            productId: QUOTE_PRODUCT_ID,
            amount: nativeAmount,
            sendTo: address,
            appendix: 0,
            spotLeverage: false,
            maxFeeX18: params.maxFeeX18,
            chainId,
            verifyingAddr,
          },
        );
      request = {
        ...tipParams,
        subaccountOwner,
        chainId,
        verifyingAddr,
        withdrawal: tx,
        withdrawalSignature: signature,
      };
    }

    try {
      const receipt = await this.context.mobileClient.submitTip(request);
      return Object.defineProperty({ ...receipt }, 'retryRequest', {
        value: request,
        enumerable: false,
        writable: false,
        configurable: false,
      }) as SendTipResult;
    } catch (error) {
      const isKnownInitialRejection =
        !isReplay &&
        error instanceof MobileServerFailureError &&
        (error.errorCode === MOBILE_ERROR_CODES.INVALID_TIP_REQUEST ||
          error.errorCode === MOBILE_ERROR_CODES.INSUFFICIENT_TIP_BALANCE ||
          error.errorCode ===
            MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE);
      if (isKnownInitialRejection) {
        throw error;
      }
      throw new SendTipError(error, request);
    }
  }

  async mintNlp(params: MintNlpParams) {
    return this.context.engineClient.mintNlp({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  async burnNlp(params: BurnNlpParams) {
    return this.context.engineClient.burnNlp({
      ...params,
      subaccountOwner: this.getSubaccountOwnerIfNeeded(params),
      chainId: this.getWalletClientChainIdIfNeeded(params),
      verifyingAddr: params.verifyingAddr ?? this.getEndpointAddress(),
    });
  }

  async _mintMockERC20(params: MintMockERC20Params) {
    if (!this.context.walletClient) {
      throw new WalletNotProvidedError();
    }

    const config = await this.context.contracts.spotEngine.read.getConfig([
      params.productId,
    ]);

    return this.context.walletClient.writeContract({
      abi: MOCK_ERC20_ABI,
      address: config.token,
      functionName: 'mint',
      args: [this.getWalletClientAddress(), toBigInt(params.amount)],
    });
  }
}
