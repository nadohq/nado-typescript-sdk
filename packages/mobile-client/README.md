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
`getFriendsFeed`, `getProfileFeed`, `getMarketFeed`, `getPositionFeed`, `getFeedItem`, `getFeedUpdates`,
`getSelfFeedPositions`, `resolveFeedPosition`, `resolveFeedAction`, `getFeedChartDrawing`, `getFeedComments`,
`getPositionHistory`, `getPositionHistoryAll`, `getPositionThoughts`, `getPositionChart`, `getPositionWatchers`.

`getNotificationRegistrationV2` and `getNotificationSettingsV2` use an active Expo token as their credential,
not a wallet signature. Before displaying wallet settings, compare the wallet returned by `getRegisteredWallet`
with the connected wallet (case-insensitively).

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
`getFeedItem` reads one item without counting a view. Report views independently with `recordFeedViews`. `getFeedUpdates` polls session patches
using the returned `viewerToken`. All are unsigned. Profile, position, and item reads include the `viewAs`
account's own hidden content under `account_view`; the viewing account is not proof of wallet ownership.
Prices are decimal `BigNumber` values; quantities, notionals, and PnL retain x18 units. See method and
parameter JSDoc for session and polling rules.

`getSelfFeedPositions`, `resolveFeedPosition`, and `resolveFeedAction` require `viewAs` and return eligibility
hints for that account, not authenticated permissions. `getFeedComments` supports anchored, bidirectional
thread pagination. Lists, details, and history return parsed drawings and readable comment previews;
`getFeedChartDrawing` refreshes a drawing independently when needed.

`getPositionHistory` returns the full action/take timeline, distinct from published-only `getPositionFeed`,
and a position-mode session for navigation and updates. `getPositionChart` returns candles and action markers,
keeping execution and liquidation Oracle prices separate. `getPositionWatchers` reads visitor counts without
registering presence. Watching account previews are self-reported, not proof of account ownership.

### Position history and thoughts

`getPositionHistory` and `getPositionHistoryAll` return `owner`, the current position owner's full profile,
even for an empty timeline. Do not infer ownership from a take or the viewing account.
Position patches do not refresh owner information; query history or profiles again.

`getPositionHistoryAll` returns only the most recent 500 actions, ordered by last event time and action UUID
descending. It excludes authored content: `relatedTake` is null and `summary.takeCount` is zero, even when
thoughts exist. `summary.actionCount` counts this response's scope. `nextCursor: null` means this endpoint
does not paginate, not that all history was returned. Use `getPositionHistory` with a fresh first request
for complete history. Each call creates a new session; only `viewerToken` may be reused.
Limit, cursor, and sessionId are not accepted.

`getPositionThoughts` returns only published posts/trade cards with both nonblank text and a saved drawing.
Uploaded/external images do not qualify. It returns full parsed drawing data and keeps descending first
drawing creation time / item UUID order. Do not sort by displayAtMs or updatedAtMs. Changing an existing
drawing does not move it; saved data need not contain visible strokes.

```ts
const first = await mobile.getPositionThoughts({ positionId, limit: 20 });
if (first.nextCursor !== null) {
  const next = await mobile.getPositionThoughts({
    positionId,
    limit: 20,
    sessionId: first.readSession.sessionId,
    viewerToken: first.readSession.viewerToken,
    cursor: first.nextCursor,
  });
}
```

There is no 500-item total cap for thoughts. Continue until nextCursor is null, even when a page is empty.
Keep positionId, limit, and credentials unchanged; omitted viewAs inherits the original perspective.
Thoughts sessions cannot be exchanged with history/feed sessions. New eligible content requires refreshing.
Fully delivered items support existing detail, drawing, image, and update APIs with the returned session.
A 6328 error means the initial directory exceeded capacity; do not automatically retry the same query.
A 6312 error requires a fresh session. Neither condition represents a successfully truncated result.

### Public Executes

`unregisterExpoToken`, `updateNotificationPreferences`, `updateNotificationSettingsV2`. These are authenticated by possession of an active Expo
push token rather than a wallet signature, so they still work at logout when a signature may be unobtainable.

`recordFeedViews` accepts `itemIds`, an array of 1–50 canonical lowercase UUIDs. Posts, trade cards,
comments, and replies can be mixed; only the supplied IDs increment, without incrementing their parents.
It sends only `type` and `item_ids` to `/public_execute`, without a wallet signature or reading session,
and returns `{ status: 'success' }`. Same-request duplicates count once, but another request increments
again. Missing, deleted, unpublished, excluded, and unsupported targets are skipped; even an entirely
skipped batch returns success. Invalid fields, UUIDs, or array sizes reject the entire batch.

```ts
await mobile.recordFeedViews({ itemIds: [postId, commentId, replyId] });
```

This operation is **not idempotent**: retrying after an uncertain network failure may count twice.
The SDK does not automatically retry. Read current counts from `interaction.viewCount` in details,
comment groups and their `replies`, previews, or session updates; the report returns no per-item counts.
The detail request no longer accepts `viewEventId`, and reading sessions no longer return `viewTracking`.

`setPositionPresence` still requires reading-session credentials and a page-scoped `viewSessionId`.
Pagination, updates, and protected image reads also keep their existing session rules. Fetch uploaded
image bytes with `getFeedImageBytes` using the original credentials and paths from image metadata.
Legitimate session reads renew the idle expiration; use the latest `expiresAtMs`. View reports neither
require nor renew a reading session.

### Comment groups

`getFeedComments` returns top-level `comments`, each with a complete flat `replies` array containing all
readable descendants in the thread snapshot. The `limit` (default 20, range 1–50) counts top-level groups;
descendants do not consume the limit and do not have separate cursors or nested `replies` arrays.
Top-level comments are newest first; descendants are oldest first with depth then UUID breaking timestamp
ties. Original parent relationships remain in `replyToItemId` and `replyToAuthor`.

`totalCount` counts all readable replies in the thread snapshot; `topLevelCount` counts only top-level
comments. Neither is limited to the returned page. An `anchorReplyId` at any depth returns its top-level
group and is echoed in the response. Forward/backward cursors never split a group. An unreadable ancestor
also makes its descendants unreadable. New replies at any depth require refreshing; updates only modify
already delivered content.

```ts
const page = await mobile.getFeedComments({ rootItemId, limit: 20 });
for (const group of page.comments) {
  // Render the top-level comment, followed by group.replies in the returned order.
}
```

Comment previews remain individual replies. A preview's `nextCursor` opens the first complete group page
in the same snapshot; replace the preview with that page instead of prepending preview items.

### Feed image reads

For React Native `Image` or expo-image, use `getFeedImageRequest` to pass the authenticated
URL and headers directly without converting bytes to base64:

```ts
import { isMobileSocialFeedUploadedImage } from '@nadohq/mobile-client';

const source = isMobileSocialFeedUploadedImage(image)
  ? (() => {
      const { url, headers } = mobile.getFeedImageRequest({
        path: image.url,
        sessionId: readSession.sessionId,
        viewerToken: readSession.viewerToken,
      });
      return { uri: url, headers };
    })()
  : { uri: image.url }; // External URL: never attach Mobile session headers.
```

### Signed Executes

`setUsername`, `setBio`, `createAvatarUpload`, `setAvatar`, `setPrivateMode`, `registerExpoToken`, `setFollow`,
`createFeedPost`, `createFeedComment`, `createFeedPostImageUpload`, `createFeedCommentImageUpload`,
`createFeedChartDrawing`, `updateFeedChartDrawing`, `setFeedLike`, `registerExpoTokenV2`,
`updateNotificationSubscriptions`, `recordProductEvents`.

Upload images one at a time with the multipart helpers (≤ 2 MiB whole request), then pass ordered ready
`imageIds` to `createFeedPost` / `createFeedComment`. The SDK throws `RangeError` before requesting a signature or sending a request
that exceeds `MOBILE_FEED_IMAGE_MAX_REQUEST_BYTES`, including the signed payload and multipart framing.
Unconfigured image storage returns `SOCIAL_FEED_DATA_UNAVAILABLE` (6320, HTTP 503).
Posts still require nonblank text or a drawing; comments
still require nonblank text. See method and parameter JSDoc for publication, retries, mention offsets, drawing
data, and mutation ordering.

Posts and comments also accept `imageUrls`, up to ten HTTP/HTTPS URLs independent of the nine uploaded
images. URLs must include a hostname and contain no whitespace/control characters. Omit the field or pass
`[]`; null and the old wire field `image_url` are rejected. The SDK signs `image_urls` after `image_ids`.
Keep original URL strings, array order, and field presence unchanged on retries: omission and `[]` hash
differently. Coordinate this request change with the service version; old `image_url` retries are incompatible.

Responses keep one `images` array: upload metadata first, then URL-only objects in submitted order.
`MobileSocialFeedImage` represents uploaded images or external URLs; narrow with
`isMobileSocialFeedUploadedImage` before accessing upload metadata.
Direct upload methods return `MobileSocialFeedUploadedImage` with all metadata. Load external URLs directly
without Mobile session headers.

### Signed Queries

`getNotificationSubscriptions` and `getNotificationInboxV2` use wallet authentication on `/query`.
They do not require an Expo token or system push permission. The configured linked signer is supported.

### Notifications V2

The notification v2 operations are available on `MobileClient`, including `client.context.mobileClient` from
`@nadohq/client`. Settings, capabilities, subscriptions, inbox data, and product events use camelCase SDK models.
The SDK maps requests to snake_case wire fields and removes the success envelope from read results.

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
    payloadVersions: [2],
    typeIds: ['order_fill', 'new_follower'],
    routes: ['portfolio', 'profile'],
  },
});
const registration = await mobile.getNotificationRegistrationV2({ expoToken });
const current = await mobile.getNotificationSettingsV2({ expoToken });
const saved = await mobile.updateNotificationSettingsV2({
  expoToken,
  expectedRevision: current.revision,
  settings: { ...current.settings, positionThresholds: [25] },
});

const subscriptions = await mobile.getNotificationSubscriptions(auth);
await mobile.updateNotificationSubscriptions({
  ...auth,
  update: {
    expectedRevision: subscriptions.revision,
    market: { productId: 2, subscribed: true },
  },
});
const updatedSubscriptions = await mobile.getNotificationSubscriptions(auth);
const inbox = await mobile.getNotificationInboxV2({ ...auth, limit: 20 });
```

- Declare only types/routes the application handles. Re-registration advances the generation and cancels
  old pending deliveries; calling legacy `registerExpoToken` resets capabilities to v1.
- Settings replacement requires every field. Settings and subscription revisions are independent.
  On `MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT` (6203), re-read and merge only the current user change.
- A subscription update selects exactly one operation; omit the other operations and the SDK sends them as `null`. Successful subscription
  updates return only status, so re-query even after repeated ON/OFF. Favorites import merges once, never replaces.
- Enabling a bell requires following the target. Unfollowing clears its bell without advancing the subscription
  revision; refresh subscriptions after follow mutations. Bells are Identity-scoped; markets are wallet-scoped.
  Pass `traderBell.subaccount` as a `Subaccount` (`subaccountOwner` and `subaccountName`); the SDK encodes it for signing.
- Inbox pages are accepted intents, not delivery/read receipts. There is no title/body, unread count, mark-read,
  or delete operation. Do not use the unimplemented legacy `notification_history` route.
  An unknown destination rejects the page with `MobileUnsupportedNotificationRouteError`.
- `recordProductEvents({ ...auth, events })` accepts 1-50 events atomically. Provide the fields required by `eventName`,
  actual millisecond timestamps, and stable `clientEventId` UUIDs across retries. The SDK fills unused wire fields with `null`. Supported
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
