# `@nadohq/trigger-client`

HTTP client for the Nado trigger service. Manages stop-loss, take-profit, and other conditional orders, as well as TWAP (time-weighted average price) order execution.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Installation

```bash
npm install @nadohq/trigger-client @nadohq/engine-client @nadohq/shared viem bignumber.js
```

Most apps should use `@nadohq/client` instead, which includes this package. Install `@nadohq/trigger-client` directly when integrating only the trigger service.

## Usage

```ts
import { TriggerClient, TRIGGER_CLIENT_ENDPOINTS } from '@nadohq/trigger-client';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';

const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: ink,
  transport: http(),
});

const trigger = new TriggerClient({
  url: TRIGGER_CLIENT_ENDPOINTS.inkMainnet,
  walletClient,
});

// Place a stop-loss trigger order
await trigger.placeTriggerOrder({ ... });

// List active trigger orders
const orders = await trigger.listOrders({ ... });

// Cancel trigger orders
await trigger.cancelTriggerOrders({ ... });
```

## API Surface

### Executes

`placeTriggerOrder`, `placeTriggerOrders`, `cancelTriggerOrders`, `cancelProductOrders`, `updateTriggerDependency`.

### Queries

`listOrders`, `listTwapExecutions`.

### Linked Signers

The trigger client supports linked signers for delegated transaction signing:

```ts
trigger.setLinkedSigner(linkedSignerWalletClient);
```

## License

ISC
