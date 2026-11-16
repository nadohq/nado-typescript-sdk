# `@nadohq/nuanze-client`

HTTP client for the Nuanze public analytics API. Serves markets, wallets, trades, candles, collateral flows,
positioning, lifetime-PnL wallet cohorts, and globally ranked current open positions. Read-only and
credential-free, so unlike the other service clients it takes no wallet client or linked signer. Leaderboard
lookups take explicit public identifiers and require no authentication: collection viewer lookups take a
wallet address (`getLeaderboard` `viewAs`) or bytes32 subaccount hex (`getSubaccountLeaderboard` and
`getFollowedLeaderboard` `viewAs`), while dedicated point reads (`getWalletLeaderboardPosition`,
`getSubaccountLeaderboardPosition`, `getFollowedLeaderboardPosition`) fetch one rank by path identifier.

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
- `getSubaccountStats`
- `getPlatformSummary`
- `getCohorts`
- `getFollowedLeaderboard`
- `getFollowedLeaderboardPosition`
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

### Market value and sorting

Every market from `getMarkets` and `getMarketByTicker` carries `marketValue`, the USD value of its underlying
asset as `{ kind, usd, asOf }`, or null for commodities, FX, stablecoins, and unmapped assets. `kind` is
`marketCap` (perps and xStock wrappers carry the company's, wrapped crypto the coin's), `aum` for ETFs and index
products, or `privateValuation` for the last priced private round of a pre-IPO name. Several markets can share one
underlying and carry the same value, so never sum `usd` across markets.

`getMarkets` accepts `sortBy` (`productId`, `marketValue`, `volume24h`, `openInterest`, or `priceChange24hPct`;
default `productId`) and `sortDirection`. When `sortDirection` is omitted the server picks it per key (`asc` for
`productId`, `desc` otherwise); the SDK never fills one in. Markets with a null key always come last, and ties break
on `productId` ascending.

`getOpenPositions` accepts `sortBy: 'pnl'` (default, signed unrealized PnL) or `'notional'` (absolute USD notional),
with `sortDirection` applied to the chosen key. Cursors are bound to a non-default `sortBy`, so keep the same `sortBy`
on every page.

### Private Mode positions

`getOpenPositions` and `getMarketPositions` exclude legs owned by Private Mode subaccounts unless you pass
`includePrivate: true`; the filter applies to both `positions` and `dataUpdatedAt`, and a leg whose subaccount never
synced identity counts as public. The SDK sends `includePrivate` only when you supply it. Cursors are bound to
`includePrivate` as well as to the sort, so keep every filter unchanged while paginating: the server rejects a cursor
reused with different values with `CURSOR_FILTER_MISMATCH`.

```ts
const { markets } = await nuanze.getMarkets({ sortBy: 'marketValue' });
const largest = markets[0]?.marketValue; // { kind: 'marketCap', usd: BigNumber, asOf: '...' } | null

const page = await nuanze.getOpenPositions({ sortBy: 'notional', limit: 20 });
if (page.nextCursor) {
  // Keep sortBy: the cursor is bound to it.
  const next = await nuanze.getOpenPositions({
    sortBy: 'notional',
    limit: 20,
    cursor: page.nextCursor,
  });
}
```
All leaderboard collections accept an optional `viewAs` viewer selector: `getLeaderboard` takes an EVM address
and returns the wallet's full row plus rank as `viewer`; `getSubaccountLeaderboard` and `getFollowedLeaderboard`
take a bytes32 subaccount hex and return `{ filteredRank, item }` as `viewer`. A `viewer` is null when `viewAs` is
omitted or has no source row (for the followed leaderboard: when the follower does not actively follow it).
For subaccounts, privacy, trading, and username-claim filters define the filtered-rank population without removing
an existing full item or its `globalRank`; exclusion sets only `filteredRank` to null. On the followed leaderboard
`filteredRank` counts only the follower's filter-passing followed subaccounts, while `globalRank` stays global.
Every subaccount and followed leaderboard item also carries its own `filteredRank` next to `globalRank`: on collection
rows it is the position under the active filters, counted across cursor pages rather than within one page, and on a
`viewer` or position `item` it equals the enclosing `filteredRank`.

The dedicated point reads coexist with `viewAs`: `getWalletLeaderboardPosition({ address })` GETs
`/leaderboard/wallets/{address}`, `getSubaccountLeaderboardPosition({ subaccountHex })` GETs
`/leaderboard/subaccounts/{subaccountHex}`, and `getFollowedLeaderboardPosition({ subaccountHex, viewAs })` GETs
`/wallets/leaderboard/followed/{viewAs}` scoped to the `subaccountHex` follower, each returning the same row shape
without pagination. Use a point read when only one rank is needed; use `viewAs` for an inline lookup scoped to a
ranked page. Position `item` is null only when no leaderboard source row exists for the identifier, and a
filter-excluded subaccount keeps its full item (including `globalRank`) with `filteredRank` null.

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

const followedPosition = await nuanze.getFollowedLeaderboardPosition({
  subaccountHex: '0xabcd...0000', // follower
  viewAs: '0x1234...0012', // followed subaccount to position
  timeframe: '30d',
});
if (followedPosition.item) {
  console.log(followedPosition.filteredRank, followedPosition.item.globalRank);
}
```

## Errors

Failures arrive as `NuanzeServerFailureError`, carrying `errorCode` (comparable against
`NUANZE_ERROR_CODES`), `httpStatus`, and the `requestId` to quote when reporting the failure.

## License

ISC
