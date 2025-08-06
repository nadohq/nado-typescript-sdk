import { SettlePnlParams } from '@nadohq/contracts';
import { BaseNadoAPI } from '../base';

export class PerpExecuteAPI extends BaseNadoAPI {
  settlePnl(_params: SettlePnlParams) {
    throw Error('Not implemented');
  }
}
