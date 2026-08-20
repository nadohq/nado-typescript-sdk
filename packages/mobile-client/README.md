# `@nadohq/mobile-client`

HTTP client for the Nado mobile service API. Manages usernames, public profile lookups, the global trade feed,
the follower/following graph, privacy settings, and push notification devices/preferences, using EIP-712 +
msgpack signed authentication.

[Full SDK Documentation](https://nadohq.github.io/nado-typescript-sdk/index.html)

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
const profile = await mobile.getPublicProfile({
  subaccountOwner: '0x...',
  subaccountName: 'default',
});

// Signed operations
await mobile.setUsername({
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  chainId: ink.id,
  verifyingAddr: '0x...',
  displayName: 'Alice.One',
});
```

## API Surface

### Public Queries

`getUsernameAvailability`, `getPublicProfile`, `getFeed`, `getNotificationPreferences`, `getRegisteredWallet`.

### Public Executes

`unregisterExpoToken`, `updateNotificationPreferences`. These are authenticated by possession of an active Expo
push token rather than a wallet signature, so they still work at logout when a signature may be unobtainable.

### Signed Queries

`getFollowSummary`, `getFollowers`, `getFollowing`. Every follow graph read is signed because the results are
relative to the signing Viewer, including each paginated request.

### Signed Executes

`setUsername`, `setPrivateMode`, `registerExpoToken`, `setFollow`.

### Linked Signers

The mobile client supports linked signers for delegated transaction signing:

```ts
mobile.setLinkedSigner(linkedSignerWalletClient);
```

## License

ISC
