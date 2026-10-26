import {
  getNadoClientTypeHeaders,
  subaccountToHex,
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { buildOtcSiweMessage } from './siweMessage';
import {
  OtcExecuteParams,
  OtcGetAuthNonceParams,
  OtcGetExecutionStatusParams,
  OtcGetReadyParams,
  OtcLoginParams,
  OtcReadyResult,
  OtcVerifyAuthParams,
} from './types/clientTypes';
import {
  OtcServerAuthNonce,
  OtcServerAuthSession,
  OtcServerExecutionResponse,
} from './types/serverTypes';

export interface OtcClientOpts {
  /**
   * OTC service origin, without a path, e.g. {@link OTC_CLIENT_ENDPOINTS}.
   */
  url: string;
  // Wallet client for the private quote login signature
  walletClient?: WalletClientWithAccount;
  // Linked signer registered through the engine, if provided, the login uses this signer
  linkedSignerWalletClient?: WalletClientWithAccount;
  // If provided, identifies the calling client, sent as a header with every request
  clientType?: string;
}

/**
 * Client for the public OTC service.
 *
 * {@link OtcClient.login} signs the private quote login with the linked signer, or the wallet
 * when there is none. {@link OtcClient.execute} does not sign. The caller supplies an
 * already-signed taker order. A quote is not required. {@link OtcClient.getExecutionStatus} only reads a deal; it does not
 * start or resume one.
 *
 * Responses are the JSON body as returned, including non-200 admission responses. Branch on
 * `status` and `recovery_action`.
 */
export class OtcClient {
  readonly opts: OtcClientOpts;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: OtcClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      withCredentials: false,
      validateStatus: () => true,
      headers: getNadoClientTypeHeaders(opts.clientType),
    });
  }

  /**
   * Sets the linked signer for the private quote login
   *
   * @param linkedSignerWalletClient The linkedSigner to use for all signatures. Set to null to revert to the chain signer
   */
  public setLinkedSigner(
    linkedSignerWalletClient: WalletClientWithAccount | null,
  ) {
    this.opts.linkedSignerWalletClient = linkedSignerWalletClient ?? undefined;
  }

  /**
   * Logs the wallet's subaccount in for private quotes: fetches a nonce, signs the SIWE text
   * with the linked signer (or the wallet) and verifies it. On success the browser holds the
   * session cookie; open a new quote socket afterwards, since a socket keeps the session it
   * had at its handshake. Throws on a non-200; the message carries the service's `error` code.
   */
  async login(params: OtcLoginParams): Promise<OtcServerAuthSession> {
    const { walletClient, linkedSignerWalletClient } = this.opts;
    if (!walletClient) {
      throw new WalletNotProvidedError();
    }
    const sender = subaccountToHex({
      subaccountOwner: walletClient.account.address,
      subaccountName: params.subaccountName,
    });
    const signer = linkedSignerWalletClient ?? walletClient;
    const nonce = await this.getAuthNonce({ sender });
    const message = buildOtcSiweMessage({
      domain: params.domain,
      uri: params.uri,
      chainId: params.chainId,
      address: signer.account.address,
      nonce: nonce.nonce,
      issuedAtMs: nonce.issued_at_ms,
      sender,
    });
    const signature = await signer.signMessage({ message });
    return this.verifyAuth({ message, signature });
  }

  /**
   * First step of {@link OtcClient.login}, for signing outside the client. Build the message
   * with `buildOtcSiweMessage`, sign it, and pass it to {@link OtcClient.verifyAuth} within
   * 60s. Throws on a non-200.
   */
  async getAuthNonce(
    params: OtcGetAuthNonceParams,
  ): Promise<OtcServerAuthNonce> {
    return this.postAuth('/v1/auth/nonce', { sender: params.sender });
  }

  /**
   * Last step of {@link OtcClient.login}, for signing outside the client. Throws on a non-200;
   * the message carries the service's `error` code.
   */
  async verifyAuth(params: OtcVerifyAuthParams): Promise<OtcServerAuthSession> {
    return this.postAuth('/v1/auth/verify', {
      message: params.message,
      signature: params.signature,
    });
  }

  /**
   * Submits a signed taker order. Send this body unchanged on `retry_same_request`.
   */
  async execute(params: OtcExecuteParams): Promise<OtcServerExecutionResponse> {
    return this.postExecution('/v1/executor', {
      deal_id: params.dealId,
      taker: params.taker,
      ...(params.pricerId ? { pricer_id: params.pricerId } : {}),
    });
  }

  /**
   * Reads one execution. Use it after a lost response, a refresh, or `wait`.
   */
  async getExecutionStatus(
    params: OtcGetExecutionStatusParams,
  ): Promise<OtcServerExecutionResponse> {
    return this.postExecution('/v1/executor/status', {
      deal_id: params.dealId,
      taker_digest: params.takerDigest,
    });
  }

  /**
   * Checks that quote and deal product scopes overlap for a route. An omitted `pricerId`
   * asks the service default. A direct execution needs a matching deal worker, not a prior quote.
   */
  async getReady(params: OtcGetReadyParams = {}): Promise<OtcReadyResult> {
    const response = await this.axiosInstance.get(`${this.opts.url}/ready`, {
      params: params.pricerId ? { pricer_id: params.pricerId } : undefined,
    });
    return {
      httpStatus: response.status,
      ready: response.status === 200,
    };
  }

  /** The login routes need credentials. */
  private async postAuth<T>(path: string, body: unknown): Promise<T> {
    const response = await this.axiosInstance.post(
      `${this.opts.url}${path}`,
      body,
      { withCredentials: true },
    );
    this.checkResponseStatus(response);
    return response.data as T;
  }

  private checkResponseStatus(response: AxiosResponse) {
    if (response.status !== 200 || !response.data) {
      throw Error(
        `Unexpected response from server: ${response.status} ${response.statusText}. Data: ${JSON.stringify(response.data)}`,
      );
    }
  }

  private async postExecution(
    path: string,
    body: unknown,
  ): Promise<OtcServerExecutionResponse> {
    const response = await this.axiosInstance.post(
      `${this.opts.url}${path}`,
      body,
    );
    return response.data as OtcServerExecutionResponse;
  }
}
