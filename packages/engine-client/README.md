# `@nadohq/engine-client`

HTTP client for the Nado off-chain matching engine. Provides typed queries and EIP-712 signed executes for order management, subaccount state, market data, and NLP operations.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Usage

```ts
import { EngineClient, ENGINE_CLIENT_ENDPOINTS } from '@nadohq/engine-client';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';

const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: ink,
  transport: http(),
});

const engine = new EngineClient({
  url: ENGINE_CLIENT_ENDPOINTS.inkMainnet,
  walletClient,
});

// Query market data
const markets = await engine.getAllMarkets();
const price = await engine.getMarketPrice({ productId: 1 });

// Place an order (EIP-712 signed)
await engine.placeOrder({ ... });

// Cancel orders
await engine.cancelOrders({ ... });
```

## API Surface

### Queries

`getStatus`, `getContracts`, `getSubaccountSummary`, `getEstimatedSubaccountSummary`, `getIsolatedPositions`, `getSymbols`, `getAllMarkets`, `getHealthGroups`, `getOrder`, `getSubaccountOrders`, `getSubaccountFeeRates`, `getMarketLiquidity`, `getMarketPrice`, `getMarketPrices`, `getMaxOrderSize`, `getMaxWithdrawable`, `getMaxMintNlpAmount`, `getMaxBurnNlpAmount`, `getLinkedSigner`, `getInsurance`, `getNlpPoolInfo`, and more.

### Executes

`placeOrder`, `placeOrders`, `cancelOrders`, `cancelAndPlace`, `cancelProductOrders`, `liquidateSubaccount`, `withdrawCollateral`, `linkSigner`, `transferQuote`, `mintNlp`, `burnNlp`.

### Linked Signers

The engine client supports linked signers for delegated transaction signing:

```ts
engine.setLinkedSigner(linkedSignerWalletClient);
```

## License

ISC
