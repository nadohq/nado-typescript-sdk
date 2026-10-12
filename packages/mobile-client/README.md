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
`getNotificationPreferences`, `getRegisteredWallet`.

`getProfiles` is the only profile route: it batches up to 25 subaccounts, returns them in the requested order,
and carries follower totals (`include.followCounts`) and a follow summary (`include.followSummary.viewAs`) as
opt-in includes, so use it for a single subaccount too. The backend still serves the older singular `profile`
request for compatibility, but it returns base fields only and costs more weight than the batched equivalent,
so the SDK does not expose it.

`getFollowers` and `getFollowing` take an optional `viewAs`, which selects a viewer perspective rather than
proving one: with it the page is ordered familiar-first and every row carries an `isFollowing`, without it the
page is ordered by the listed relationship alone and `isFollowing` is absent rather than `false`. As with
`include.followSummary.viewAs`, an unsigned route means the claimed viewer is not verified.

### Social Feed Reads

All eight reads live directly on `MobileClient`:

| Method | Content | Access |
| --- | --- | --- |
| `getForYouFeed` | Chronological recommendations | Public only; optional viewAs |
| `getTopTradersFeed` | Qualified authors and account PnL badges | Public only; optional viewAs |
| `getFriendsFeed` | Public content by authors followed by viewAs | Public only; required viewAs |
| `getProfileFeed` | One author's published content | Public or signed |
| `getMarketFeed` | One market's published content | Public or signed |
| `getPositionFeed` | Published content in one lifecycle | Public or signed |
| `getFeedItem` | Item details and reading session | Public or signed |
| `getFeedUpdates` | Viewport patches and new-content hints | Public with viewer token, or signed |

Public browsing never requires a wallet signature, identity registration, or 1-Click Trading setup.
For You, Top Traders, and Friends only use `/public_query` and do not accept `auth`.
Friends requires `viewAs` on every request, including pagination; an account with no
follows receives an empty list.

`viewAs` uses the SDK's `{ subaccountOwner, subaccountName }` shape and is encoded as a
complete bytes32 identity subaccount, not a 20-byte wallet address. It must be non-isolated.
It selects public relationship state and never grants private access. The Profile target
`subaccount` is separate from `viewAs`; the SDK does not infer a viewing account from it.

Profile, Market, Position, and item details also default to public. Only pass `auth` when
explicitly requesting a signed read for private content. It contains `subaccountOwner`,
`subaccountName`, `chainId`, and `verifyingAddr`; the configured linked signer takes priority.
Signed reads cannot carry `viewAs` or `viewerToken`. Updates follow the original session's
public/signed mode and inherit its viewing account; they never accept `viewAs`.

```ts
const viewAs = { subaccountOwner: walletAddress, subaccountName: 'default' };
const friends = await mobile.getFriendsFeed({ viewAs, limit: 20 });
const page = await mobile.getForYouFeed({ viewAs, minimumNotional: 500, limit: 20 });
const { sessionId, viewerToken } = page.readSession;

// Keep the same filters, target, limit, viewAs, and browser credential throughout this session.
if (page.nextCursor !== null) {
  const next = await mobile.getForYouFeed({
    viewAs,
    minimumNotional: 500,
    limit: 20,
    sessionId,
    viewerToken,
    cursor: page.nextCursor,
  });
}

if (viewerToken) {
  const updates = await mobile.getFeedUpdates({
    sessionId,
    viewerToken,
    visibleItemIds: page.items.map((item) => item.id),
    visiblePositionIds: [],
    viewportRevision: 0,
    requestSeq: 1,
  });
}
```

Response keys use camelCase without `X18` suffixes. Quantities, notionals, and PnL amounts
are exact `BigNumber` integers in x18 units; divide these by `10^18` for display. Prices
(such as `entryPrice`, `averagePrice`, and liquidation prices) are already decimal
`BigNumber` values. Versions remain decimal strings
and must be compared with `BigInt` or `BigNumber`. Explicit `null` in a patch clears the
old value; omitted fields leave it unchanged.

With a viewing account, `author.isFollowing` reflects its actual follow state; without one,
it is `null`. `interaction.likedByMe` stays `null` while likes are unavailable, including on
signed reads. Trade rows do not have an `interaction` field.

Sessions expire 15 minutes after creation. Continue through short or empty pages while
`nextCursor` is non-null. Keep pagination cursors, update cursors, and watermarks separate.
For polling, increment `viewportRevision` when visible IDs change and `requestSeq` on
every call. Apply only the current viewport's latest response and discard responses from
older refreshes. Patches do not insert or reorder list members. Refresh on
`MOBILE_ERROR_CODES.SOCIAL_FEED_SESSION_EXPIRED` (6312); a mismatch (6311) requires
correcting the session/identity/source rather than retrying unchanged. Keep viewer tokens
out of logs and public caches. A public session still needs its original viewer token when a
wallet is connected or `viewAs` is supplied. List pagination must repeat the initial `viewAs`
(or continue omitting it); item details reusing a session may omit it to inherit the perspective.
To switch accounts or public/signed modes, create a new session and reset cursors, visible IDs,
and polling sequence state. Stop using the old state as soon as a refresh begins; resume
pagination and polling only after the new first page succeeds. Invalid or expired public
credentials require a refresh, not a wallet signature.

The social feed exposes automatic trade cards/rows; drawings and interactions are not enabled.
`getPositionFeed` is published activity, not complete position history. The legacy
`getFeed`, `setFollow`, and `setPrivateMode` contracts remain available unchanged.

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
