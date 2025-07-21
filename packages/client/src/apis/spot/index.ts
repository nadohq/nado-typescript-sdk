import { Mixin } from 'ts-mixer';
import { SpotExecuteAPI } from './SpotExecuteAPI';
import { SpotQueryAPI } from './SpotQueryAPI';

/**
 * Combined Spot trading API providing both execution and query functionality
 */
export class SpotAPI extends Mixin(SpotExecuteAPI, SpotQueryAPI) {}

export * from './types';
