# `@nadohq/client`

The main entry point for the Nado TypeScript SDK. Composes the engine, indexer, trigger, mobile, and shared packages into a single `NadoClient` with domain-specific APIs for market data, trading, collateral management, and real-time subscriptions.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Installation

```bash
npm install @nadohq/client viem bignumber.js
# or
yarn add @nadohq/client viem bignumber.js
```

`viem` and `bignumber.js` are peer dependencies and must be installed separately.

## Quick Start

```ts
import { createNadoClient } from '@nadohq/client';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';

const account = privateKeyToAccount('0x...');

const publicClient = createPublicClient({
  chain: ink,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: ink,
  transport: http(),
});

const client = createNadoClient(
  { chainEnv: 'inkMainnet' },
  {
    publicClient,
    walletClient,
  },
);

// Query all markets
const markets = await client.market.getAllMarkets();

// Place a perp order
await client.market.placeOrder({
  /* order params */
});

// Get subaccount summary
const summary = await client.subaccount.getSummary({
  /* subaccount params */
});
```

## API Overview

The `NadoClient` exposes five domain APIs:

| API | Description |
| --- | --- |
| `client.market` | Market data, order placement & cancellation, trigger orders, liquidity, prices, candlesticks |
| `client.subaccount` | Subaccount summaries, isolated positions, fee rates, linked signers, referrals, liquidation |
| `client.spot` | Deposits, withdrawals, token allowances, quote transfers, NLP mint/burn |
| `client.perp` | Perp-specific price queries |
| `client.ws` | WebSocket query, execute, and subscription message builders |

## Re-exports

This package re-exports everything from the underlying packages, so most apps only need to depend on `@nadohq/client`:

- `@nadohq/engine-client`
- `@nadohq/indexer-client`
- `@nadohq/trigger-client`
- `@nadohq/mobile-client`
- `@nadohq/shared`

## Advanced: Custom Endpoints

Pass endpoints explicitly instead of a `chainEnv` to connect to custom endpoints:

```ts
const client = createNadoClient(
  {
    contractAddresses: { ... },
    engineEndpoint: 'https://...',
    indexerEndpoint: 'https://...',
    triggerEndpoint: 'https://...',
    mobileEndpoint: 'https://...',
  },
  { publicClient, walletClient },
);
```

## License

ISC
