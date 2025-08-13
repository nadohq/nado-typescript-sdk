import {
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712ListTriggerOrdersParams,
  EIP712OrderParams,
  getDefaultRecvTime,
  getNadoEIP712Values,
  getOrderNonce,
  getSignedTransactionRequest,
  SignableRequestType,
  SignableRequestTypeToParams,
  WalletClientWithAccount,
} from '@nadohq/contracts';
import { toIntegerString, WalletNotProvidedError } from '@nadohq/utils';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { mapServerOrderInfo, mapTriggerCriteria } from './dataMappers';
import {
  TriggerCancelOrdersParams,
  TriggerCancelProductOrdersParams,
  TriggerListOrdersParams,
  TriggerListOrdersResponse,
  TriggerOrderInfo,
  TriggerPlaceOrderParams,
  TriggerServerExecuteRequestByType,
  TriggerServerExecuteRequestType,
  TriggerServerExecuteResult,
  TriggerServerExecuteSuccessResult,
  TriggerServerQueryRequestByType,
  TriggerServerQueryRequestType,
  TriggerServerQueryResponse,
  TriggerServerQueryResponseByType,
  TriggerServerQuerySuccessResponse,
} from './types';
import { TriggerServerFailureError } from './types/TriggerServerFailureError';

export interface TriggerClientOpts {
  // Server URL
  url: string;
  // Wallet client for EIP712 signing
  walletClient?: WalletClientWithAccount;
  // Linked signer registered through the engine, if provided, execute requests will use this signer
  linkedSignerWalletClient?: WalletClientWithAccount;
}

/**
 * Client for all trigger service requests
 */
export class TriggerClient {
  readonly opts: TriggerClientOpts;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: TriggerClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({ withCredentials: true });
  }

  /**
   * Sets the linked signer for requests
   *
   * @param linkedSignerWalletClient The linkedSigner to use for all signatures. Set to null to revert to the chain signer
   */
  public setLinkedSigner(
    linkedSignerWalletClient: WalletClientWithAccount | null,
  ) {
    this.opts.linkedSignerWalletClient = linkedSignerWalletClient ?? undefined;
  }

  /*
  Executes
   */

  async placeTriggerOrder(params: TriggerPlaceOrderParams) {
    const orderParams: EIP712OrderParams = {
      amount: params.order.amount,
      expiration: params.order.expiration,
      price: params.order.price,
      subaccountName: params.order.subaccountName,
      subaccountOwner: params.order.subaccountOwner,
      nonce: params.nonce ?? getOrderNonce(),
      appendix: params.order.appendix,
    };
    const signature = await this.sign(
      'place_order',
      params.verifyingAddr,
      params.chainId,
      orderParams,
    );

    const executeParams: TriggerServerExecuteRequestByType['place_order'] = {
      id: params.id ?? null,
      order: getNadoEIP712Values('place_order', orderParams),
      trigger: mapTriggerCriteria(params.triggerCriteria),
      signature,
      product_id: params.productId,
      spot_leverage: params.spotLeverage ?? null,
      digest: params.digest ?? null,
    };

    return this.execute('place_order', executeParams);
  }

  async cancelTriggerOrders(params: TriggerCancelOrdersParams) {
    const cancelOrdersParams: EIP712CancelOrdersParams = {
      digests: params.digests,
      nonce: params.nonce ?? getOrderNonce(),
      productIds: params.productIds,
      subaccountName: params.subaccountName,
      subaccountOwner: params.subaccountOwner,
    };
    const tx = getNadoEIP712Values('cancel_orders', cancelOrdersParams);

    const executeParams: TriggerServerExecuteRequestByType['cancel_orders'] = {
      signature: await this.sign(
        'cancel_orders',
        params.verifyingAddr,
        params.chainId,
        cancelOrdersParams,
      ),
      tx,
    };

    return this.execute('cancel_orders', executeParams);
  }

  async cancelProductOrders(params: TriggerCancelProductOrdersParams) {
    const cancelProductOrdersParams: EIP712CancelProductOrdersParams = {
      nonce: params.nonce ?? getOrderNonce(),
      productIds: params.productIds,
      subaccountName: params.subaccountName,
      subaccountOwner: params.subaccountOwner,
    };
    const tx = getNadoEIP712Values(
      'cancel_product_orders',
      cancelProductOrdersParams,
    );

    const executeParams: TriggerServerExecuteRequestByType['cancel_product_orders'] =
      {
        signature: await this.sign(
          'cancel_product_orders',
          params.verifyingAddr,
          params.chainId,
          cancelProductOrdersParams,
        ),
        tx,
      };

    return this.execute('cancel_product_orders', executeParams);
  }

  /*
  Queries
   */
  async listOrders(
    params: TriggerListOrdersParams,
  ): Promise<TriggerListOrdersResponse> {
    const signatureParams: EIP712ListTriggerOrdersParams = {
      // Default to 90 seconds from now if no recvTime is provided
      recvTime: toIntegerString(params.recvTime ?? getDefaultRecvTime()),
      subaccountName: params.subaccountName,
      subaccountOwner: params.subaccountOwner,
    };

    const tx = getNadoEIP712Values('list_trigger_orders', signatureParams);
    const signature = await this.sign(
      'list_trigger_orders',
      params.verifyingAddr,
      params.chainId,
      signatureParams,
    );

    const queryParams: TriggerServerQueryRequestByType['list_trigger_orders'] =
      {
        limit: params.limit,
        max_update_time: params.maxUpdateTimeInclusive,
        pending: params.pending,
        product_id: params.productId,
        digests: params.digests,
        signature,
        tx,
      };

    const baseResponse = await this.query('list_trigger_orders', queryParams);

    const orders: TriggerOrderInfo[] =
      baseResponse.orders.map(mapServerOrderInfo);

    return {
      orders,
    };
  }

  /*
  Base Fns
   */
  protected async sign<T extends SignableRequestType>(
    requestType: T,
    verifyingContract: string,
    chainId: number,
    params: SignableRequestTypeToParams[T],
  ) {
    // Use the linked signer if provided, otherwise use the default signer provided to the engine
    const walletClient =
      this.opts.linkedSignerWalletClient ?? this.opts.walletClient;

    if (walletClient == null) {
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

  /**
   * POSTs an execute message to the trigger service and returns the successful response. Throws the failure response wrapped
   * in an TriggerServerFailureError on failure.
   *
   * @param requestType
   * @param params
   */
  protected async execute<TRequestType extends TriggerServerExecuteRequestType>(
    requestType: TRequestType,
    params: TriggerServerExecuteRequestByType[TRequestType],
  ): Promise<TriggerServerExecuteSuccessResult<TRequestType>> {
    const reqBody = {
      [requestType]: params,
    };
    const response = await this.axiosInstance.post<
      TriggerServerExecuteResult<TRequestType>
    >(`${this.opts.url}/execute`, reqBody);

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus catches the failure result and throws the error, so the cast to the success response is acceptable here
    return response.data as TriggerServerExecuteSuccessResult<TRequestType>;
  }

  protected async query<TRequestType extends TriggerServerQueryRequestType>(
    requestType: TRequestType,
    params: TriggerServerQueryRequestByType[TRequestType],
  ): Promise<TriggerServerQueryResponseByType[TRequestType]> {
    const reqBody = {
      type: requestType,
      ...params,
    };
    const response = await this.axiosInstance.post<
      TriggerServerQueryResponse<TRequestType>
    >(`${this.opts.url}/query`, reqBody);

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus throws on failure responses so the cast to the success response is acceptable here
    const successResponse = response as AxiosResponse<
      TriggerServerQuerySuccessResponse<TRequestType>
    >;

    return successResponse.data.data;
  }

  private checkResponseStatus(response: AxiosResponse) {
    if (response.status !== 200 || !response.data) {
      throw Error(
        `Unexpected response from server: ${response.status} ${response.statusText}`,
      );
    }
  }

  private checkServerStatus(
    response: AxiosResponse<
      TriggerServerExecuteResult | TriggerServerQueryResponse
    >,
  ) {
    if (response.data.status !== 'success') {
      throw new TriggerServerFailureError(response.data);
    }
  }
}
