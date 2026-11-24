# `@nadohq/shared`

Shared utilities, types, and contract helpers for the Nado SDK. Provides ABIs, deployment addresses, EIP-712 signing logic, on-chain helpers, encoding utilities, and math/time functions used across all Nado packages.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Modules

### `abis`

Contract ABIs for all Nado contracts: `Clearinghouse`, `Endpoint`, `SpotEngine`, `PerpEngine`, `Querier`, `WithdrawPool`, `ERC20`. Aggregated via `NADO_ABIS`.

### `deployments`

On-chain contract addresses by environment via `NADO_DEPLOYMENTS`.

### `consts`

Chain environment mappings (`CHAIN_ENV_TO_CHAIN`, `CHAIN_ID_TO_CHAIN_ENV`), product ID constants, and chain configurations.

### `eip712`

EIP-712 typed signing for Nado transactions: `getSignedTransactionRequest`, `getNadoEIP712Values`, `getNadoEIP712Types`, `getNadoEIP712Domain`, `getOrderDigest`, and signable request type definitions.

### `execute`

On-chain transaction helpers: `depositCollateral`, `approveDepositAllowance`.

### `types`

Core type definitions: `ChainEnv`, market/subaccount/order/product types, `WalletClientWithAccount`, health types, and more.

### `utils`

- **Math**: `toBigNumber`, `BigNumbers`, `sumBigNumberBy`, `toBigInt`, `toIntegerString`, `clampBigNumber`, decimal adjustment
- **Orders**: nonce generation, appendix packing/unpacking, `recvTime`
- **Bytes**: `bytes32` encoding/decoding, hex validation, address validation
- **Errors**: `WalletNotProvidedError`
- **Other**: `createDeterministicLinkedSignerPrivateKey`, `asyncResult`, `toPrintableObject`, time utilities

## Usage

```ts
import {
  CHAIN_ENV_TO_CHAIN,
  NADO_DEPLOYMENTS,
  NADO_ABIS,
  getOrderVerifyingAddress,
  getSignedTransactionRequest,
  depositCollateral,
} from '@nadohq/shared';

// Get contract addresses for mainnet
const addresses = NADO_DEPLOYMENTS.inkMainnet;

// Sign an EIP-712 order: orders are verified against the product's orderbook address,
// other requests against `addresses.endpoint`
const productId = 2;
const signature = await getSignedTransactionRequest({
  requestType: 'place_order',
  requestParams: { ... },
  chainId: CHAIN_ENV_TO_CHAIN.inkMainnet.id,
  verifyingContract: getOrderVerifyingAddress(productId),
  walletClient,
});
```

## License

ISC
