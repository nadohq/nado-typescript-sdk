/** Tip lifecycle states frozen by the 22 November 2026 frontend handoff. */
export const MOBILE_DRAFT_TIP_STATUSES = [
  'submitting',
  'reconciling',
  'sending',
  'credited',
  'failed',
  'review_required',
] as const;

/** V1 business state, independent of the HTTP success envelope. */
export type MobileDraftTipStatus = (typeof MOBILE_DRAFT_TIP_STATUSES)[number];

/** V1 publication choices; both can produce recipient cards. */
export const MOBILE_DRAFT_TIP_VISIBILITIES = ['public', 'private'] as const;

/** Publication choice; private and public credits can both produce recipient cards. */
export type MobileDraftTipVisibility =
  (typeof MOBILE_DRAFT_TIP_VISIBILITIES)[number];

/** V1 participant perspectives. */
export const MOBILE_DRAFT_TIP_ROLES = ['sender', 'recipient'] as const;

/** Participant perspective of a wallet-authenticated Tip read. */
export type MobileDraftTipRole = (typeof MOBILE_DRAFT_TIP_ROLES)[number];

/** V1 fee presentation bases. */
export const MOBILE_DRAFT_TIP_FEE_BASES = [
  'execution_cap',
  'actual',
  'not_executed',
] as const;

/** Basis for the sender's displayed fee and total, retaining unknown actual fees. */
export type MobileDraftTipFeeBasis =
  (typeof MOBILE_DRAFT_TIP_FEE_BASES)[number];

/** V1 Gateway outcomes shown by the frontend fixtures. */
export const MOBILE_DRAFT_TIP_GATEWAY_STATUSES = [
  'accepted',
  'rejected',
  'not_submitted',
  'unknown',
] as const;

/** V1 Gateway outcome in a decoded submission result. */
export type MobileDraftTipGatewayStatus =
  (typeof MOBILE_DRAFT_TIP_GATEWAY_STATUSES)[number];

/** V1 wallet activity filters. */
export const MOBILE_DRAFT_TIPS_HISTORY_DIRECTIONS = [
  'all',
  'sent',
  'received',
] as const;

/** Wallet-wide activity filter; received entries appear only after verified credit. */
export type MobileDraftTipsHistoryDirection =
  (typeof MOBILE_DRAFT_TIPS_HISTORY_DIRECTIONS)[number];

/** Collateral directions described by the frontend handoff. */
export const MOBILE_DRAFT_TIP_COLLATERAL_DIRECTIONS = [
  'deposit',
  'withdrawal',
] as const;

/** Indexer collateral-history direction to annotate. */
export type MobileDraftTipCollateralDirection =
  (typeof MOBILE_DRAFT_TIP_COLLATERAL_DIRECTIONS)[number];

/** V1 verification states for collateral attribution, independent of any known amounts. */
export const MOBILE_DRAFT_TIP_MAPPING_STATES = [
  'pending',
  'complete',
  'review_required',
] as const;

/** Whether the service has finalized the source submission's attribution. */
export type MobileDraftTipMappingState =
  (typeof MOBILE_DRAFT_TIP_MAPPING_STATES)[number];

/** Collateral classifications frozen by the frontend handoff. */
export const MOBILE_DRAFT_TIP_CLASSIFICATIONS = [
  'pending',
  'ordinary',
  'split',
  'tip_only',
] as const;

/** Server classification of an Indexer collateral entry. */
export type MobileDraftTipClassification =
  (typeof MOBILE_DRAFT_TIP_CLASSIFICATIONS)[number];

/** Availability values for an existing original-post reference. */
export const MOBILE_DRAFT_TIP_ORIGIN_AVAILABILITIES = [
  'available',
  'unavailable',
] as const;

/** Original-post readability, or null when the Tip has no original-post reference. */
export type MobileDraftTipOriginAvailability =
  | (typeof MOBILE_DRAFT_TIP_ORIGIN_AVAILABILITIES)[number]
  | null;
