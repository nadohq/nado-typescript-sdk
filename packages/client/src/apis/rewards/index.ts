import { Mixin } from 'ts-mixer';
import { RewardsExecuteAPI } from './RewardsExecuteAPI';
import { RewardsQueryAPI } from './RewardsQueryAPI';

/**
 * Combined rewards API for querying cash incentives progress and claiming rewards onchain
 * through the Airdrop contract.
 */
export class RewardsAPI extends Mixin(RewardsExecuteAPI, RewardsQueryAPI) {}

export * from './types';
