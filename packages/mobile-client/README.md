# `@nadohq/mobile-client`

HTTP client for the Nado mobile service API. Manages usernames, public profile lookups, global and
session-based trade feeds, the follower/following graph, privacy settings, and push notification
devices/preferences. Public queries require no wallet; authenticated operations use EIP-712 + msgpack signing.

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
const [profile] = await mobile.getProfiles({
  subaccounts: [{ subaccountOwner: '0x...', subaccountName: 'default' }],
  include: { followCounts: true },
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

`getUsernameAvailability`, `getProfiles`, `getFollowers`, `getFollowing`, `getFeed`,
`getNotificationPreferences`, `getRegisteredWallet`, `getForYouFeed`, `getTopTradersFeed`,
`getFriendsFeed`, `getProfileFeed`, `getMarketFeed`, `getPositionFeed`, `getFeedItem`, `getFeedUpdates`.

`getProfiles` is the only profile route: it batches up to 25 subaccounts, returns them in the requested order,
and carries follower totals (`include.followCounts`) and a follow summary (`include.followSummary.viewAs`) as
opt-in includes, so use it for a single subaccount too. The backend still serves the older singular `profile`
request for compatibility, but it returns base fields only and costs more weight than the batched equivalent,
so the SDK does not expose it.

`getFollowers` and `getFollowing` take an optional `viewAs`, which selects a viewer perspective rather than
proving one: with it the page is ordered familiar-first and every row carries an `isFollowing`, without it the
page is ordered by the listed relationship alone and `isFollowing` is absent rather than `false`. As with
`include.followSummary.viewAs`, an unsigned route means the claimed viewer is not verified.

`getFeed` returns the global trade feed. Session-based feeds include `getForYouFeed`, `getTopTradersFeed`,
and `getFriendsFeed` (requires `viewAs`), plus `getProfileFeed`, `getMarketFeed`, and `getPositionFeed`.
`getFeedItem` reads one item; `getFeedUpdates` polls session patches using the returned `viewerToken`.
All are unsigned. Profile, position, and item reads include the `viewAs` account's own hidden content under
`account_view`; the viewing account is not proof of wallet ownership. Prices are decimal `BigNumber` values;
quantities, notionals, and PnL retain x18 units. See method and parameter JSDoc for session and polling rules.

### Public Executes

`unregisterExpoToken`, `updateNotificationPreferences`. These are authenticated by possession of an active Expo
push token rather than a wallet signature, so they still work at logout when a signature may be unobtainable.

### Signed Executes

`setUsername`, `setPrivateMode`, `registerExpoToken`, `setFollow`.

### Linked Signers

The mobile client supports linked signers for delegated transaction signing:

```ts
mobile.setLinkedSigner(linkedSignerWalletClient);
```

## License

ISC
