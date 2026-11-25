# Send Money frontend mock adapter

This adapter uses the Tip field contract retained by the **25 November 2026** testnet deployment
[`450684e`](https://github.com/nadohq/nado-mobile-be/actions/runs/45492386197). Its six Tip operations are
`submit_tip`, both `tips_history` modes, `tip_detail`, `received_tips`, and `mark_tips_seen`. The formal
`MobileClient` provides their signed HTTP methods; this separate adapter remains useful for injected
frontend mocks. Deployment on another environment must be checked separately.

`MobileSendMoneyDraftClient` requires an explicit `MobileSendMoneyDraftTransport`. Its six transport
methods distinguish the two `tips_history` modes and consume decoded business requests/results, without
Mobile authentication or success envelopes. A transport must decode the real flat
`{ status: 'success', ...businessFields }` response, with no `data` or `result` wrapper. For the empty
`mark_tips_seen` response, this mock adapter represents decoded completion as `null`; the actual RPC
response is `{ status: 'success' }`. Adapter errors propagate unchanged.

No default network transport, signer, withdrawal execution, automatic fee retry, or persistent mock
state is installed. The fixture under `fixtures/` is synthetic UI test data updated to the frozen v1
fields. Its six-decimal withdrawal cannot authorize a transfer and is not a signing vector.

To run the fixture-backed scenarios from the repository root after building the packages:

```sh
bun run build
bun run test:unit --runInBand --runTestsByPath packages/mobile-client/src/drafts/sendMoney/sendMoneyDraft.test.ts
```

Amounts ending in `X18` remain x18 amounts in the client model, using `BigNumberish` inputs and
`BigNumber` outputs. Integer identifiers, versions, nonces, and chain IDs remain strings. The inner
withdrawal amount uses native asset units. Fractional, negative, non-finite, unsafe numeric, and
noncanonical string amount inputs are rejected. Unknown amounts remain `null`; verified zero remains
zero. Participant display names and avatars can both be `null`.

Lost-response recovery preserves the original withdrawal, inner signature, business fields, and confirmed
fee cap. Only `tipStatus='failed'` with `processingReason='FEE_TOO_LOW'` calls for a fresh Gateway quote
and user confirmation. A separate reconfirmation request sends the new confirmed cap and failed Tip
version while retaining the original withdrawal nonce and signature. Historical Gateway rejection names
alone do not authorize retry. `gateway.status='not_submitted'` is preserved.

For sender presentation, `sending` means Sent. An uncredited `review_required` Tip also means Sent
when the receipt or sender detail has `gateway.status='accepted'`; unresolved execution remains Sending.
History rows have no Gateway fields, so use that Tip's detail when a reviewed outgoing row needs this
distinction. The adapter does not infer a status or retry from a historical Gateway rejection alone.

Reading cards, detail, or history never marks Tips seen. Only acknowledge the Tip IDs actually displayed;
notification acknowledgement uses different IDs. A verified `creditedAtMs` remains meaningful when a Tip
later enters review, and its unseen card remains eligible. Sender detail includes cost, Gateway, and
processing reason; recipient detail exposes `seenAt` and excludes those sender-only fields. Unseen cards
always return `seenAt=null`.

The sender cost basis `not_executed` requires sufficient evidence that the withdrawal did not execute
and that the submission has terminated. Its actual fee, actual total, display fee, and display total
are all zero. Pending or conflicting execution evidence must not be converted into this basis locally.

Injected adapters must enforce current authorization. Owners can access their wallet's participants;
linked signers need authorization for both the outer sender and relevant participant subaccount. With
history subaccount omitted or `null`, owners read wallet-wide activity and linked signers read the
outer sender's subaccount. Preserve backend history order, which merges sent submission times and
received verified-credit times; do not resort the mixed page by one timestamp.

Activity's Tips, Deposits, and Withdrawals tabs remain independent. Deposits and Withdrawals keep their
Indexer pagination and original amounts; collateral mapping is an optional attribution tool, not a
prerequisite for any tab. The adapter deduplicates exact string indices in first-occurrence order without
modifying caller-owned arrays. Merge annotations by index within the same subaccount, product, and
direction. Retain complete mappings and requery only pending entries when the tool needs fresh attribution,
using fresh outer signatures in a live integration. A complete ordinary deposit may have zero Tip total
and null deposit total and ordinary amount; use its Indexer amount and do not retry that completed row.
Review/pending rows may retain verified principal while split amounts remain unknown. Withdrawal mappings
never describe recipient delivery and keep deposit total and ordinary amount `null`.

The current testnet handoff specifies notification v2 Inbox/settings and `mark_notifications_seen`,
separate from Tip read receipts. `MobileClient` provides their formal transports. V2 Inbox entries may
include `seenAt`: null means unread, a number is the first display acknowledgement in UTC milliseconds,
and omission preserves an older response's unavailable read state rather than implying it was read.
The optional `supportedTypes` filter accepts only types this SDK decodes, listed in
`MOBILE_NOTIFICATION_TYPE_IDS`; it does not enable Tip-specific or unknown notification types.
Settings use schema 2. Omit optional `likesAndReplies` to preserve the saved preference; explicit false
disables it. Notification operations remain outside this mock adapter; its decoded transport does not
supply authentication.

Feed preview totals are also outside this adapter. The service counts only Tips to the original author
that are public, currently credited, and satisfy Feed visibility. A credit later under review remains in
participant history but leaves the preview total; display the server aggregate even when it decreases.
The preview uses existing Feed requests and does not enable Tip push routes, device capability additions,
public Tip items, `include_tips`, or PR8 grouping and anchors. Feed ordering belongs to the server, and
temporary own-reply pinning belongs to the App.
