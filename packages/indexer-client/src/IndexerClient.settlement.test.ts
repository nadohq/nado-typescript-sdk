import { describe, expect, it, jest } from '@jest/globals';
import { ProductEngineType, toBigNumber } from '@nadohq/shared';
import { IndexerClient } from './IndexerClient';
import { IndexerEventWithTx } from './types';

// Settlements of 0x1ccefc7ac266858840ffb0a206c1f1da30fe98fd on inkMainnet, as returned by the
// archive `events` query. A single `settle_pnl` tx can settle several perps for one subaccount.
const SUBACCOUNT = {
  subaccountOwner: '0x1ccefc7ac266858840ffb0a206c1f1da30fe98fd',
  subaccountName: 'default',
};
const SUBACCOUNT_HEX =
  '0x1ccefc7ac266858840ffb0a206c1f1da30fe98fd64656661756c740000000000';

function settlementEvents(
  submissionIndex: string,
  perpProductIds: number[],
): IndexerEventWithTx[] {
  // Passed through untouched; the archive packs `product_ids` into one hex string
  const tx = { settle_pnl: { subaccounts: [SUBACCOUNT_HEX] } };
  const event = (productId: number, type: ProductEngineType) =>
    ({
      subaccount: SUBACCOUNT_HEX,
      isolated: false,
      isolatedProductId: null,
      productId,
      submissionIndex,
      eventType: 'settle_pnl',
      state: {
        type,
        market: { productId, type },
        preBalance: {
          amount: toBigNumber(0),
          vQuoteBalance: toBigNumber(10),
          productId,
          type,
        },
        postBalance: {
          amount: toBigNumber(0),
          vQuoteBalance: toBigNumber(0),
          productId,
          type,
        },
      },
      timestamp: toBigNumber(1794325466),
      tx,
    }) as unknown as IndexerEventWithTx;

  return [
    event(0, ProductEngineType.SPOT),
    ...perpProductIds.map((productId) =>
      event(productId, ProductEngineType.PERP),
    ),
  ];
}

// Newest first, as the archive returns them
const EVENTS_BY_TX = [
  settlementEvents('103436753', [4, 8, 36, 112, 136, 138, 140, 2]),
  settlementEvents('103436742', [10, 14, 16, 18, 28, 30, 72, 78]),
  settlementEvents('103436700', [6]),
];

/**
 * Stubs `getEvents` with the archive's cursor semantics: `startCursor` is an inclusive submission
 * index and the limit counts txs.
 */
function createClient() {
  const client = new IndexerClient({ url: 'http://localhost' });
  jest.spyOn(client, 'getEvents').mockImplementation((params) => {
    const startIdx = params.startCursor
      ? EVENTS_BY_TX.findIndex(
          (events) => events[0].submissionIndex === params.startCursor,
        )
      : 0;
    const limit = params.limit?.value ?? EVENTS_BY_TX.length;
    return Promise.resolve(
      EVENTS_BY_TX.slice(startIdx, startIdx + limit).flat(),
    );
  });
  return client;
}

async function paginateAll(client: IndexerClient, limit: number) {
  const settled: string[] = [];
  let startCursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const response = await client.getPaginatedSubaccountSettlementEvents({
      ...SUBACCOUNT,
      limit,
      startCursor,
    });
    settled.push(
      ...response.events.map(
        (event) =>
          `${event.submissionIndex}:${event.snapshot.market.productId}`,
      ),
    );
    if (!response.meta.hasMore) {
      return settled;
    }
    startCursor = response.meta.nextCursor;
  }
  throw Error(`Pagination did not finish, stuck at cursor ${startCursor}`);
}

const ALL_SETTLEMENTS = EVENTS_BY_TX.flat()
  .filter((event) => event.state.market.productId !== 0)
  .map((event) => `${event.submissionIndex}:${event.state.market.productId}`);

describe('IndexerClient.getPaginatedSubaccountSettlementEvents', () => {
  it('does not split a settlement tx across pages', async () => {
    const response =
      await createClient().getPaginatedSubaccountSettlementEvents({
        ...SUBACCOUNT,
        limit: 3,
      });

    expect(
      response.events.map((event) => event.snapshot.market.productId),
    ).toEqual([4, 8, 36, 112, 136, 138, 140, 2]);
    expect(response.meta).toEqual({ hasMore: true, nextCursor: '103436742' });
  });

  it('returns every settlement exactly once when the limit is below the products per tx', async () => {
    expect(await paginateAll(createClient(), 3)).toEqual(ALL_SETTLEMENTS);
  });

  it('returns every settlement exactly once when a page ends inside a tx', async () => {
    expect(await paginateAll(createClient(), 10)).toEqual(ALL_SETTLEMENTS);
  });

  it('keeps the requested limit when every tx settles one product', async () => {
    const client = createClient();
    jest
      .spyOn(client, 'getEvents')
      .mockResolvedValue([
        ...settlementEvents('3', [1]),
        ...settlementEvents('2', [2]),
        ...settlementEvents('1', [3]),
      ]);

    const response = await client.getPaginatedSubaccountSettlementEvents({
      ...SUBACCOUNT,
      limit: 2,
    });

    expect(
      response.events.map((event) => event.snapshot.market.productId),
    ).toEqual([1, 2]);
    expect(response.meta).toEqual({ hasMore: true, nextCursor: '1' });
  });
});
