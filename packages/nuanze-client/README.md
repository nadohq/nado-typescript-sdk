# `@nadohq/nuanze-client`

HTTP client for the Nuanze public analytics API. Provides typed, read-only access to markets, funding, news, leaderboards, platform aggregates, wallet analytics, trades, candles, collateral flows, and privacy-preserving market positioning.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Installation

```bash
npm install @nadohq/nuanze-client @nadohq/shared viem bignumber.js
```

This client is independent of `NadoClient`. It needs no chain environment, wallet client, signer, or contract address, and the API requires no credentials. `@nadohq/client` re-exports it for convenience but never instantiates it.

## Usage

```ts
import { NuanzeClient } from '@nadohq/nuanze-client';

const nuanze = new NuanzeClient();

const { markets, count, asOf } = await nuanze.listMarkets({ venue: 'perp' });
```

### Options

```ts
const nuanze = new NuanzeClient({
  // Defaults to NUANZE_API_BASE_URL ('https://api.nuanze.co/v1').
  baseUrl: 'https://api.nuanze.co/v1',
  // Finite request timeout. Defaults to 10_000.
  timeoutMs: 10_000,
  // Optional non-sensitive identification headers. In a browser, only the
  // headers the API allowlists for CORS survive preflight: Accept,
  // Content-Type, If-None-Match, and X-Request-Id.
  headers: { 'X-Application': 'my-analytics-job' },
});
```

Every method accepts per-request options:

```ts
const controller = new AbortController();

await nuanze.listMarkets(
  { venue: 'perp' },
  {
    signal: controller.signal,
    // Only permitted to shorten the client default.
    timeoutMs: 2_000,
    // Echoed back by the API and included in error bodies.
    requestId: 'my-correlation-id',
  },
);
```

## Rate limits

The API applies a weighted token bucket per client IP: capacity 150 units, refilling 2 units per second (120 units per minute). Point lookups cost 1 unit, list and series operations cost 2, and market positioning plus any all-time analytics window costs 5.

There is no API key and no elevated tier, so every caller shares the same policy. Because weight is charged before the server's cache lookup, a `304 Not Modified` costs exactly as much as a `200`; conditional requests save bandwidth but never quota.

This client therefore:

- never selects an all-time (weight 5) variant unless you ask for one;
- surfaces `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` through `NuanzeApiError` and `lastRateLimit`;
- makes exactly one HTTP attempt per call, with no retries, backoff, or `Retry-After` sleeping.

Two opt-in helpers reduce spend. Both are off by default, so default behavior stays a plain single-attempt client:

```ts
const nuanze = new NuanzeClient({
  // Serve repeat reads locally for as long as the response's Cache-Control
  // max-age allows, skipping the request (and its rate-limit charge) entirely.
  cache: { maxEntries: 256 },
  // Bound in-flight requests so a burst cannot drain the 150-unit capacity.
  maxConcurrentRequests: 4,
});
```

## Errors

| Error | Meaning |
| --- | --- |
| `NuanzeApiError` | The API returned a documented error envelope. Carries `status`, `code`, `requestId`, and rate-limit headers. |
| `NuanzeTimeoutError` | The request exceeded `timeoutMs`, which it reports. |
| `NuanzeResponseError` | Non-JSON or structurally invalid response. Carries a bounded, redacted body preview. |
| `NuanzeConfigError` | Invalid client or request option, thrown before any network call. |

Caller cancellation is not converted into an SDK error. Aborting the signal rejects with axios's own `CanceledError`, so `axios.isCancel(error)` and `signal.aborted` both hold and cancellation stays distinguishable from a timeout.

## Conventions

- Exact decimal values arrive as strings and are mapped to `NuanzeDecimal` (a `BigNumber`) only for documented decimal fields.
- ISO 8601 timestamps and `YYYY-MM-DD` calendar dates stay strings, preserving the canonical API contract.
- IDs, counts, ranks, enums, booleans, addresses, and cursors are never converted to decimals.
- Addresses are returned lowercase.

## Tests

Coverage is split by what each kind of test can actually prove:

- `bun run test:unit` covers this package's deterministic behavior in Jest, next to each source file: response mapping and every contract violation, error classification, rate-limit header parsing, the response cache, the concurrency gate, base URL resolution, and option validation. Transport tests replace the axios adapter rather than starting a server, so request count and wire shape stay observable in-process.
- `bun run test:e2e:nuanze` runs against the live `api.nuanze.co` with no mock server, covering real payload shapes and invariants, filters, rate-limit and correlation metadata, cancellation, the cache against the API's own `Cache-Control`, the cross-package `@nadohq/client` re-export, and bundler-less ESM and CJS loading of `dist`.

The integration spec discourages Jest tests for this package by default; the unit suites above exist under a maintainer-approved exception, because the negative paths they cover cannot be produced by the live API on demand.
