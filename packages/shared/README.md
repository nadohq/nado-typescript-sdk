# `@nadohq/shared`

Shared utilities, types, and contract helpers for the Nado SDK. Provides ABIs, deployment addresses, EIP-712 signing logic, on-chain helpers, encoding utilities, and math/time functions used across all Nado packages.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Modules

### `abis`

Contract ABIs for all Nado contracts: `Clearinghouse`, `Endpoint`, `SpotEngine`, `PerpEngine`, `Querier`, `WithdrawPool`, `ERC20`. Aggregated via `NADO_ABIS`.

### `deployments`

On-chain contract addresses by environment via `NADO_DEPLOYMENTS`.

### `consts`

Chain environment mappings (`chainEnvToChain`), product ID constants, and chain configurations.

### `eip712`

EIP-712 typed signing for Nado transactions: `getSignedTransactionRequest`, `getNadoEIP712Values`, `getNadoEIP712Types`, `getNadoEIP712Domain`, `orderDigest`, and signable request type definitions.

### `execute`

On-chain transaction helpers: `depositCollateral`, `approveDepositAllowance`.

### `types`

Core type definitions: `ChainEnv`, market/subaccount/order/product types, `WalletClientWithAccount`, health types, and more.

### `utils`

- **Math**: `BigDecimal` helpers, `sumBigNumberBy`, `toBigInt`, `toIntegerString`, `clamp`, decimal adjustment
- **Orders**: nonce generation, appendix packing/unpacking, `recvTime`
- **Bytes**: `bytes32` encoding/decoding, hex validation, address validation
- **Errors**: `WalletNotProvidedError`
- **Other**: `createDeterministicLinkedSignerPrivateKey`, `asyncResult`, `toPrintableObject`, time utilities

## Usage

```ts
import {
  NADO_DEPLOYMENTS,
  NADO_ABIS,
  getSignedTransactionRequest,
  depositCollateral,
  BigDecimal,
} from '@nadohq/shared';

// Get contract addresses for mainnet
const addresses = NADO_DEPLOYMENTS.inkMainnet;

// Sign an EIP-712 transaction
const signed = await getSignedTransactionRequest({
  requestType: 'place_order',
  params: { ... },
  walletClient,
  verifyingAddress: addresses.endpoint,
});
```

## License

ISC
