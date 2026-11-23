# Send Money frontend mock adapter

This adapter follows the **23 November 2026 v1** Send Money API handoff. The request fields, response
fields, enums, and nullability are frozen by that document. The backend currently implements
`submit_tip` (PR3), `tips_history(mode=collateral_mapping)` (PR4), and the PR5 private detail, activity
history, unseen-card, and acknowledgement operations. The production `MobileClient` provides their
signed HTTP methods; this separate adapter remains useful for injected frontend mocks.

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

Reading cards, detail, or history never marks Tips seen. Only acknowledge the Tip IDs actually displayed;
notification acknowledgement uses different IDs. A verified `creditedAtMs` remains meaningful when a Tip
later enters review, and its unseen card remains eligible. Sender detail includes cost, Gateway, and
processing reason; recipient detail exposes `seenAt` and excludes those sender-only fields. Unseen cards
always return `seenAt=null`.

Injected adapters must enforce current authorization. Owners can access their wallet's participants;
linked signers need authorization for both the outer sender and relevant participant subaccount. With
history subaccount omitted or `null`, owners read wallet-wide activity and linked signers read the
outer sender's subaccount. Preserve backend history order, which merges sent submission times and
received verified-credit times; do not resort the mixed page by one timestamp.

Collateral pagination remains with Indexer. The adapter deduplicates exact string indices in first-occurrence
order without modifying caller-owned arrays. Merge annotations by index
within the same subaccount, product, and direction. Retain complete mappings; requery pending deposits in
batches of at most four using fresh outer signatures in a live integration. Review/pending rows may have
verified principal while split amounts remain unknown. Withdrawal mappings never describe recipient
delivery and keep deposit total and ordinary amount `null`.

Production `MobileClient` APIs provide submission, collateral mapping, the four PR5 operations, and PR2
v3 Inbox/settings with the canonical signing protocols. Use those methods for live HTTP integration;
this adapter's decoded transport does not supply authentication. Inbox/settings remain outside this
mock adapter. Tip push routes, device capability additions, public Tip Feed reads, and thread grouping
remain planned features and are not enabled by this adapter. Feed ordering belongs to the server, and
temporary own-reply pinning belongs to the App.
