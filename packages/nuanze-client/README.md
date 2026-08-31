# `@nadohq/nuanze-client`

HTTP client for the Nuanze public analytics API. Serves markets, wallets, trades, candles, collateral flows,
and positioning. Read-only and credential-free, so unlike the other service clients it takes no wallet client
or linked signer.

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

## API Surface

Each method maps one-to-one onto a public operation. Most are GET; `getFollowedLeaderboard` is a
non-mutating POST whose body carries the followed set:

- `getNews`
- `getMarkets`
- `getMarketByTicker`
- `getFundingRates`
- `getLeaderboard`
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

Decimal fields are mapped to `BigNumber`; timestamps stay UTC ISO 8601 strings, matching the API contract.

## Errors

Failures arrive as `NuanzeServerFailureError`, carrying `errorCode` (comparable against
`NUANZE_ERROR_CODES`), `httpStatus`, and the `requestId` to quote when reporting the failure.

## Rate Limits

The API meters a weighted token bucket per client IP and reports its state in the `RateLimit-Limit`,
`RateLimit-Remaining`, and `RateLimit-Reset` response headers. The client never retries, sleeps, or
self-throttles; add an interceptor on `nuanze.axiosInstance` to observe the headers or to apply per-request
timeouts and cancellation.

## License

ISC
