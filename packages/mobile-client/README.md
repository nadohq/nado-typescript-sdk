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

### Send Money

- `submitTip` submits an owner-signed `WithdrawCollateralV2` through Mobile. The outer Mobile
  authorization supports linked signers; the inner withdrawal still requires the owner signature.
- `getTipDetail` reads participant-visible detail, including sender fees and Gateway state or recipient
  read state.
- `getTipsHistory` reads paginated incoming and outgoing Tip activity in server order.
- `getReceivedTips` reads unseen, verified-credit cards, oldest first.
- `markTipsSeen` acknowledges displayed Tip IDs. Tip reads do not acknowledge them, and notification
  read state is managed independently by `markNotificationsSeen`.
- `getTipCollateralMappings` reads optional attribution for exact Indexer submission indices. Existing
  Indexer deposit and withdrawal amounts remain unchanged.

Build the inner withdrawal with `engine.payloadBuilder.buildWithdrawCollateralV2Payload(...)`, using
product 0, the recipient DDA as `sendTo`, and appendix zero. Its amount uses native asset units
(USDT0 has six decimals). Pass the resulting transaction and owner signature to Mobile:

```ts
const result = await mobile.submitTip({
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  chainId,
  verifyingAddr,
  recipientSubaccount,
  originPostId: null,
  note: 'Nice call!',
  backgroundId,
  visibility: 'private',
  withdrawal: withdrawalPayload.tx,
  withdrawalSignature: withdrawalPayload.signature,
  maxFeeX18: confirmedFeeX18,
});
```

The `maxFeeX18` input is the user-confirmed fee cap in x18 units. Response amounts such as `netAmount`,
`senderCost.maxFee`, and collateral mapping totals are `BigNumber` values that also retain x18 units.
Use `removeDecimals` for display. Unknown amounts remain `null`; an explicit zero is a known amount.
Versions and submission indices remain exact strings. See method and parameter JSDoc for status,
retry, authorization, and pagination details.

Use the withdrawal `getDynamicFeeQuote().requiredFee` for the confirmation quote. `feeCap` is the
Gateway ceiling. `maxWithdrawable` is in x18 units and already accounts for the dynamic fee; do not
subtract the fee again. `getTipDetail().feedItemId` identifies the currently readable public Tip, or is
null when it has no readable public item. It differs from the payment `tipId`.

### Public Queries

`getAvatarPresets`, `getUsernameAvailability`, `getProfiles`, `searchProfiles`, `getFollowers`, `getFollowing`, `getFeed`,
`getNotificationPreferences`, `getRegisteredWallet`, `getForYouFeed`, `getTopTradersFeed`,
`getFriendsFeed`, `getProfileFeed`, `getMarketFeed`, `getPositionFeed`, `getFeedItem`, `getFeedUpdates`,
`getPositionLookup`, `getSelfFeedPositions`, `resolveFeedPosition`, `resolveFeedAction`, `getFeedChartDrawing`, `getFeedComments`,
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

Feed lists and item details expose `capabilities.canTip` using the existing request parameters. Show
the tip button only when it is exactly `true` and the author wallet differs from the connected wallet
(compare addresses case-insensitively). An omitted capability does not enable tipping.
For a post or trade-card Tip, pass the item's `id` as `originPostId` and
`subaccountFromHex(item.author.subaccount)` as `recipientSubaccount`.

Original posts and trade cards can include `publicTipTotal`, a `BigNumber` in USDT0 x18 units.
Omission hides the amount; an explicit zero means there are no qualifying Tips. Display the aggregate
returned by the server. Tips must be enabled for eligible public published originals to expose this
total. On a reset response, an omitted total clears the previously displayed amount. Ordinary deltas
leave an omitted field unchanged; do not apply the reset rule to every optional patch field.
An omitted or false `canTip` disables tipping. For example, with an optional connected
`currentWalletAddress`:

```ts
import { removeDecimals, subaccountFromHex } from '@nadohq/shared';

const { item } = await mobile.getFeedItem({ itemId, includeTips: true });
const authorWallet = subaccountFromHex(item.author.subaccount).subaccountOwner;
const showTipButton =
  item.capabilities.canTip === true &&
  currentWalletAddress !== undefined &&
  authorWallet.toLowerCase() !== currentWalletAddress.toLowerCase();
const publicTipAmount =
  (item.kind === 'post' || item.kind === 'trade_card') &&
  item.publicTipTotal !== undefined
    ? removeDecimals(item.publicTipTotal).toFixed()
    : undefined;
```

`getSelfFeedPositions`, `resolveFeedPosition`, and `resolveFeedAction` require `viewAs` and return eligibility
hints for that account, not authenticated permissions. `getFeedComments` supports anchored, bidirectional
thread pagination. Lists, details, and history return parsed drawings and readable comment previews;
`getFeedChartDrawing` refreshes a drawing independently when needed.

`getPositionLookup` resolves an indexer position's identity into the lifecycle UUID used by the position APIs:

```ts
const { positionId } = await mobile.getPositionLookup({
  subaccount: { subaccountOwner: '0x...', subaccountName: 'default' },
  productId: 4,
  marginMode: 'cross',
  direction: 'long',
  openId: '123456789',
});
```

Keep `openId` as a decimal string to preserve the opening submission index exactly. This public lookup
requires no wallet signature or reading session.

`getPositionHistory` returns the full action/take timeline, distinct from published-only `getPositionFeed`,
and a position-mode session for navigation and updates. `getPositionChart` returns candles and action markers,
keeping execution and liquidation Oracle prices separate. `getPositionWatchers` reads visitor counts without
registering presence. Watching account previews are self-reported, not proof of account ownership.

### Public Tips

Enable public Tips with `includeTips: true` on a new `getForYouFeed`, `getFriendsFeed`, `getFeedItem`,
or `getFeedComments` session. The option is omitted by default. Later pages may omit it to inherit the
session capability; changing it requires a new session and cursors. `getFeedUpdates` inherits the
capability from its session. Friends requires the full `viewAs` subaccount and includes a public Tip
when either its sender or recipient is followed, without duplicating Tips that qualify through both.

```ts
const feed = await mobile.getForYouFeed({ includeTips: true, feedTypes: ['tips'], limit: 20 });
const detail = await mobile.getFeedItem({ includeTips: true, tipId });
```

`getFeedItem` accepts exactly one of `itemId` (public Feed UUID) and `tipId` (payment UUID). A public
Tip has `kind: 'tip'`, sender/recipient profiles, `netAmount` in x18 units, background metadata, and a
nullable `original` preview. Its author is the sender; `market` and `drawing` are null and it has no
position. Replies beneath a Tip may also have `market: null`. Explicit old-only feed filters,
`marketCategory`, or `minimumNotional` exclude Tips.
Tip patches refresh participants, interactions, original previews, and availability while preserving
the complete item's existing amount and payment identifiers.

### Social feed values

Each named social feed string union has a corresponding `MOBILE_SOCIAL_FEED_*` array for runtime
validation and filter or UI options. The types are derived from these readonly tuples so the runtime
values and TypeScript unions stay in sync. Import them from `@nadohq/mobile-client` or `@nadohq/client`:

```ts
import {
  MOBILE_SOCIAL_FEED_TYPES,
  MOBILE_SOCIAL_FEED_MARKET_CATEGORIES,
  MOBILE_SOCIAL_FEED_TRADER_BADGE_CODES,
  MOBILE_SOCIAL_FEED_SOURCE_CATEGORIES,
  MOBILE_SOCIAL_FEED_CHART_INTERVALS,
} from '@nadohq/mobile-client';
```

The same pattern covers cohort and trader data statuses, PnL and funding bases and qualities,
position and history states, actions, resolutions, reading sessions, attachments, and presence.

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

#### Position ROI and funding

`getPositionHistory` and `getFeedUpdates` retain `roiBasis` on position cards and patches,
including nested attachments. Other feed reads and writes, including `getPositionHistoryAll`,
omit it. A session whose initial response omitted ROI can still receive it through updates.
The SDK preserves this omission instead of creating a `null` or `undefined` property.

`roiBasis.amount` and `pnl.amount` are `BigNumber` values in x18 units. Calculate the ROI
percentage with `pnl.amount.div(roiBasis.amount).times(100)` only when both amounts are
non-null, both qualities are `ready`, and the denominator is positive. Missing or unavailable
ROI data must not be treated as zero.

Both history methods and history updates through `currentPosition` expose `fundingBasis`:
`remaining_position` for open positions, `lifecycle_cumulative` for closed positions, or
`unknown` when the scope is unavailable. Funding amounts remain in x18 units. Estimated
liquidation prices remain in decimal units; check their quality and clear an old displayed
price when the new value is unavailable or null.

### Public Executes

`unregisterExpoToken`, `updateNotificationPreferences`, `updateNotificationSettingsV2`. These are authenticated by possession of an active Expo
push token rather than a wallet signature, so they still work at logout when a signature may be unobtainable.

`recordFeedViews` accepts `itemIds`, an array of 1–50 canonical lowercase UUIDs. Posts, trade cards,
public Tips, comments, and replies can be mixed; only the supplied IDs increment, without incrementing their parents.
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

`setPositionPresence` still requires reading-session credentials and a page-scoped `viewSessionId`.
Pagination, updates, and protected image reads also keep their existing session rules. Fetch uploaded
image bytes with `getFeedImageBytes` using the original credentials and paths from image metadata.
Legitimate session reads renew the idle expiration; use the latest `expiresAtMs`. View reports neither
require nor renew a reading session.

### Comment groups

`getFeedComments` returns top-level `comments`, each with a complete flat `replies` array containing all
readable descendants in the thread snapshot. The `limit` (default 20, range 1–50) counts top-level groups;
descendants do not consume the limit and do not have separate cursors or nested `replies` arrays.
With `includeTips: true`, each top-level group is a Reply or public Tip directly extended with `replies`.
Preserve server order: eligible hot ordinary replies lead, while Tips are ranked by net amount and
inserted at positions 2, 5, 8, 11, and so on. Children are oldest first. Ordinary replies retain their
parent relationships in `replyToItemId` and `replyToAuthor`.

`totalCount` counts all readable Tips and ordinary replies in the thread snapshot; `topLevelCount`
counts top-level groups. Neither is limited to the returned page. `anchorTipItemId`, `anchorReplyId`,
and `cursor` are mutually exclusive. The Tip anchor uses its public Feed UUID; the reply anchor returns
the reply's top-level group. Legacy sessions omit `anchorTipItemId` in the response. Forward/backward
cursors never split a group. An unreadable ancestor also makes its descendants unreadable. New group
membership can invalidate the session; on 6312, discard the session and cursors and reopen. Like/view
changes preserve session order.

```ts
const page = await mobile.getFeedComments({ rootItemId, limit: 20 });
for (const group of page.comments) {
  // Render the top-level comment, followed by group.replies in the returned order.
}
```

Comment previews remain individual replies. A preview's `nextCursor` opens the first complete group page
in the same snapshot; replace the preview with that page instead of prepending preview items.

To reply directly to a Tip, pass its public Feed UUID as `rootItemId` and omit `replyToItemId`.
To reply to one of its comments, also pass the comment UUID as `replyToItemId`. Like and view operations
also use public Feed UUIDs. The signed write's `rootCommentCount` counts that root's replies and does
not replace the mixed thread's `totalCount`. An app may temporarily pin its newest ordinary top-level
reply only at the actual top of the current visit, deduplicated by ID, without changing server counts
or cursors.

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
`updateNotificationSubscriptions`, `recordProductEvents`, `submitTip`, `markTipsSeen`, `markNotificationsSeen`.

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

Optionally pass `externalImageDimensions` in the same order and length as `imageUrls`, excluding uploads:

```ts
imageUrls: ['https://example.com/a.webp', 'https://example.com/b.gif'],
externalImageDimensions: [{ width: 165, height: 231 }, null],
```

Each known entry contains only positive integer `width` and `height` in pixels, at most 4,294,967,295;
use `null` for an unknown entry. The whole field may be omitted but cannot be `null`. The SDK signs
`external_image_dimensions` after `image_urls`, with each object's `width` before `height`. Keep dimensions
and field presence unchanged on retries; adding dimensions to an earlier request changes its idempotency
hash. The service stores the supplied dimensions without fetching the URL or backfilling existing content.

Responses keep one `images` array: upload metadata first, then external URL objects in submitted order.
External images include optional `width` and `height` together when known; both are omitted otherwise,
including in comment previews, replies, position history, and thoughts.
`MobileSocialFeedImage` represents uploaded images or external URLs; narrow with
`isMobileSocialFeedUploadedImage` (which checks `imageId`) before accessing upload metadata, since
dimensions may also be present on external images.
Direct upload methods return `MobileSocialFeedUploadedImage` with all metadata. Load external URLs directly
without Mobile session headers.

### Signed Queries

`getNotificationSubscriptions`, `getNotificationInboxV2`, `getTipCollateralMappings`,
`getTipDetail`, `getTipsHistory`, and `getReceivedTips` use wallet authentication on `/query`.
They do not require an Expo token or system push permission. The configured linked signer is supported.

`getCreatorEarningsSummary` returns the signing Identity's Creator Rate and its lifetime and claimable
creator earnings in x18 units. The sender must be an Identity Subaccount; isolated subaccounts are rejected.

```ts
const summary = await mobile.getCreatorEarningsSummary(auth);
const lifetimeUsd = removeDecimals(summary.lifetime);
```

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
    typeIds: ['order_fill', 'new_follower', 'tip_received', 'tip_liked', 'tip_replied', 'feed_liked', 'feed_replied'],
    routes: ['portfolio', 'profile', 'tip', 'tip_thread', 'feed_thread'],
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
const inbox = await mobile.getNotificationInboxV2({
  ...auth,
  limit: 20,
  supportedTypes: ['deposit_completed', 'new_follower', 'tip_received', 'tip_liked', 'tip_replied', 'feed_liked', 'feed_replied'],
});
// Acknowledge only notification IDs that were actually displayed.
await mobile.markNotificationsSeen({ ...auth, notificationIds: displayedNotificationIds });
```

- Declare only types/routes the application handles. Re-registration advances the generation and cancels
  old pending deliveries; calling legacy `registerExpoToken` resets capabilities to v1.
- The deployed v2 settings document has `schemaVersion: 2`. Replacement requires the nine original fields;
  optional `likesAndReplies` preserves its saved value when omitted, while explicit false disables it.
  Copy the current document and change only the user's choice. Settings and subscription revisions are independent.
  On `MOBILE_ERROR_CODES.NOTIFICATION_REVISION_CONFLICT` (6203), re-read and merge only the current user change.
- A subscription update selects exactly one operation; omit the other operations and the SDK sends them as `null`. Successful subscription
  updates return only status, so re-query even after repeated ON/OFF. Favorites import merges once, never replaces.
- Enabling a bell requires following the target. Unfollowing clears its bell without advancing the subscription
  revision; refresh subscriptions after follow mutations. Bells are Identity-scoped; markets are wallet-scoped.
  Pass `traderBell.subaccount` as a `Subaccount` (`subaccountOwner` and `subaccountName`); the SDK encodes it for signing.
- V2 Inbox pages contain accepted intents with `createdAt` in UTC milliseconds. When included, `seenAt`
  is null while unread or a first-display timestamp in UTC milliseconds. Older responses may omit it;
  omission remains absent in the SDK model and means read state is unavailable. Reading does not
  acknowledge notifications. `markNotificationsSeen` updates notification read state independently of
  Tip receipts. Push delivery remains separate.
  New Tip and Feed engagement notifications include server-provided `title` and `body`; older notification
  data may omit them. These pages provide no unread count or delete operation.
  Do not use the unimplemented legacy `notification_history` route.
  An unknown destination rejects the page with `MobileUnsupportedNotificationRouteError`.
- `supportedTypes` is typed to the current `MOBILE_NOTIFICATION_TYPE_IDS` subset that this SDK
  can decode. Omission selects the server's default types and `[]` returns an empty page; at most 64
  entries are allowed. Pass an explicit supported subset for stable decoding. Omission selects legacy
  types, so explicitly include supported Tip and Feed types
  to receive the new notifications. Unknown types are not supported by this client.
  The canonical signed field order is `type`, `cursor`, `limit`, then `supported_types` only when supplied;
  omitted cursor and limit remain explicit null. Keep the same filters when paging.
- `recordProductEvents({ ...auth, events })` accepts 1-50 events atomically. Provide the fields required by `eventName`,
  actual millisecond timestamps, and stable `clientEventId` UUIDs across retries. The SDK fills unused wire fields with `null`. Supported
  names are `notif_opened`, `market_viewed`, `chart_opened`, and `search`; obtain analytics consent first.
- Legacy preferences remain supported and synchronize overlapping v2 fields. Keep legacy push parsing because
  order notifications may use a v1 fallback even for v2 registrations.

`tip_received` routes to `tip` with the payment `tipId` for participant detail. `tip_liked` and
`tip_replied` route to `tip_thread`; `feed_liked` can route to either `feed_thread` or `tip_thread`,
and `feed_replied` routes to `feed_thread`. New notification data uses payload version 2 and template
version 1. Push eligibility requires both a declared type and route; Inbox filters only by type.

For a `tip_thread` route with an `originPostId`, open that root with `includeTips: true` and
`anchorTipItemId: route.feedItemId`, then find any `replyItemId` inside the group. On original 6313 or
Tip anchor 6318, try an independent thread rooted at `feedItemId`, optionally with `anchorReplyId`.
On 6312, first reopen the session and retry the original target. `feed_thread` uses `rootItemId` and
optional `replyItemId` as `anchorReplyId`. Show unavailable content when the target cannot be read.
Tip receipt read state, Inbox read state, and push delivery are independent.

### Linked Signers

The mobile client supports linked signers for delegated transaction signing:

```ts
mobile.setLinkedSigner(linkedSignerWalletClient);
```

## License

ISC
