import { getNadoClientTypeHeaders } from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { mapNuanzeMarketsResponse } from './dataMappers';
import {
  GetNuanzeMarketsParams,
  GetNuanzeMarketsResponse,
} from './types/clientTypes';
import { NuanzeServerFailureError } from './types/NuanzeServerFailureError';
import {
  isNuanzeServerFailureResponse,
  NuanzeServerMarketsResponse,
} from './types/serverQueryTypes';

/**
 * Options for constructing a {@link NuanzeClient}.
 */
export interface NuanzeClientOpts {
  /**
   * Base URL of the Nuanze API, including the version segment, e.g. {@link NUANZE_CLIENT_ENDPOINTS}.
   */
  url: string;
  /**
   * If provided, identifies the calling client, sent as a header with every request.
   */
  clientType?: string;
}

/**
 * Client for the Nuanze public analytics API: markets, wallets, trades, candles, collateral flows,
 * and positioning.
 *
 * Read-only and credential-free, so unlike the other service clients it takes no wallet client or
 * linked signer. The API meters a weighted token bucket per client IP and reports its state in the
 * `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` response headers; add an
 * interceptor on {@link axiosInstance} to observe them.
 */
export class NuanzeClient {
  readonly opts: NuanzeClientOpts;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: NuanzeClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      // Nuanze is public and answers every origin with `Access-Control-Allow-Origin: *`, which
      // browsers reject for credentialed requests.
      withCredentials: false,
      // We have custom logic to validate response status and create an appropriate error
      validateStatus: () => true,
      headers: getNadoClientTypeHeaders(opts.clientType),
    });
  }

  /**
   * Gets the active market universe, ordered by `productId` ascending. Never truncated, so `count`
   * always equals the length of `markets`. Market metadata refreshes about every five minutes and
   * prices about every minute.
   *
   * @throws {NuanzeServerFailureError} With error code `BAD_REQUEST` if a filter value is not a
   * documented venue or tradability state.
   */
  async getMarkets(
    params: GetNuanzeMarketsParams = {},
  ): Promise<GetNuanzeMarketsResponse> {
    const response = await this.axiosInstance.get<NuanzeServerMarketsResponse>(
      `${this.opts.url}/markets`,
      { params },
    );

    this.checkResponseStatus(response);

    return mapNuanzeMarketsResponse(response.data);
  }

  /**
   * Validates the HTTP status before interpreting the body. Nuanze maps every domain failure onto a
   * non-2xx status carrying a failure envelope, so anything else is a transport-level error.
   */
  private checkResponseStatus(response: AxiosResponse<unknown>) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }
    if (isNuanzeServerFailureResponse(response.data)) {
      throw new NuanzeServerFailureError(response.data, response.status);
    }
    throw new Error(
      `Unexpected response from Nuanze: ${response.status} ${response.statusText}. Data: ${JSON.stringify(response.data)}`,
    );
  }
}
