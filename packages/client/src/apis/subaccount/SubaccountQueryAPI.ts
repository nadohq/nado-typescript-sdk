import {
  getSubaccountSummary,
  GetSubaccountSummaryParams,
} from '@nadohq/contracts';
import {
  GetEngineEstimatedSubaccountSummaryParams,
  GetEngineIsolatedPositionsParams,
  GetEngineSubaccountFeeRatesParams,
  GetEngineSubaccountSummaryParams,
} from '@nadohq/engine-client';
import {
  GetIndexerLinkedSignerParams,
  GetIndexerReferralCodeParams,
} from '@nadohq/indexer-client';
import { BaseNadoAPI } from '../base';

export class SubaccountQueryAPI extends BaseNadoAPI {
  /**
   * Returns a comprehensive summary for a subaaccount, including its balances and health
   *
   * @see {@link getSubaccountSummary:CONTRACTS | getSubaccountSummary}
   */
  async getSubaccountSummary(params: GetSubaccountSummaryParams) {
    return getSubaccountSummary(this.paramsWithContracts(params));
  }

  /**
   * Gets the subaccount state according to the offchain engine
   * @param params
   */
  async getEngineSubaccountSummary(params: GetEngineSubaccountSummaryParams) {
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
   * Retrieves referral code for an address
   * @param params
   */
  async getReferralCode(params: GetIndexerReferralCodeParams) {
    return this.context.indexerClient.getReferralCode(params);
  }
}
