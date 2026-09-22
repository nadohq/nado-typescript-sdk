import { getNadoClientTypeHeaders } from '@nadohq/shared';
import axios, { AxiosInstance } from 'axios';
import {
  OtcExecuteParams,
  OtcGetExecutionStatusParams,
  OtcGetReadyParams,
  OtcReadyResult,
} from './types/clientTypes';
import { OtcServerExecutionResponse } from './types/serverTypes';

export interface OtcClientOpts {
  /**
   * OTC service origin, without a path, e.g. {@link OTC_CLIENT_ENDPOINTS}.
   */
  url: string;
  // If provided, identifies the calling client, sent as a header with every request
  clientType?: string;
}

/**
 * Client for the public OTC service.
 *
 * {@link OtcClient.execute} does not sign. The caller supplies an already-signed taker order.
 * A quote is not required. {@link OtcClient.getExecutionStatus} only reads a deal; it does not
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
