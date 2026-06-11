import {
  getSignedTransactionRequest,
  SignableRequestType,
  SignableRequestTypeToParams,
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  EngineServerCachedQueryRequestByType,
  EngineServerCachedQueryRequestType,
  EngineServerCachedQueryResponse,
  EngineServerCachedQueryResponseByType,
  EngineServerCachedQuerySuccessResponse,
  EngineServerEdgeControlRequestByType,
  EngineServerEdgeControlRequestType,
  EngineServerEdgeControlResponseByType,
  EngineServerExecuteRequestByType,
  EngineServerExecuteRequestType,
  EngineServerExecuteResult,
  EngineServerExecuteSuccessResult,
  EngineServerQueryRequestByType,
  EngineServerQueryRequestType,
  EngineServerQueryResponse,
  EngineServerQueryResponseByType,
  EngineServerQuerySuccessResponse,
  GetEngineNoncesParams,
  GetEngineNoncesResponse,
} from './types';
import { EngineServerFailureError } from './types/EngineServerFailureError';

export interface EngineClientOpts {
  // Server URL
  url: string;
  // Wallet client for EIP712 signing
  walletClient?: WalletClientWithAccount;
  // Linked signer registered through the engine, if provided, execute requests will use this signer
  linkedSignerWalletClient?: WalletClientWithAccount;
}

// Only 1 key can be defined per execute request
type EngineExecuteRequestBody = Partial<EngineServerExecuteRequestByType>;

type EngineQueryRequestResponse<
  T extends EngineServerQueryRequestType = EngineServerQueryRequestType,
> = EngineServerQueryResponse<T>;

type EngineCachedQueryRequestResponse<
  T extends EngineServerCachedQueryRequestType =
    EngineServerCachedQueryRequestType,
> = EngineServerCachedQueryResponse<T>;

/**
 * Base client for all engine requests
 */
export class EngineBaseClient {
  readonly opts: EngineClientOpts;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: EngineClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      withCredentials: true,
      // We have custom logic to validate response status and create an appropriate error
      validateStatus: () => true,
    });
  }

  /**
   * Sets the linked signer for execute requests
   *
   * @param linkedSignerWalletClient The linkedSigner to use for all signatures. Set to null to revert to the chain signer
   */
  public setLinkedSigner(
    linkedSignerWalletClient: WalletClientWithAccount | null,
  ) {
    this.opts.linkedSignerWalletClient = linkedSignerWalletClient ?? undefined;
  }

  public async getTxNonce(address?: string): Promise<string> {
    const addr = address ?? this.opts.walletClient?.account.address;

    if (!addr) {
      throw new WalletNotProvidedError();
    }

    return (
      await this.getNonces({
        address: addr,
      })
    ).txNonce;
  }

  public async getNonces(
    params: GetEngineNoncesParams,
  ): Promise<GetEngineNoncesResponse> {
    const baseResp = await this.query('nonces', params);

    return {
      orderNonce: baseResp.order_nonce,
      txNonce: baseResp.tx_nonce,
    };
  }

  /**
   * Queries the engine, all query params are stringified into the query string
   *
   * @param requestType
   * @param params
   * @public
   */
  public async query<TRequestType extends EngineServerQueryRequestType>(
    requestType: TRequestType,
    params: EngineServerQueryRequestByType[TRequestType],
  ): Promise<EngineServerQueryResponseByType[TRequestType]> {
    const request = this.getQueryRequest(requestType, params);
    const response = await this.axiosInstance.post<EngineQueryRequestResponse>(
      `${this.opts.url}/query`,
      request,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus throws on failure responses so the cast to the success response is acceptable here
    const successResponse = response as AxiosResponse<
      EngineServerQuerySuccessResponse<TRequestType>
    >;

    return successResponse.data.data;
  }

  /**
   * Queries the gateway's in-memory cache via the `/edge/query` endpoint. Lower latency than
   * {@link query} at the cost of eventual consistency — do not use for order, margin, or
   * settlement decisions.
   *
   * @param requestType
   * @param params
   * @public
   */
  public async edgeQuery<
    TRequestType extends EngineServerCachedQueryRequestType,
  >(
    requestType: TRequestType,
    params: EngineServerCachedQueryRequestByType[TRequestType],
  ): Promise<EngineServerCachedQueryResponseByType[TRequestType]> {
    const request = this.getQueryRequest(requestType, params);
    const response =
      await this.axiosInstance.post<EngineCachedQueryRequestResponse>(
        `${this.opts.url}/edge/query`,
        request,
      );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus throws on failure responses so the cast to the success response is acceptable here
    const successResponse = response as AxiosResponse<
      EngineServerCachedQuerySuccessResponse<TRequestType>
    >;

    return successResponse.data.data;
  }

  /**
   * Sends an edge control message (`ping` / `time`) via the `/edge/query` endpoint. These
   * return immediately from the server clock and use a different envelope than the cached data
   * queries (no `data` field), so the whole response body is returned.
   *
   * @param requestType
   * @param params
   * @public
   */
  public async edgeControlQuery<
    TRequestType extends EngineServerEdgeControlRequestType,
  >(
    requestType: TRequestType,
    params: EngineServerEdgeControlRequestByType[TRequestType],
  ): Promise<EngineServerEdgeControlResponseByType[TRequestType]> {
    const request = this.getQueryRequest(requestType, params);
    const response = await this.axiosInstance.post<
      EngineServerEdgeControlResponseByType[TRequestType]
    >(`${this.opts.url}/edge/query`, request);

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    return response.data;
  }

  /**
   * POSTs an execute message to the engine and returns the successful response. Throws the failure response wrapped
   * in an EngineServerFailureError on failure.
   *
   * @param requestType
   * @param params
   * @public
   */
  public async execute<TRequestType extends EngineServerExecuteRequestType>(
    requestType: TRequestType,
    params: EngineServerExecuteRequestByType[TRequestType],
  ): Promise<EngineServerExecuteSuccessResult<TRequestType>> {
    const reqBody = this.getExecuteRequest(requestType, params);
    const response = await this.axiosInstance.post<
      EngineServerExecuteResult<TRequestType>
    >(`${this.opts.url}/execute`, reqBody);

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus catches the failure result and throws the error, so the cast to the success response is acceptable here
    return response.data as EngineServerExecuteSuccessResult<TRequestType>;
  }

  /**
   * A simple, typechecked fn for constructing a `type`-tagged request body in the format expected
   * by the server. Generic over the request type / params pair so it can build live query, edge
   * (cached) query, and edge control request bodies alike.
   *
   * @param requestType
   * @param params
   */
  public getQueryRequest<TRequestType extends string, TParams extends object>(
    requestType: TRequestType,
    params: TParams,
  ): { type: TRequestType } & TParams {
    return {
      type: requestType,
      ...params,
    };
  }

  /**
   * A simple, typechecked fn for constructing an execute request in the format expected by the server.
   *
   * @param requestType
   * @param params
   */
  public getExecuteRequest<TRequestType extends EngineServerExecuteRequestType>(
    requestType: TRequestType,
    params: EngineServerExecuteRequestByType[TRequestType],
  ): EngineExecuteRequestBody {
    return {
      [requestType]: params,
    };
  }

  /**
   * Signs a given request with the signer provided to the engine
   *
   * @param requestType
   * @param verifyingContract
   * @param chainId
   * @param params
   * @public
   */
  public async sign<T extends SignableRequestType>(
    requestType: T,
    verifyingContract: string,
    chainId: number,
    params: SignableRequestTypeToParams[T],
  ) {
    // Use the linked signer if provided, otherwise use the default signer provided to the engine
    const walletClient =
      this.opts.linkedSignerWalletClient ?? this.opts.walletClient;

    if (!walletClient) {
      throw new WalletNotProvidedError();
    }

    return getSignedTransactionRequest({
      chainId,
      requestParams: params,
      requestType,
      walletClient,
      verifyingContract,
    });
  }

  private checkResponseStatus(response: AxiosResponse) {
    if (response.status !== 200 || !response.data) {
      throw Error(
        `Unexpected response from server: ${response.status} ${response.statusText}. Data: ${response.data}`,
      );
    }
  }

  private checkServerStatus(
    response: AxiosResponse<
      | EngineServerExecuteResult
      | EngineQueryRequestResponse
      | EngineCachedQueryRequestResponse
      | EngineServerEdgeControlResponseByType[EngineServerEdgeControlRequestType]
    >,
  ) {
    if (response.data.status !== 'success') {
      throw new EngineServerFailureError(response.data);
    }
  }
}
