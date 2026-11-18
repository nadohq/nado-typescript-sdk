import { describe, expect, it, jest } from '@jest/globals';
import { ProductEngineType, toBigNumber } from '@nadohq/shared';
import { IndexerClient } from './IndexerClient';
import { IndexerEventWithTx, NadoLiquidateSubaccountTx } from './types';

// Liquidations of 0x487c6480c33f32435f99cfa4b1e09c0d4e4165f7 and 0xfa23efb35ceab6a46899293a246c476fec3f7b3a
// on inkMainnet, as returned by the archive `events` query
const LIQUIDATOR =
  '0xc6be262771f5e69c8bbe268aee225436cc7f2b5964656661756c740000000000';

const SPREAD_LIQUIDATEE = {
  subaccountOwner: '0x487c6480c33f32435f99cfa4b1e09c0d4e4165f7',
  subaccountName: 'default',
};

const FINALIZED_LIQUIDATEE = {
  subaccountOwner: '0xfa23efb35ceab6a46899293a246c476fec3f7b3a',
  subaccountName: 'default',
};

// Spread liquidation of perp 2 and spot 1: `product_id` is `(2 << 16) | 1`
const spreadLiquidationTx: NadoLiquidateSubaccountTx['liquidate_subaccount'] = {
  sender: LIQUIDATOR,
  liquidatee:
    '0x487c6480c33f32435f99cfa4b1e09c0d4e4165f764656661756c740000000000',
  product_id: 131073,
  is_encoded_spread: true,
  amount: '272700000000000000',
  nonce: 5776,
};

// Spot liquidation of product 3
const spotLiquidationTx: NadoLiquidateSubaccountTx['liquidate_subaccount'] = {
  sender: LIQUIDATOR,
  liquidatee:
    '0x487c6480c33f32435f99cfa4b1e09c0d4e4165f764656661756c740000000000',
  product_id: 3,
  is_encoded_spread: false,
  amount: '15620111237132599835',
  nonce: 5777,
};

// Subaccount finalization: `product_id` is `u32::MAX`
const finalizationTx: NadoLiquidateSubaccountTx['liquidate_subaccount'] = {
  sender: LIQUIDATOR,
  liquidatee:
    '0xfa23efb35ceab6a46899293a246c476fec3f7b3a64656661756c740000000000',
  product_id: 4294967295,
  is_encoded_spread: false,
  amount: '-1',
  nonce: 5825,
};

// Perp liquidation of product 46
const perpLiquidationTx: NadoLiquidateSubaccountTx['liquidate_subaccount'] = {
  sender: '0x0000000000000000000000000000000000000000000000000000000000000002',
  liquidatee:
    '0xfa23efb35ceab6a46899293a246c476fec3f7b3a64656661756c740000000000',
  product_id: 46,
  is_encoded_spread: false,
  amount: '4500000000000000000',
  nonce: 5825,
};

function liquidationEvent(params: {
  submissionIndex: string;
  tx: NadoLiquidateSubaccountTx['liquidate_subaccount'];
  productId: number;
  type: ProductEngineType;
  preAmount: string;
  postAmount: string;
}): IndexerEventWithTx {
  const { submissionIndex, tx, productId, type, preAmount, postAmount } =
    params;
  return {
    subaccount: tx.liquidatee,
    isolated: false,
    isolatedProductId: null,
    productId,
    submissionIndex,
    eventType: 'liquidate_subaccount',
    state: {
      type,
      market: { productId, type },
      preBalance: { amount: toBigNumber(preAmount), productId, type },
      postBalance: { amount: toBigNumber(postAmount), productId, type },
    },
    timestamp: toBigNumber(1794325466),
    tx: { liquidate_subaccount: tx },
  } as unknown as IndexerEventWithTx;
}

// The archive returns one event per requested product for every liquidation tx of the subaccount,
// with no balance change for the products the tx did not liquidate
const perp2Events = [
  liquidationEvent({
    submissionIndex: '101865735',
    tx: spotLiquidationTx,
    productId: 2,
    type: ProductEngineType.PERP,
    preAmount: '0',
    postAmount: '0',
  }),
  liquidationEvent({
    submissionIndex: '101865685',
    tx: spreadLiquidationTx,
    productId: 2,
    type: ProductEngineType.PERP,
    preAmount: '-272700000000000000',
    postAmount: '0',
  }),
];

const spot1Events = [
  liquidationEvent({
    submissionIndex: '101865735',
    tx: spotLiquidationTx,
    productId: 1,
    type: ProductEngineType.SPOT,
    preAmount: '2224394858907345933',
    postAmount: '2224394858907345933',
  }),
  liquidationEvent({
    submissionIndex: '101865685',
    tx: spreadLiquidationTx,
    productId: 1,
    type: ProductEngineType.SPOT,
    preAmount: '2497094858907345934',
    postAmount: '2224394858907345933',
  }),
];

const quoteEvents = [
  liquidationEvent({
    submissionIndex: '102440637',
    tx: finalizationTx,
    productId: 0,
    type: ProductEngineType.SPOT,
    preAmount: '4913059587680132944',
    postAmount: '0',
  }),
  liquidationEvent({
    submissionIndex: '102440634',
    tx: perpLiquidationTx,
    productId: 0,
    type: ProductEngineType.SPOT,
    preAmount: '4913059587680132944',
    postAmount: '4913059587680132944',
  }),
];

function mockEventsClient(events: IndexerEventWithTx[]) {
  const client = new IndexerClient({
    url: 'https://archive.example/archive',
  });
  jest.spyOn(client, 'getEvents').mockResolvedValue(events);
  return client;
}

describe('[indexer-client]: getPaginatedSubaccountLiquidationEvents', () => {
  it('keeps a spread liquidation when filtering by its perp product', async () => {
    const client = mockEventsClient(perp2Events);

    const { events } = await client.getPaginatedSubaccountLiquidationEvents({
      ...SPREAD_LIQUIDATEE,
      limit: 10,
      productIds: [2],
    });

    expect(events).toHaveLength(1);
    expect(events[0].submissionIndex).toBe('101865685');
    expect(events[0].perp?.amountLiquidated.toString()).toBe(
      '-272700000000000000',
    );
  });

  it('keeps a spread liquidation when filtering by its spot product', async () => {
    const client = mockEventsClient(spot1Events);

    const { events } = await client.getPaginatedSubaccountLiquidationEvents({
      ...SPREAD_LIQUIDATEE,
      limit: 10,
      productIds: [1],
    });

    expect(events).toHaveLength(1);
    expect(events[0].submissionIndex).toBe('101865685');
    expect(events[0].spot?.amountLiquidated.toString()).toBe(
      '272700000000000001',
    );
  });

  it('keeps a subaccount finalization when filtering by the quote product', async () => {
    const client = mockEventsClient(quoteEvents);

    const { events } = await client.getPaginatedSubaccountLiquidationEvents({
      ...FINALIZED_LIQUIDATEE,
      limit: 10,
      productIds: [0],
    });

    expect(events).toHaveLength(1);
    expect(events[0].submissionIndex).toBe('102440637');
    expect(events[0].quote?.balanceDelta.toString()).toBe(
      '-4913059587680132944',
    );
  });

  it('still drops liquidations of products that were not requested', async () => {
    const client = mockEventsClient([
      liquidationEvent({
        submissionIndex: '102440634',
        tx: perpLiquidationTx,
        productId: 2,
        type: ProductEngineType.PERP,
        preAmount: '0',
        postAmount: '0',
      }),
      quoteEvents[1],
    ]);

    const { events } = await client.getPaginatedSubaccountLiquidationEvents({
      ...FINALIZED_LIQUIDATEE,
      limit: 10,
      productIds: [2],
    });

    expect(events).toHaveLength(0);
  });
});
