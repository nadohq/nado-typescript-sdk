import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileSubmitTipParams,
  MobileSubmitTipResult,
} from '@nadohq/mobile-client';
import {
  approveDepositAllowance,
  depositCollateral,
  DepositCollateralParams,
  getValidatedAddress,
  isWriteableContract,
  MOCK_ERC20_ABI,
  QUOTE_PRODUCT_ID,
  toBigInt,
  toBigNumber,
  WalletNotProvidedError,
} from '@nadohq/shared';
import { zeroAddress } from 'viem';
import { BaseSpotAPI } from './BaseSpotAPI';
import { SendTipError } from './SendTipError';
import {
  ApproveAllowanceParams,
  BurnNlpParams,
  MintMockERC20Params,
  MintNlpParams,
  SendTipParams,
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
   * After SendTipError, pass its retryRequest to replay the same authorization with fresh outer authentication.
   * Never raise the confirmed fee cap automatically or create a fresh Tip after an uncertain submission.
   *
   * @throws {WalletNotProvidedError} If the owner wallet is unavailable.
   * @throws {Error} If sender context, native amount, DDA lookup or owner signing is invalid or fails.
   * @throws {MobileServerFailureError} For a new Tip's known pre-admission rejection.
   * @throws {SendTipError} If Mobile submission fails and the signed request must remain available for retry.
   */
  async sendTip(
    params: SendTipParams | MobileSubmitTipParams,
  ): Promise<MobileSubmitTipResult> {
    const isReplay = 'withdrawal' in params;
    const walletOwner = this.getWalletClientAddress();
    const subaccountOwner = this.getSubaccountOwnerIfNeeded(params);
    if (walletOwner.toLowerCase() !== subaccountOwner.toLowerCase()) {
      throw new Error("Connect the Tip sender's owner wallet.");
    }
    if (
      isReplay &&
      (params.chainId !== this.getWalletClientChainIdIfNeeded({}) ||
        params.verifyingAddr.toLowerCase() !==
          this.getEndpointAddress().toLowerCase())
    ) {
      throw new Error(
        'Switch to the original Tip chain and endpoint to retry.',
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
        throw new Error(
          'Tip amount must be a positive integer in native token units.',
        );
      }
      const chainId = this.getWalletClientChainIdIfNeeded(params);
      const verifyingAddr = params.verifyingAddr ?? this.getEndpointAddress();
      const { address } = await this.context.indexerClient.getSubaccountDDA({
        subaccount: params.recipientSubaccount,
      });
      const recipientDda = getValidatedAddress(address);
      if (recipientDda === zeroAddress) {
        throw new Error('The Tip recipient deposit address is unavailable.');
      }
      const { tx, signature } =
        await this.context.engineClient.payloadBuilder.buildWithdrawCollateralV2Payload(
          {
            subaccountOwner,
            subaccountName: params.subaccountName,
            productId: QUOTE_PRODUCT_ID,
            amount: nativeAmount,
            sendTo: recipientDda,
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
      return await this.context.mobileClient.submitTip(request);
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
