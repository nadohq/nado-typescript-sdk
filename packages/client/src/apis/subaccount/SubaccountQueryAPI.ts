import {
  GetEngineEstimatedSubaccountSummaryParams,
  GetEngineIsolatedPositionsParams,
  GetEngineOrderSignersParams,
  GetEngineSubaccountFeeRatesParams,
  GetEngineSubaccountSummaryParams,
} from '@nadohq/engine-client';
import {
  GetIndexerLinkedSignerParams,
  GetIndexerOrderSignerEventsParams,
  GetIndexerOrderSignerRateLimitParams,
  GetIndexerReferralCodeParams,
} from '@nadohq/indexer-client';
import { BaseNadoAPI } from '../base';

export class SubaccountQueryAPI extends BaseNadoAPI {
  /**
   * Gets the subaccount state according to the offchain engine
   * @param params
   */
  async getSubaccountSummary(params: GetEngineSubaccountSummaryParams) {
    return this.context.engineClient.getSubaccountSummary(params);
  }

  /**
   * Gets the estimated subaccount state from offchain engine after a series of proposed txs
   * @param params
   */
  async getEngineEstimatedSubaccountSummary(
    params: GetEngineEstimatedSubaccountSummaryParams,
  ) {
    return this.context.engineClient.getEstimatedSubaccountSummary(params);
  }

  /**
   * Gets the isolated positions for a subaccount
   * @param params
   */
  async getIsolatedPositions(params: GetEngineIsolatedPositionsParams) {
    return this.context.engineClient.getIsolatedPositions(params);
  }

  /**
   * Queries engine to get subaccount fee rates
   * @param params
   */
  async getSubaccountFeeRates(params: GetEngineSubaccountFeeRatesParams) {
    return this.context.engineClient.getSubaccountFeeRates(params);
  }

  /**
   * Retrieves the current signer and link signer rate limit from the indexer
   * @param params
   */
  async getSubaccountLinkedSignerWithRateLimit(
    params: GetIndexerLinkedSignerParams,
  ) {
    return this.context.indexerClient.getLinkedSignerWithRateLimit(params);
  }

  /**
   * Retrieves the live order signers for a subaccount from the engine
   * @param params
   */
  async getSubaccountOrderSigners(params: GetEngineOrderSignersParams) {
    return this.context.engineClient.getOrderSigners(params);
  }

  /**
   * Retrieves the indexed order signers and the remaining weekly adds from the indexer
   * @param params
   */
  async getSubaccountOrderSignerRateLimit(
    params: GetIndexerOrderSignerRateLimitParams,
  ) {
    return this.context.indexerClient.getOrderSignerRateLimit(params);
  }

  /**
   * Retrieves order signer add / delete events from the indexer
   * @param params
   */
  async getOrderSignerEvents(params: GetIndexerOrderSignerEventsParams) {
    return this.context.indexerClient.getOrderSignerEvents(params);
  }

  /**
   * Retrieves referral code for an address
   * @param params
   */
  async getReferralCode(params: GetIndexerReferralCodeParams) {
    return this.context.indexerClient.getReferralCode(params);
  }
}
