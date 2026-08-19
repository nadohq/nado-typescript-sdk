# `@nadohq/indexer-client`

HTTP client for the Nado indexer. Provides typed queries for historical data including trade events, candlesticks, funding payments, snapshots, leaderboards, and paginated event streams.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Usage

```ts
import { IndexerClient, INDEXER_CLIENT_ENDPOINTS } from '@nadohq/indexer-client';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';

const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: ink,
  transport: http(),
});

const indexer = new IndexerClient({
  url: INDEXER_CLIENT_ENDPOINTS.inkMainnet,
  walletClient,
});

// Get candlestick data
const candles = await indexer.getCandlesticks({ ... });

// List subaccount orders
const orders = await indexer.getOrders({ ... });

// Get paginated trade history
const trades = await indexer.getPaginatedSubaccountMatchEvents({ ... });
```

## API Surface

### Market Data

`getCandlesticks`, `getMarketSnapshots`, `getQuotePrice`, `getV2Tickers`, `getV2Symbols`, `getFundingRate`, `getOraclePrice`, `getPerpPrices`.

### Subaccount History

`listSubaccounts`, `getMultiSubaccountSnapshots`, `getOrders`, `getMatchEvents`, `getEvents`, `getInterestFundingPayments`, `getLinkedSignerWithRateLimit`, `getSubaccountDDA`.

### Paginated Queries

`getPaginatedSubaccountMatchEvents`, `getPaginatedSubaccountOrders`, `getPaginatedSubaccountCollateralEvents`, `getPaginatedSubaccountSettlementEvents`, `getPaginatedSubaccountLiquidationEvents`, `getPaginatedSubaccountInterestFundingPayments`, `getPaginatedSubaccountNlpEvents`, `getPaginatedLeaderboard`.

### Leaderboards & Analytics

`getLeaderboard`, `getLeaderboardParticipant`, `getMakerStatistics`, `getPoints`, `getXPoints`, `getReferralCode`.

### NLP

`getNlpSnapshots`, `getNlpLockedBalances`.

## License

ISC
