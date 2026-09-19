# `@nadohq/nuanze-client`

HTTP client for the Nuanze public analytics API. Serves markets, wallets, trades, candles, collateral flows,
positioning, and globally ranked current open positions. Read-only and credential-free, so unlike the other
service clients it takes no wallet client or linked signer. Leaderboard lookups take explicit public
identifiers and require no authentication: collection viewer lookups take a wallet address (`getLeaderboard`
`viewAs`) or bytes32 subaccount hex (`getSubaccountLeaderboard` `viewAs`), while dedicated point reads
(`getWalletLeaderboardPosition`, `getSubaccountLeaderboardPosition`) fetch one rank by path identifier.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Usage

```ts
import { NuanzeClient, NUANZE_CLIENT_ENDPOINTS } from '@nadohq/nuanze-client';

const nuanze = new NuanzeClient({
  url: NUANZE_CLIENT_ENDPOINTS.inkMainnet,
});

const { markets, asOf } = await nuanze.getMarkets({ venue: 'perp' });
```

It is also available on a `NadoClient` context, configured from the chain env like the other service clients:

```ts
const markets = await nadoClient.context.nuanzeClient.getMarkets();
```

Nuanze runs a single public deployment that serves mainnet data, so every entry in
`NUANZE_CLIENT_ENDPOINTS` points at the same host.

### Market selectors

Scoped market methods (`getMarketByTicker`, `getMarketTrades`, `getMarketCandles`,
`getMarketPositioning`, and `getMarketPositions`) require at least `ticker` or `productId`. When
both are supplied, `productId` is used for the path segment and `ticker` is ignored.

```ts
// Ticker only (case-insensitive; canonical ticker or legacy symbol)
const eth = await nuanze.getMarketByTicker({ ticker: 'ETH' });

// Product ID only
const ethPerp = await nuanze.getMarketByTicker({ productId: 4 });

// Both: productId wins; ticker is ignored (BTC here is only illustrative)
const candles = await nuanze.getMarketCandles({
  ticker: 'BTC',
  productId: 4,
  interval: '1h',
});
```

## API Surface

Each method maps one-to-one onto a public GET operation:

- `getNews`
- `getMarkets`
- `getMarketByTicker`
- `getFundingRates`
- `getLeaderboard`
- `getWalletLeaderboardPosition`
- `getSubaccountLeaderboard`
- `getSubaccountLeaderboardPosition`
- `getPlatformSummary`
- `getFollowedLeaderboard`
- `getWalletSummary`
- `getWalletPositions`
- `getMarketTrades`
- `getMarketCandles`
- `getWalletTrades`
- `getWalletPnl`
- `getWalletPnlSeries`
- `getCollateralFlows`
- `getCollateralFlowSummary`
- `getCollateralFlowSeries`
- `getMarketPositioning`
- `getMarketPositions`
- `getOpenPositions`

Decimal fields are mapped to `BigNumber`; timestamps stay UTC ISO 8601 strings, matching the API contract.
Both leaderboard collections accept an optional `viewAs` viewer selector: `getLeaderboard` takes an EVM address
and returns the wallet's full row plus rank as `viewer`; `getSubaccountLeaderboard` takes a bytes32 subaccount hex
and returns `{ filteredRank, item }` as `viewer`. A `viewer` is null when `viewAs` is omitted or has no source row.
For subaccounts, privacy, trading, and username-claim filters define the filtered-rank population without removing
an existing full item or its `globalRank`; exclusion sets only `filteredRank` to null.

The dedicated point reads coexist with `viewAs`: `getWalletLeaderboardPosition({ address })` GETs
`/leaderboard/wallets/{address}` and `getSubaccountLeaderboardPosition({ subaccountHex })` GETs
`/leaderboard/subaccounts/{subaccountHex}`, each returning the same row shape without pagination. Use a point
read when only one rank is needed; use `viewAs` for an inline lookup scoped to a ranked page. Position
`item` is null only when no leaderboard source row exists for the identifier, and a filter-excluded subaccount
keeps its full item (including `globalRank`) with `filteredRank` null.

```ts
const board = await nuanze.getLeaderboard({
  timeframe: '30d',
  limit: 10,
  viewAs: '0x1234567890123456789012345678901234567890',
});
if (board.viewer) {
  console.log(board.viewer.rank, board.viewer.accountPnl.toFixed());
}

const subs = await nuanze.getSubaccountLeaderboard({
  timeframe: '30d',
  viewAs: '0x1234...0012',
});
if (subs.viewer) {
  console.log(subs.viewer.filteredRank, subs.viewer.item?.globalRank);
}

const position = await nuanze.getWalletLeaderboardPosition({
  address: '0x1234567890123456789012345678901234567890',
  timeframe: '30d',
});
if (position.item) {
  console.log(position.item.rank, position.item.accountPnl.toFixed());
}

const subPosition = await nuanze.getSubaccountLeaderboardPosition({
  subaccountHex: '0x1234...0012',
  timeframe: '30d',
});
if (subPosition.item) {
  console.log(subPosition.filteredRank, subPosition.item.globalRank);
}
```

## Errors

Failures arrive as `NuanzeServerFailureError`, carrying `errorCode` (comparable against
`NUANZE_ERROR_CODES`), `httpStatus`, and the `requestId` to quote when reporting the failure.

## License

ISC
