import { describe, expect, it } from '@jest/globals';
import { mapNuanzeMarketPosition } from './dataMappers';
import { NuanzeServerMarketPosition } from './types/serverModelTypes';

describe('mapNuanzeMarketPosition', () => {
  it('maps signed exact base amount from the wire amount field', () => {
    const mapped = mapNuanzeMarketPosition({
      subaccountOwner: '0x022e3ce4eda264b3e3fef62036c8182ceb88e6ce',
      subaccountName: 'default',
      symbol: 'BTC-PERP',
      marginKind: 'cross',
      side: 'short',
      amount: '-17.18055',
      notional: '1351349.05',
      upnl: '-118813.75',
      margin: '27026.98',
      entryPrice: '71740',
    } satisfies NuanzeServerMarketPosition);

    expect(mapped.amount.isFinite()).toBe(true);
    expect(mapped.amount.toFixed()).toBe('-17.18055');
  });
});
