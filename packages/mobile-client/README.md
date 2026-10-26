# `@nadohq/mobile-client`

HTTP client for the Nado mobile service API. Manages usernames, bios, avatars, public profile lookups,
global and session-based trade feeds, the follower/following graph, privacy settings, and push notification
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

`getAvatarPresets`, `getUsernameAvailability`, `getProfiles`, `searchProfiles`, `getFollowers`, `getFollowing`, `getFeed`,
`getNotificationPreferences`, `getRegisteredWallet`, `getForYouFeed`, `getTopTradersFeed`,
`getFriendsFeed`, `getProfileFeed`, `getMarketFeed`, `getPositionFeed`, `getFeedItem`, `getFeedUpdates`.

`getNotificationRegistrationV2` and `getNotificationSettingsV2` use an active Expo token as their credential,
not a wallet signature. Verify the token's owner with `getRegisteredWallet` before accessing wallet settings.

`getProfiles` is the only profile route: it batches up to 25 subaccounts, returns them in the requested order,
and carries follower totals (`include.followCounts`) and a follow summary (`include.followSummary.viewAs`) as
opt-in includes, so use it for a single subaccount too. The backend still serves the older singular `profile`
request for compatibility, but it returns base fields only and costs more weight than the batched equivalent,
so the SDK does not expose it.

`searchProfiles` finds claimed profiles by username prefix, paged in ascending username order with an exact match
first. It takes the same `include` as `getProfiles`, which caps the page at 25 instead of 50 and weighs far more
against the shared IP rate limit, so search without it while the user types and enrich once the prefix settles.
A cursor is bound to the query alone, so an enriched page can continue an unenriched search.

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

`unregisterExpoToken`, `updateNotificationPreferences`, `updateNotificationSettingsV2`. These are authenticated by possession of an active Expo
push token rather than a wallet signature, so they still work at logout when a signature may be unobtainable.

### Signed Executes

`setUsername`, `setBio`, `createAvatarUpload`, `setAvatar`, `setPrivateMode`, `registerExpoToken`, `setFollow`,
`registerExpoTokenV2`, `updateNotificationSubscriptions`, `recordProductEvents`.

### Signed Queries

`getNotificationSubscriptions` and `getNotificationInboxV2` use wallet authentication on `/query`.
They do not require an Expo token or system push permission. The configured linked signer is supported.

### Notifications V2

All eight new operations are available on `MobileClient`, including `client.context.mobileClient` from
`@nadohq/client`. Nested settings, capabilities, subscriptions, inbox data, and product events retain the
documented snake_case fields; top-level SDK arguments such as `expoToken` and `expectedRevision` use camelCase.

```ts
const auth = {
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  chainId: ink.id,
  verifyingAddr: '0x...' as const,
};

await mobile.registerExpoTokenV2({
  ...auth,
  expoToken,
  platform: 'ios',
  capabilities: {
    payload_versions: [2],
    type_ids: ['order_fill', 'new_follower'],
    routes: ['portfolio', 'profile'],
  },
});
const registration = await mobile.getNotificationRegistrationV2({ expoToken });
const current = await mobile.getNotificationSettingsV2({ expoToken });
const saved = await mobile.updateNotificationSettingsV2({
  expoToken,
  expectedRevision: current.revision,
  settings: { ...current.settings, position_thresholds: [25] },
});

const subscriptions = await mobile.getNotificationSubscriptions(auth);
await mobile.updateNotificationSubscriptions({
  ...auth,
  update: {
    expected_revision: subscriptions.revision,
    trader_bell: null,
    market: { product_id: 2, subscribed: true },
    import_markets: null,
  },
});
const updatedSubscriptions = await mobile.getNotificationSubscriptions(auth);
const inbox = await mobile.getNotificationInboxV2({ ...auth, limit: 20 });
```

- Declare only types/routes the application handles. Re-registration advances the generation and cancels
  old pending deliveries; calling legacy `registerExpoToken` resets capabilities to v1.
- Settings replacement requires all nine fields. Settings and subscription revisions are independent.
  On `MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT` (6203), re-read and merge only the current user change.
- A subscription update selects exactly one operation; unused fields are `null`. Successful subscription
  updates return only status, so re-query even after repeated ON/OFF. Favorites import merges once, never replaces.
- Enabling a bell requires following the target. Unfollowing clears its bell without advancing the subscription
  revision; refresh subscriptions after follow mutations. Bells are Identity-scoped; markets are wallet-scoped.
- Inbox pages are accepted intents, not delivery/read receipts. There is no title/body, unread count, mark-read,
  or delete operation. Do not use the unimplemented legacy `notification_history` route.
- `recordProductEvents({ ...auth, events })` accepts 1-50 events atomically. Send all six event fields, unused
  fields as `null`, actual millisecond timestamps, and stable `client_event_id` UUIDs across retries. Supported
  names are `notif_opened`, `market_viewed`, `chart_opened`, and `search`; obtain analytics consent first.
- Legacy preferences remain supported and synchronize overlapping v2 fields. Keep legacy push parsing because
  order notifications may use a v1 fallback even for v2 registrations.

### Linked Signers

The mobile client supports linked signers for delegated transaction signing:

```ts
mobile.setLinkedSigner(linkedSignerWalletClient);
```

## License

ISC
