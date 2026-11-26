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
| `client.spot` | Deposits, withdrawals, token allowances, quote transfers, Tips, NLP mint/burn |
| `client.perp` | Perp-specific price queries |
| `client.ws` | WebSocket query, execute, and subscription message builders |

## Sending a Tip

`client.spot.sendTip` resolves the recipient DDA, signs the owner's withdrawal and submits it through Mobile.
`amount` is the net recipient amount in native USDT0 units (six decimals); `maxFeeX18` is the separately confirmed
fee ceiling in x18 units. The connected owner wallet signs the withdrawal even when a linked signer is configured.

```ts
import { addDecimals } from '@nadohq/client';

const result = await client.spot.sendTip({
  subaccountName: 'default',
  recipientSubaccount,
  amount: addDecimals('5', 6),
  backgroundId: 'tip-plain',
  visibility: 'private',
  maxFeeX18: confirmedFeeX18,
});
```

The returned `SendTipResult` keeps the receipt fields and adds `retryRequest` with the original withdrawal and
inner signature. If it resolves with `tipStatus: 'failed'` and `processingReason: 'FEE_TOO_LOW'`, obtain a fresh fee
quote and explicit user confirmation before reconfirming that same Tip:

```ts
await client.spot.sendTip({
  ...result.retryRequest,
  maxFeeX18: confirmedNewFeeX18,
  expectedVersion: result.version,
});
```

After an uncertain submission, an explicit retry must use `client.spot.sendTip(error.retryRequest)` rather than
creating another withdrawal. Replay preserves the original inner nonce, signature and fee cap while renewing outer
Mobile authentication. A new Tip's known pre-admission rejection remains the original `MobileServerFailureError`
so the user can correct the input. Wallet-signing and DDA transport errors also propagate unchanged.

Explicit `chainId` and `verifyingAddr` must match the connected wallet's chain and the client's endpoint; mismatches
reject before signing. Local guards expose `SendTipValidationError.reason` for handling without parsing messages.
The exported `SEND_TIP_VALIDATION_REASONS` values are `owner_wallet_required`, `signing_context_mismatch`,
`invalid_amount`, and `recipient_dda_unavailable`.

`SendTipError.cause` is the original failure for user-cancellation and server-error handling. It and the readonly
`retryRequest` on both results and errors are non-enumerable, but can contain signed data: never log or persist them.
The SDK retains no hidden pending state and never retries or raises a fee cap automatically.

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
    rewardsEndpoint: 'https://...', // optional
    triggerEndpoint: 'https://...',
    mobileEndpoint: 'https://...',
    nuanzeEndpoint: 'https://...',
  },
  { publicClient, walletClient },
);
```

## License

ISC
