import {
  BigNumberish,
  EIP712WithdrawCollateralV2Values,
  Subaccount,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import {
  MobileDraftTipClassification,
  MobileDraftTipCollateralDirection,
  MobileDraftTipFeeBasis,
  MobileDraftTipGatewayStatus,
  MobileDraftTipMappingState,
  MobileDraftTipOriginAvailability,
  MobileDraftTipsHistoryDirection,
  MobileDraftTipStatus,
  MobileDraftTipVisibility,
} from './modelTypes';

/** Readable participant identity from the 22 November 2026 frontend handoff. */
export interface MobileDraftTipParticipant {
  /** Exact participant subaccount, including its name. */
  subaccount: Subaccount;
  /** Current permitted display name, or null for the App's usual fallback. */
  displayName: string | null;
  /** Current permitted avatar URL, or null for the usual fallback. */
  avatarUrl: string | null;
}

/** V1 sender presentation; every amount remains in x18 units. */
export interface MobileDraftTipSenderCost {
  /** Explicitly confirmed fee ceiling. */
  maxFeeX18: BigNumber;
  /** Verified fee, or null while unknown; a known zero remains zero. */
  actualFeeX18: BigNumber | null;
  /** Verified total debit, or null while unknown. */
  actualTotalX18: BigNumber | null;
  /** Server-provided fee for display. */
  displayFeeX18: BigNumber;
  /** Server-provided total debit for display. */
  displayTotalX18: BigNumber;
  /** Basis for the display values. */
  feeBasis: MobileDraftTipFeeBasis;
}

/**
 * Already owner-signed Engine transaction, directly compatible with the withdrawalV2 payload builder.
 * Amounts use native asset units. The sender bytes32, nonce, and recipient address remain unchanged.
 */
export type MobileDraftTipWithdrawal = EIP712WithdrawCollateralV2Values;

/** Decoded submit input; retain these business fields and the inner signature for recovery. */
export interface MobileDraftSubmitTipParams {
  /** Exact chain identifier as a decimal string. */
  chainId: string;
  /** Exact recipient from the originating profile or post. */
  recipientSubaccount: Subaccount;
  /** Original post UUID, or null for a profile Tip. */
  originPostId: string | null;
  /** Original optional note; the draft permits up to 50 Unicode scalars. */
  note: string | null;
  /** Selection from the App's agreed configured asset catalogue. */
  backgroundId: string;
  /** Publication choice. */
  visibility: MobileDraftTipVisibility;
  /** Already owner-signed Engine withdrawal. */
  withdrawal: MobileDraftTipWithdrawal;
  /** Original inner Engine signature; no new signature is generated here. */
  withdrawalSignature: string;
  /** Integer x18 fee actually shown and confirmed, including explicit zero. */
  maxFeeX18: BigNumberish;
  /** Failed Tip version for a fee retry only after explicit user reconfirmation. */
  expectedVersion?: string;
}

/** Decoded submission result; successful transport can carry a failed business attempt. */
export interface MobileDraftSubmitTipResult {
  /** Server-issued Tip UUID. */
  tipId: string;
  /** Business lifecycle state. */
  tipStatus: MobileDraftTipStatus;
  /** Exact concurrency version. */
  version: string;
  /** Original submission time in UTC milliseconds. */
  submittedAtMs: number;
  /** Gateway execution summary, distinct from Mobile transport errors. */
  gateway: MobileDraftTipGatewayResult;
  /** Open processing reason; only failed + FEE_TOO_LOW triggers fee reconfirmation. */
  processingReason: string | null;
}

/** Gateway outcome for submission and sender-only private detail. */
export interface MobileDraftTipGatewayResult {
  /** Authoritative outcome, including an attempt withheld before Gateway dispatch. */
  status: MobileDraftTipGatewayStatus;
  /** Engine code, or null. */
  errorCode: number | null;
  /** Engine error name, or null; this may describe a historical rejection. */
  errorName: string | null;
}

/** Decoded private detail selector; adapter authentication supplies the participant perspective. */
export interface GetMobileDraftTipDetailParams {
  /** Server-issued Tip UUID. */
  tipId: string;
}

/** Common v1 private detail fields; publication does not grant participant access. */
export interface MobileDraftTipDetailBase {
  /** Server-issued Tip UUID. */
  tipId: string;
  /** Business lifecycle state. */
  tipStatus: MobileDraftTipStatus;
  /** Exact concurrency version. */
  version: string;
  /** Current readable sender identity. */
  sender: MobileDraftTipParticipant;
  /** Current readable recipient identity. */
  recipient: MobileDraftTipParticipant;
  /** Asset product ID. */
  productId: number;
  /** Recipient's net amount in x18 units. */
  netAmountX18: BigNumber;
  /** Publication choice. */
  visibility: MobileDraftTipVisibility;
  /** Original note, or null. */
  note: string | null;
  /** Background asset selection. */
  backgroundId: string;
  /** Exact background asset version. */
  backgroundVersion: string;
  /** Original post UUID, or null. */
  originPostId: string | null;
  /** Current original-post readability, or null when there is no reference. */
  originAvailability: MobileDraftTipOriginAvailability;
  /** Published Feed item UUID, or null. */
  feedItemId: string | null;
  /** Submission time in UTC milliseconds. */
  submittedAtMs: number;
  /** Verified credit time in UTC milliseconds, or null. */
  creditedAtMs: number | null;
  /** Exact source withdrawal index, or null while unknown. */
  withdrawalSubmissionIdx: string | null;
  /** Exact source deposit index, or null while unknown. */
  depositSubmissionIdx: string | null;
}

/** V1 sender-only detail, with fee presentation. */
export interface MobileDraftSentTipDetail extends MobileDraftTipDetailBase {
  /** Sender participant perspective. */
  role: 'sender';
  /** Sender-only cost presentation. */
  senderCost: MobileDraftTipSenderCost;
  /** Sender-only execution summary. */
  gateway: MobileDraftTipGatewayResult;
  /** Open sender-only processing reason, or null. */
  processingReason: string | null;
}

/** V1 recipient-only detail, with the explicit acknowledgement state. */
export interface MobileDraftReceivedTipDetail extends MobileDraftTipDetailBase {
  /** Recipient participant perspective. */
  role: 'recipient';
  /** First acknowledgement time in UTC milliseconds, or null while unseen. */
  seenAt: number | null;
}

/** V1 detail discriminated by participant role. */
export type MobileDraftTipDetail =
  | MobileDraftSentTipDetail
  | MobileDraftReceivedTipDetail;

/** Participant activity filters; scope is restricted by the adapter's current authorization. */
export interface GetMobileDraftTipsHistoryParams {
  /** Defaults to all directions. */
  direction?: MobileDraftTipsHistoryDirection;
  /** Owned filter; null/omission selects the owner's wallet or the linked signer's outer sender. */
  subaccount?: Subaccount | null;
  /** Opaque prior page cursor; omit or pass null for the first page. */
  cursor?: string | null;
  /** One to fifty entries; omission/null selects the v1 default of 20. */
  limit?: number | null;
}

/** Common v1 activity row; the net amount excludes the sender's fee. */
export interface MobileDraftTipHistoryRowBase {
  /** Server-issued Tip UUID. */
  tipId: string;
  /** Business lifecycle state. */
  tipStatus: MobileDraftTipStatus;
  /** Current readable sender identity. */
  sender: MobileDraftTipParticipant;
  /** Current readable recipient identity. */
  recipient: MobileDraftTipParticipant;
  /** Asset product ID. */
  productId: number;
  /** Recipient's net amount in x18 units. */
  netAmountX18: BigNumber;
  /** Publication choice. */
  visibility: MobileDraftTipVisibility;
  /** Original submission time in UTC milliseconds. */
  submittedAtMs: number;
  /** Verified credit time in UTC milliseconds, or null. */
  creditedAtMs: number | null;
  /** Exact source withdrawal index, or null. */
  withdrawalSubmissionIdx: string | null;
  /** Exact source deposit index, or null. */
  depositSubmissionIdx: string | null;
  /** Original note, or null. */
  note: string | null;
}

/** V1 sent activity row. */
export interface MobileDraftSentTipHistoryRow extends MobileDraftTipHistoryRowBase {
  /** Sender participant perspective. */
  role: 'sender';
}

/** V1 received activity row. */
export interface MobileDraftReceivedTipHistoryRow extends MobileDraftTipHistoryRowBase {
  /** Recipient participant perspective. */
  role: 'recipient';
  /** First acknowledgement time in UTC milliseconds, or null. */
  seenAt: number | null;
}

/** V1 participant activity row. */
export type MobileDraftTipHistoryRow =
  | MobileDraftSentTipHistoryRow
  | MobileDraftReceivedTipHistoryRow;

/** V1 newest-first wallet activity page. */
export interface MobileDraftTipsHistoryPage {
  /** Entries in server order. */
  tips: MobileDraftTipHistoryRow[];
  /** Opaque next cursor, or null only at the end. */
  nextCursor: string | null;
}

/** V1 annotations for one active-chain Indexer collateral page. */
export interface GetMobileDraftTipCollateralMappingsParams {
  /** Exact source subaccount. */
  subaccount: Subaccount;
  /** Source asset product ID. */
  productId: number;
  /** Source collateral-history direction. */
  direction: MobileDraftTipCollateralDirection;
  /** Source indices, deduplicated in first-occurrence order; use one to one hundred unique strings. */
  submissionIndices: string[];
}

/** Source annotation; unverified amounts remain null even if the deposit principal is known. */
export interface MobileDraftTipCollateralMapping {
  /** Exact source subaccount. */
  subaccount: Subaccount;
  /** Source asset product ID. */
  productId: number;
  /** Source direction. */
  direction: MobileDraftTipCollateralDirection;
  /** Exact source submission index. */
  submissionIdx: string;
  /** Aggregate deposit in x18 units, or null. */
  depositTotalX18: BigNumber | null;
  /** Verification state; complete withdrawals retain a null ordinary remainder. */
  mappingState: MobileDraftTipMappingState;
  /** Server classification, independent of whether all amounts have been verified. */
  classification: MobileDraftTipClassification;
  /** Tip contribution in x18 units, or null while unknown. */
  tipTotalX18: BigNumber | null;
  /** Authoritative ordinary remainder in x18 units; null when unknown or for withdrawals. */
  ordinaryAmountX18: BigNumber | null;
}

/** V1 annotations; pagination continues using the original Indexer cursor. */
export interface MobileDraftTipCollateralMappings {
  /** Annotations in returned order, without filtering ordinary entries. */
  mappings: MobileDraftTipCollateralMapping[];
}

/** V1 unread-card pagination, scoped to the injected adapter's recipient wallet. */
export interface GetMobileDraftReceivedTipsParams {
  /** Opaque prior cursor; omit or pass null for the first page. */
  cursor?: string | null;
  /** One to fifty cards; omission/null selects the v1 default of 10. */
  limit?: number | null;
}

/** Unseen verified-credit card, including Tips subsequently placed under review. */
export interface MobileDraftReceivedTipCard {
  /** Server-issued Tip UUID. */
  tipId: string;
  /** Current readable sender identity. */
  sender: MobileDraftTipParticipant;
  /** Net received amount in x18 units. */
  netAmountX18: BigNumber;
  /** Original note, or null. */
  note: string | null;
  /** Background asset selection. */
  backgroundId: string;
  /** Exact background asset version. */
  backgroundVersion: string;
  /** Verified credit time in UTC milliseconds. */
  creditedAtMs: number;
  /** Unseen cards always carry an explicit null. */
  seenAt: null;
}

/** V1 oldest-first unseen cards; reading does not acknowledge them. */
export interface MobileDraftReceivedTipsPage {
  /** Cards in returned order, without local deduplication or reordering. */
  tips: MobileDraftReceivedTipCard[];
  /** Opaque next cursor, or null only at the end. */
  nextCursor: string | null;
}

/** Explicit v1 acknowledgement, separate from Inbox notification acknowledgement. */
export interface MobileDraftMarkTipsSeenParams {
  /** One to fifty actually displayed Tip UUIDs; reads and prefetches must not supply these implicitly. */
  tipIds: string[];
}
