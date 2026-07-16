# `@nadohq/mobile-client`

HTTP client for the Nado Mobile Identity API. Manages username claims, public profile lookups, and privacy settings for
subaccounts, using EIP-712 + msgpack signed authentication.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Installation

```bash
npm install @nadohq/mobile-client @nadohq/shared viem bignumber.js
```

Most apps should use `@nadohq/client` instead, which includes this package. Install `@nadohq/mobile-client` directly
when integrating only the mobile identity service.

## Usage

```ts
import { MobileClient, MOBILE_CLIENT_ENDPOINTS } from '@nadohq/mobile-client';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';

const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: ink,
  transport: http(),
});

const mobile = new MobileClient({
  url: MOBILE_CLIENT_ENDPOINTS.inkMainnet,
  walletClient,
});

// Unsigned public lookups
const availability = await mobile.getUsernameAvailability({ displayName: 'Alice.One' });
const profile = await mobile.getPublicProfile({ username: 'alice-one' });

// Signed operations
const identity = await mobile.getSelfIdentity({
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  chainId: ink.id,
  verifyingAddr: '0x...',
});

await mobile.claimUsername({
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  chainId: ink.id,
  verifyingAddr: '0x...',
  displayName: 'Alice.One',
});
```

## API Surface

### Public Queries

`getUsernameAvailability`, `getPublicProfile`.

### Signed Queries

`getSelfIdentity`.

### Signed Executes

`claimUsername`, `updateUsername`, `setPrivateMode`.

### Linked Signers

The mobile client supports linked signers for delegated transaction signing:

```ts
mobile.setLinkedSigner(linkedSignerWalletClient);
```

## License

ISC
