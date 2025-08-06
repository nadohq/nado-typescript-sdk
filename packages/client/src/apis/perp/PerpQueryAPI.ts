import {
  GetIndexerMultiProductPerpPricesParams,
  GetIndexerPerpPricesParams,
} from '@nadohq/indexer-client';
import { BaseNadoAPI } from '../base';

export class PerpQueryAPI extends BaseNadoAPI {
  /**
   * Gets the latest index & mark price for a perp product
   * @param params
   */
  async getPerpPrices(params: GetIndexerPerpPricesParams) {
    return this.context.indexerClient.getPerpPrices(params);
  }

  /**
   * Gets the latest index & mark price for multiple perp products
   * @param params
   */
  async getMultiProductPerpPrices(
    params: GetIndexerMultiProductPerpPricesParams,
  ) {
    return this.context.indexerClient.getMultiProductPerpPrices(params);
  }
}
