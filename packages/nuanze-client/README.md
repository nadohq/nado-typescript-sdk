# `@nadohq/nuanze-client`

HTTP client for the Nuanze public analytics API. Serves markets, wallets, trades, candles, collateral flows,
positioning, and globally ranked current open positions. Read-only and credential-free, so unlike the other
service clients it takes no wallet client or linked signer.

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
- `getSubaccountLeaderboard`
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

## Errors

Failures arrive as `NuanzeServerFailureError`, carrying `errorCode` (comparable against
`NUANZE_ERROR_CODES`), `httpStatus`, and the `requestId` to quote when reporting the failure.

## License

ISC
