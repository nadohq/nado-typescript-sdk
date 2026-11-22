import { Address, Hex } from 'viem';
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

/**
 * Decoded participant identity from the 22 November 2026 frontend handoff.
 * The mock adapter does not imply that the planned private reads are deployed.
 */
export interface MobileDraftWireTipParticipant {
  /** Exact participant subaccount, including its name. */
  subaccount: Hex;
  /** Current permitted display name, or null for the App's usual fallback. */
  display_name: string | null;
  /** Current permitted avatar URL, or null for the usual fallback. */
  avatar_url: string | null;
}

/** Decoded sender fee presentation; amounts are decimal integer strings in x18 units. */
export interface MobileDraftWireTipSenderCost {
  /** Fee ceiling explicitly confirmed by the sender. */
  max_fee_x18: string;
  /** Verified fee, or null while unknown; a known zero remains "0". */
  actual_fee_x18: string | null;
  /** Verified net amount plus fee, or null while unknown. */
  actual_total_x18: string | null;
  /** Server-provided fee for display. */
  display_fee_x18: string;
  /** Server-provided net amount plus displayed fee. */
  display_total_x18: string;
  /** Explains whether the displayed fee is a cap, actual charge, or unexecuted charge. */
  fee_basis: MobileDraftTipFeeBasis;
}

/** Decoded inner owner-signed Engine transaction, without its signature or Mobile authentication. */
export interface MobileDraftWireTipWithdrawal {
  /** Owning subaccount encoded as bytes32. */
  sender: Hex;
  /** Cash MVP uses product 0. */
  productId: number;
  /** Native asset units, not x18 units unless the asset has 18 decimals. */
  amount: string;
  /** Original Engine nonce, retained for recovery and confirmed fee retries. */
  nonce: string;
  /** Exact recipient DDA, queried for the intended recipient. */
  sendTo: Address;
  /** Reserved Engine appendix; zero for the v1 cash flow. */
  appendix: string;
}

/** Decoded submission request; no outer nonce, signature, or canonical key order is implied. */
export interface MobileDraftWireSubmitTipRequest {
  /** Decoded Mobile execute operation. */
  type: 'submit_tip';
  /** Chain identifier as a decimal string. */
  chain_id: string;
  /** Exact recipient subaccount. */
  recipient_subaccount: Hex;
  /** Originating post, or null for a profile Tip. */
  origin_post_id: string | null;
  /** Unmodified optional note; the draft allows at most 50 Unicode scalars. */
  note: string | null;
  /** Draft asset-catalogue selection, not a hard-coded SDK catalogue. */
  background_id: string;
  /** Feed publication choice. */
  visibility: MobileDraftTipVisibility;
  /** Already owner-signed withdrawal; the draft client never dispatches it. */
  withdrawal: MobileDraftWireTipWithdrawal;
  /** Original Engine signature, retained unchanged on retry. */
  withdrawal_signature: string;
  /** Explicitly confirmed fee ceiling, including an explicit zero. */
  max_fee_x18: string;
  /** Failed Tip version for an explicitly confirmed fee retry; omitted for initial submission. */
  expected_version?: string;
}

/** Decoded submission result; a business failure can be returned successfully. */
export interface MobileDraftWireSubmitTipResult {
  /** Server-issued Tip UUID, reused on recovery and confirmed retries. */
  tip_id: string;
  /** Business state, not transport success. */
  tip_status: MobileDraftTipStatus;
  /** Exact optimistic-concurrency version. */
  version: string;
  /** Original submission time in UTC milliseconds. */
  submitted_at_ms: number;
  /** Gateway summary, independent of the outer Mobile failure envelope. */
  gateway: MobileDraftWireTipGatewayResult;
  /** Open processing reason; only failed + FEE_TOO_LOW triggers fee reconfirmation. */
  processing_reason: string | null;
}

/** Gateway outcome shared by submission and sender-only private detail. */
export interface MobileDraftWireTipGatewayResult {
  /** Authoritative execution outcome, including an attempt withheld before dispatch. */
  status: MobileDraftTipGatewayStatus;
  /** Engine code, or null. */
  error_code: number | null;
  /** Engine error name, or null; it may describe a historical rejection. */
  error_name: string | null;
}

/** Decoded signed detail query. */
export interface MobileDraftWireTipDetailRequest {
  /** Decoded Mobile query operation. */
  type: 'tip_detail';
  /** Server-issued Tip UUID. */
  tip_id: string;
}

/** Shared private detail fields frozen by the frontend handoff. */
export interface MobileDraftWireTipDetailBase {
  /** Server-issued Tip UUID. */
  tip_id: string;
  /** Business lifecycle state. */
  tip_status: MobileDraftTipStatus;
  /** Exact concurrency version. */
  version: string;
  /** Current readable sender identity. */
  sender: MobileDraftWireTipParticipant;
  /** Current readable recipient identity. */
  recipient: MobileDraftWireTipParticipant;
  /** Asset product ID. */
  product_id: number;
  /** Recipient's net amount in x18 units. */
  net_amount_x18: string;
  /** Publication choice. */
  visibility: MobileDraftTipVisibility;
  /** Original note, or null. */
  note: string | null;
  /** Background asset selection. */
  background_id: string;
  /** Exact background asset version. */
  background_version: string;
  /** Original post UUID, or null. */
  origin_post_id: string | null;
  /** Current original-post readability, or null when there is no reference. */
  origin_availability: MobileDraftTipOriginAvailability;
  /** Published Feed item UUID, or null. */
  feed_item_id: string | null;
  /** Submission time in UTC milliseconds. */
  submitted_at_ms: number;
  /** Verified credit time in UTC milliseconds, or null. */
  credited_at_ms: number | null;
  /** Exact source withdrawal index, or null while unknown. */
  withdrawal_submission_idx: string | null;
  /** Exact source deposit index, or null while unknown. */
  deposit_submission_idx: string | null;
}

/** Decoded sender-only detail presentation. */
export interface MobileDraftWireSentTipDetail extends MobileDraftWireTipDetailBase {
  /** Sender participant perspective. */
  role: 'sender';
  /** Sender-only fee presentation. */
  sender_cost: MobileDraftWireTipSenderCost;
  /** Sender-only Gateway execution summary. */
  gateway: MobileDraftWireTipGatewayResult;
  /** Open sender-only processing reason, or null. */
  processing_reason: string | null;
}

/** Decoded recipient-only detail presentation. */
export interface MobileDraftWireReceivedTipDetail extends MobileDraftWireTipDetailBase {
  /** Recipient participant perspective. */
  role: 'recipient';
  /** First server acknowledgement time in UTC milliseconds, or null while unseen. */
  seen_at: number | null;
}

/** Decoded role-discriminated private detail result, without an HTTP envelope. */
export type MobileDraftWireTipDetail =
  | MobileDraftWireSentTipDetail
  | MobileDraftWireReceivedTipDetail;

/** Decoded signed activity query, separate from collateral mapping mode. */
export interface MobileDraftWireTipsHistoryRequest {
  /** Decoded Mobile query operation. */
  type: 'tips_history';
  /** Selects participant activity pagination. */
  mode: 'list';
  /** Participant direction filter. */
  direction: MobileDraftTipsHistoryDirection;
  /** Owned filter; null selects the owner's wallet or the linked signer's outer sender. */
  subaccount: Hex | null;
  /** Opaque cursor, or null for the first page. */
  cursor: string | null;
  /** Page size, or null for the v1 default of 20. */
  limit: number | null;
}

/** Shared v1 activity row; rows show net amount, not the sender's total debit. */
export interface MobileDraftWireTipHistoryRowBase {
  /** Server-issued Tip UUID. */
  tip_id: string;
  /** Business state at read time. */
  tip_status: MobileDraftTipStatus;
  /** Current readable sender identity. */
  sender: MobileDraftWireTipParticipant;
  /** Current readable recipient identity. */
  recipient: MobileDraftWireTipParticipant;
  /** Asset product ID. */
  product_id: number;
  /** Recipient's net amount in x18 units. */
  net_amount_x18: string;
  /** Publication choice. */
  visibility: MobileDraftTipVisibility;
  /** Submission time in UTC milliseconds. */
  submitted_at_ms: number;
  /** Verified credit time in UTC milliseconds, or null. */
  credited_at_ms: number | null;
  /** Exact withdrawal index, or null. */
  withdrawal_submission_idx: string | null;
  /** Exact deposit index, or null. */
  deposit_submission_idx: string | null;
  /** Original note, or null. */
  note: string | null;
}

/** Decoded sent activity row. */
export interface MobileDraftWireSentTipHistoryRow extends MobileDraftWireTipHistoryRowBase {
  /** Sender participant perspective. */
  role: 'sender';
}

/** Decoded received activity row. */
export interface MobileDraftWireReceivedTipHistoryRow extends MobileDraftWireTipHistoryRowBase {
  /** Recipient participant perspective. */
  role: 'recipient';
  /** First server acknowledgement time in UTC milliseconds, or null. */
  seen_at: number | null;
}

/** Decoded role-discriminated activity row. */
export type MobileDraftWireTipHistoryRow =
  | MobileDraftWireSentTipHistoryRow
  | MobileDraftWireReceivedTipHistoryRow;

/** Decoded newest-first activity page; a cursor is opaque and scoped to its query. */
export interface MobileDraftWireTipsHistoryPage {
  /** Entries in server order. */
  tips: MobileDraftWireTipHistoryRow[];
  /** Next cursor, or null only when pagination is complete. */
  next_cursor: string | null;
}

/** Decoded Indexer-page annotation query; this mode has no activity cursor. */
export interface MobileDraftWireTipCollateralMappingsRequest {
  /** Decoded Mobile query operation. */
  type: 'tips_history';
  /** Selects collateral annotations. */
  mode: 'collateral_mapping';
  /** Exact owned subaccount for this Indexer page. */
  subaccount: Hex;
  /** Asset product ID for this Indexer page. */
  product_id: number;
  /** Source collateral-history direction. */
  direction: MobileDraftTipCollateralDirection;
  /** One to one hundred distinct source indices, retained as decimal strings. */
  submission_indices: string[];
}

/** Decoded server annotation for one source collateral entry. */
export interface MobileDraftWireTipCollateralMapping {
  /** Exact source subaccount. */
  subaccount: Hex;
  /** Source asset product ID. */
  product_id: number;
  /** Source direction. */
  direction: MobileDraftTipCollateralDirection;
  /** Exact source submission index. */
  submission_idx: string;
  /** Aggregate deposit in x18 units, or null for withdrawals or unknown data. */
  deposit_total_x18: string | null;
  /** Verification state; complete withdrawals retain a null ordinary remainder. */
  mapping_state: MobileDraftTipMappingState;
  /** Server classification of the source entry. */
  classification: MobileDraftTipClassification;
  /** Tip contribution in x18 units, or null while unknown. */
  tip_total_x18: string | null;
  /** Authoritative ordinary remainder in x18 units; null when unknown or for withdrawals. */
  ordinary_amount_x18: string | null;
}

/** Decoded mapping result; continue pagination with the original Indexer cursor. */
export interface MobileDraftWireTipCollateralMappings {
  /** One annotation per requested index, in returned order. */
  mappings: MobileDraftWireTipCollateralMapping[];
}

/** Decoded unread-recipient-card query. */
export interface MobileDraftWireReceivedTipsRequest {
  /** Decoded Mobile query operation. */
  type: 'received_tips';
  /** Opaque cursor, or null for the first page. */
  cursor: string | null;
  /** Page size, or null for the v1 default of 10. */
  limit: number | null;
}

/** Unseen verified-credit card, including Tips subsequently placed under review. */
export interface MobileDraftWireReceivedTipCard {
  /** Server-issued Tip UUID. */
  tip_id: string;
  /** Current readable sender identity. */
  sender: MobileDraftWireTipParticipant;
  /** Net received amount in x18 units. */
  net_amount_x18: string;
  /** Original note, or null. */
  note: string | null;
  /** Background asset selection. */
  background_id: string;
  /** Exact background version. */
  background_version: string;
  /** Verified credit time in UTC milliseconds. */
  credited_at_ms: number;
  /** Unseen cards always carry an explicit null. */
  seen_at: null;
}

/** Decoded oldest-first unseen recipient cards; reads have no seen side effect. */
export interface MobileDraftWireReceivedTipsPage {
  /** Cards in returned order. */
  tips: MobileDraftWireReceivedTipCard[];
  /** Next cursor, or null only when pagination is complete. */
  next_cursor: string | null;
}

/** Decoded explicit acknowledgement of displayed Tip IDs, distinct from Inbox notification IDs. */
export interface MobileDraftWireMarkTipsSeenRequest {
  /** Decoded Mobile execute operation. */
  type: 'mark_tips_seen';
  /** One to fifty displayed Tip UUIDs; the server owns acknowledgement timestamps. */
  tip_ids: string[];
}

/**
 * Injected decoded-business adapter for frontend mocks. No default network, signing, or withdrawal
 * execution is supplied. The five v1 operations use six methods to distinguish history modes.
 * Errors are propagated unchanged; adapters own wallet scoping and decoding their success envelopes.
 */
export interface MobileSendMoneyDraftTransport {
  /** Returns a decoded business submission result, including an admitted failed attempt. */
  submitTip(
    request: MobileDraftWireSubmitTipRequest,
  ): Promise<MobileDraftWireSubmitTipResult>;
  /** Reads one participant-visible Tip without acknowledging it. */
  getTipDetail(
    request: MobileDraftWireTipDetailRequest,
  ): Promise<MobileDraftWireTipDetail>;
  /** Reads a newest-first activity page without acknowledging received entries. */
  getTipsHistory(
    request: MobileDraftWireTipsHistoryRequest,
  ): Promise<MobileDraftWireTipsHistoryPage>;
  /** Annotates one Indexer collateral page without changing its pagination. */
  getTipCollateralMappings(
    request: MobileDraftWireTipCollateralMappingsRequest,
  ): Promise<MobileDraftWireTipCollateralMappings>;
  /** Reads oldest-first unseen cards without acknowledging them. */
  getReceivedTips(
    request: MobileDraftWireReceivedTipsRequest,
  ): Promise<MobileDraftWireReceivedTipsPage>;
  /** Acknowledges only the requested Tip IDs; this adapter represents decoded empty completion as null. */
  markTipsSeen(request: MobileDraftWireMarkTipsSeenRequest): Promise<null>;
}
