import { QUOTE_PRODUCT_ID } from '@nadohq/contracts';
import { CandlestickPeriod, IndexerClient } from '@nadohq/indexer-client';
import { nowInSeconds, TimeInSeconds } from '@nadohq/utils';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';

async function marketsQueriesTests(context: RunContext) {
  const walletClient = context.getWalletClient();

  const client = new IndexerClient({
    url: context.endpoints.indexer,
    walletClient,
  });

  const fundingRate = await client.getFundingRate({
    productId: 2,
  });

  debugPrint('Funding rate', fundingRate.fundingRate.toString());

  const fundingRates = await client.getMultiProductFundingRates({
    productIds: [2, 4],
  });

  debugPrint('Multiple products funding rate', fundingRates);

  const price = await client.getPerpPrices({
    productId: 2,
  });

  debugPrint('Perp prices', price);

  const perpPrices = await client.getMultiProductPerpPrices({
    productIds: [2, 4, 6],
  });

  debugPrint('Multiple products perp prices', perpPrices);

  const oraclePrices = await client.getOraclePrices({
    productIds: [1, 2, 3, 4],
  });

  debugPrint('Oracle Prices', oraclePrices);

  const usdcPrice = await client.getQuotePrice();

  debugPrint('USDC Price', usdcPrice);

  const candlesticks = await client.getCandlesticks({
    limit: 2,
    maxTimeInclusive: nowInSeconds(),
    period: CandlestickPeriod.DAY,
    productId: 3,
  });
  debugPrint('Candlesticks', candlesticks);

  const marketSnapshots = await client.getMarketSnapshots({
    granularity: TimeInSeconds.HOUR,
    limit: 1,
    productIds: [2, 3, 4],
  });

  debugPrint('Market snapshots', marketSnapshots);

  const productSnapshots = await client.getProductSnapshots({
    limit: 2,
    maxTimestampInclusive: nowInSeconds(),
    productId: 2,
  });

  debugPrint('Product snapshots', productSnapshots);

  const multiProductSnapshots = await client.getMultiProductSnapshots({
    productIds: [2, 3],
  });

  debugPrint(
    'Multiple products snapshots',
    Object.values(multiProductSnapshots).pop(),
  );

  const now = nowInSeconds();
  const multiTimestampProductSnapshots = await client.getMultiProductSnapshots({
    productIds: [QUOTE_PRODUCT_ID, 2, 4],
    maxTimestampInclusive: [
      now,
      now - TimeInSeconds.HOUR,
      now - TimeInSeconds.DAY,
    ],
  });

  debugPrint(
    'Multi timestamp and multi product snapshots',
    multiTimestampProductSnapshots,
  );
}

void test('[indexer-client]: Running markets queries tests', () =>
  runWithContext(marketsQueriesTests));
