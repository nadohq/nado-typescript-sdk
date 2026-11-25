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

The [25 November 2026 testnet deployment](https://github.com/nadohq/nado-mobile-be/actions/runs/45492386197)
at `450684e` provides the six Tip operations and four notification v2 operations listed below. This
deployment record does not establish availability on other environments. Use the notification v2 routes
and schema documented here for this testnet integration.

`submitTip` authenticates an already owner-signed `WithdrawCollateralV2` through Mobile. The inner
withdrawal requires the owner, while the outer Mobile authorization can use the current linked signer.
Both senders must identify the exact same subaccount, and the recipient must belong to another wallet.

Query `engine.getDynamicFeeQuote({ ...senderSubaccount, kind: 'withdrawal', productId: 0 })` for the fee
and `engine.getMaxWithdrawable({ ...senderSubaccount, productId: 0, spotLeverage: false })` for the
non-borrowing limit. Build the inner transaction using the existing Engine payload builder, with the
recipient's DDA from `indexer.getSubaccountDDA({ subaccount: recipientSubaccount })`. Pass its `tx` and
`signature` through:

```ts
const result = await mobile.submitTip({
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  chainId,
  verifyingAddr,
  recipientSubaccount,
  originPostId: null,
  note: 'Nice call!',
  backgroundId: 'celebration',
  visibility: 'private',
  withdrawal: withdrawalPayload.tx,
  withdrawalSignature: withdrawalPayload.signature,
  maxFeeX18: confirmedFeeX18,
});
```

`withdrawalPayload` is the result of `engine.payloadBuilder.buildWithdrawCollateralV2Payload(...)`,
with product 0, an amount in native USDT0 units, the recipient DDA as `sendTo`, and appendix zero.
The fee cap uses x18 units and must equal the fee explicitly confirmed by the user. Mobile handles
dispatch with borrowing disabled. Calling an Engine withdrawal execute method bypasses the Tip flow.

At `450684e`, testnet requires a minimum net amount of 5 USDT0, encoded as `"5000000"` in the
six-decimal native withdrawal amount. It configures 18 backgrounds: `celebration`, `tip-plain`, and
`tip-01` through `tip-16`. These are environment settings, not SDK constants. Submit only the selected
`backgroundId`; the server fixes the background version at admission.

Read the returned `tipStatus`, `gateway.status`, and `processingReason`, including when HTTP and Mobile
transport succeeded. For the sender, `sending` means Sent. A `review_required` Tip without verified
recipient credit also means Sent when its submission receipt or sender detail reports
`gateway.status === 'accepted'`; an unresolved execution remains Sending. A verified `creditedAtMs`
preserves completed history for both participants even if the current status later enters review.
Before verified credit, the recipient cannot read the Tip detail.

For lost responses, preserve the original withdrawal, its nonce/signature, business fields, and fee cap;
only the outer Mobile authentication can be renewed. When `tipStatus === 'failed'` and
`processingReason === 'FEE_TOO_LOW'`, fetch a fresh Gateway withdrawal quote for the original sending
subaccount and product. Show its `requiredFee` to the user, then pass the confirmed quote as `maxFeeX18`
and the current Tip `version` as `expectedVersion`. Preserve the original withdrawal and inner signature.
Repeat this quote/confirmation flow if the same signal returns. A historical Gateway error alone does
not authorize reconfirmation; the backend checks the nonce and execution evidence again. A 503/1006
during that check preserves the existing Tip. The SDK never increases a cap or retries automatically.

Activity's Tips, Deposits, and Withdrawals tabs are independent. Tips use `getTipsHistory`; Deposits and
Withdrawals retain their existing Indexer pagination and original amounts. Do not hide or reduce an
Indexer entry because a separate Tip or attribution record exists.

`getTipCollateralMappings` is an optional attribution tool, not a prerequisite for those three tabs. It
signs `tips_history(mode=collateral_mapping)` through `/query`, using the handoff's canonical field order
and pinned MessagePack/EIP-712 vector:

```ts
const { mappings } = await mobile.getTipCollateralMappings({
  subaccountOwner: walletClient.account.address,
  subaccountName: 'default',
  chainId,
  verifyingAddr,
  subaccount: {
    subaccountOwner: walletClient.account.address,
    subaccountName: 'default',
  },
  productId: 0,
  direction: 'deposit',
  submissionIndices: ['501', '9007199254740993'],
});
```

The target must share the outer sender's owning wallet. An owner can query any of its subaccounts.
A linked signer needs current authorization on both the outer sender and target subaccounts. When an
attribution tool needs to inspect Indexer entries, query their exact indices. The SDK deduplicates before signing in
first-occurrence order without changing the input array, allowing 1–100 unique indices per request. Indices are
exact decimal strings; amounts remain `BigNumber` values in x18 units, with unknown amounts preserved as
`null`. Results retain request order. Within the same subaccount, product, and direction, merge by
`submissionIdx`, retain `complete` entries, and requery only `pending` entries with fresh outer signatures.
A `complete` / `ordinary` deposit may have `tipTotalX18` equal to zero while `depositTotalX18` and
`ordinaryAmountX18` are both null. Keep its original Indexer amount and do not retry a completed
classification merely to fill those nulls. Pending or review rows can retain a verified principal while
their split remains unknown. Withdrawal mapping describes sender-side attribution, not recipient delivery;
its deposit total and ordinary amount stay null. The SDK performs one query per call and leaves any
necessary polling to the tool.

The current testnet handoff covers these formal HTTP methods. Signed operations use the canonical
MessagePack/EIP-712 protocols:

| Method | Operation | Route |
| --- | --- | --- |
| `submitTip` | `submit_tip` | Signed `/execute` |
| `getTipCollateralMappings` | `tips_history(mode=collateral_mapping)` | Signed `/query` |
| `getTipDetail` | `tip_detail` | Signed `/query` |
| `getTipsHistory` | `tips_history(mode=list)` | Signed `/query` |
| `getReceivedTips` | `received_tips` | Signed `/query` |
| `markTipsSeen` | `mark_tips_seen` | Signed `/execute` |
| `getNotificationInboxV2` | `notification_inbox_v2` | Signed `/query` |
| `markNotificationsSeen` | `mark_notifications_seen` | Signed `/execute` |
| `getNotificationSettingsV2` | `notification_settings_v2` | `/public_query` with an active Expo token |
| `updateNotificationSettingsV2` | `update_notification_settings_v2` | `/public_execute` with an active Expo token |

History defaults to `direction: 'all'`. Omitted `subaccount`, `cursor`, and `limit` are sent and signed as
explicit `null`. Owners default to wallet-wide history; linked signers default to the outer sender's
subaccount and need current authorization for the selected participants. Preserve server ordering and
opaque cursors. Versions and source indices remain strings, and amounts ending in `X18` remain integer
`BigNumber` values in x18 units.

History rows omit `gateway` and the fee breakdown. For an uncredited outgoing row in `review_required`,
read that Tip's sender detail when the UI needs to distinguish Sent from Sending. Other rows normally
need only their list fields.

Sender detail includes `senderCost`, `gateway`, and `processingReason`; recipient detail includes `seenAt`
and omits those sender-only fields. A verified `creditedAtMs` establishes delivery even when the current
status later becomes `review_required`. `TIP_NOT_FOUND` (6703) covers missing or inaccessible details and
receipt acknowledgements, including recipient access before verified credit.

`senderCost.feeBasis === 'not_executed'` requires sufficient evidence that the original withdrawal did
not execute and that the submission has terminated. Its `actualFeeX18`, `actualTotalX18`, `displayFeeX18`,
and `displayTotalX18` are all zero. A failed attempt, historical Gateway rejection, or pending review alone
does not establish that basis. For `execution_cap`, actual amounts remain null and the display amounts
show the approved fee cap and net amount plus that cap; label them as a cap. For `actual`, display the
verified actual values.

Reads never acknowledge Tips or notifications. Call `markTipsSeen` only for displayed Tip IDs and
`markNotificationsSeen` only for displayed notification IDs; these are independent read states. Both
accept 1–50 IDs, let the server deduplicate and authorize atomically, and return `{ status: 'success' }`.

On this testnet, notification settings use `schemaVersion: 2` and include the effective
`likesAndReplies` preference. The nine original settings are required on replacement; omit
`likesAndReplies` to preserve its saved value, or send an explicit boolean to change it, including
`false`. New wallets default to true. Re-read on 6203 conflicts instead of replaying a stale document.
V2 Inbox entries preserve `createdAt`; an included `seenAt` is null while unread or the first display
acknowledgement time in UTC milliseconds. Older responses may omit `seenAt`; the SDK preserves that
omission, which means read state is unavailable rather than already read. Existing notification data
keeps its shape.

PR6 Tip push generation and device additions, full PR7 public Tip Feed reads, and PR8 thread grouping
are not deployed in this testnet environment. Declare only notification types and routes this SDK supports.
`MobileSendMoneyDraftClient` remains available for mock development with an injected decoded-business
transport, without default HTTP or signing behavior.
See [the draft adapter](src/drafts/sendMoney/README.md).

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

Original posts and trade cards can also include `publicTipTotalX18`, a `BigNumber` retaining the wire
`public_tip_total_x18` USDT0 x18 units. Omission hides the amount; an explicit zero means there are no
qualifying Tips. `getFeedUpdates` item patches include updated totals; an omitted patch field leaves
the existing value unchanged. When a patch includes `capabilities`, replace the whole flags object so
an omitted `canTip` cannot retain an older true value. For example, with an optional connected
`currentWalletAddress`:

```ts
import { removeDecimals, subaccountFromHex } from '@nadohq/shared';

const { item } = await mobile.getFeedItem({
  itemId: 'a62b3a6e-1c45-43fa-9732-f4a12a36eae1',
});
const authorWallet = subaccountFromHex(item.author.subaccount).subaccountOwner;
const showTipButton =
  item.capabilities.canTip === true &&
  currentWalletAddress !== undefined &&
  authorWallet.toLowerCase() !== currentWalletAddress.toLowerCase();
const publicTipAmount =
  (item.kind === 'post' || item.kind === 'trade_card') &&
  item.publicTipTotalX18 !== undefined
    ? removeDecimals(item.publicTipTotalX18).toFixed()
    : undefined;
```

These totals are currently a testnet preview: `"15000000000000000000"` displays as `15` USDT0.
The server sums only Tips addressed to the original post's author, with `visibility === 'public'`,
current `tipStatus === 'credited'`, and the required Feed visibility. Display the returned aggregate
directly. A verified credit later placed in `review_required` remains in participant history but no
longer contributes to this preview, so a later total may decrease. Do not recompute it from participant
history or keep an older higher total. This preview uses the existing For You, Friends, item, and update
requests; it does not add `include_tips`, a public Tip item kind, `feed_types: ['tips']`, public lookup by
Tip ID, or PR8 thread anchors and grouping.

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
const inbox = await mobile.getNotificationInboxV2({
  ...auth,
  limit: 20,
  supportedTypes: ['deposit_completed', 'new_follower'],
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
  omission remains absent in the SDK model and must not be interpreted as read. Reading does not
  acknowledge notifications. `markNotificationsSeen` updates notification read state independently of
  Tip receipts. Push delivery remains separate.
  Existing notification data has no title/body, and these pages provide no unread count or delete operation.
  Do not use the unimplemented legacy `notification_history` route.
  An unknown destination rejects the page with `MobileUnsupportedNotificationRouteError`.
- `supportedTypes` accepts only notification types in `MOBILE_NOTIFICATION_TYPE_IDS`, which this SDK
  can decode. Omission selects the existing v2 types and `[]` returns an empty page; at most 64 entries
  are allowed. Tip-specific notification types and unknown types are not supported by this client.
  The canonical signed field order is `type`, `cursor`, `limit`, then `supported_types` only when supplied;
  omitted cursor and limit remain explicit null. Keep the same filters when paging.
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
