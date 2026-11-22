import {
  BigNumberish,
  subaccountFromHex,
  subaccountToHex,
  toBigNumber,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import {
  GetMobileDraftTipCollateralMappingsParams,
  GetMobileDraftTipsHistoryParams,
  MobileDraftReceivedTipsPage,
  MobileDraftSubmitTipParams,
  MobileDraftSubmitTipResult,
  MobileDraftTipCollateralMapping,
  MobileDraftTipCollateralMappings,
  MobileDraftTipDetail,
  MobileDraftTipDetailBase,
  MobileDraftTipGatewayResult,
  MobileDraftTipHistoryRow,
  MobileDraftTipHistoryRowBase,
  MobileDraftTipParticipant,
  MobileDraftTipSenderCost,
  MobileDraftTipsHistoryPage,
} from './clientTypes';
import {
  MobileDraftWireReceivedTipsPage,
  MobileDraftWireSubmitTipRequest,
  MobileDraftWireSubmitTipResult,
  MobileDraftWireTipCollateralMapping,
  MobileDraftWireTipCollateralMappings,
  MobileDraftWireTipCollateralMappingsRequest,
  MobileDraftWireTipDetail,
  MobileDraftWireTipDetailBase,
  MobileDraftWireTipGatewayResult,
  MobileDraftWireTipHistoryRow,
  MobileDraftWireTipParticipant,
  MobileDraftWireTipSenderCost,
  MobileDraftWireTipsHistoryPage,
  MobileDraftWireTipsHistoryRequest,
} from './wireTypes';

/**
 * Maps the frozen v1 submission fields without signing, dispatching an Engine withdrawal, or changing
 * the caller's fee cap. Production signing remains the responsibility of MobileClient.
 * @throws {RangeError} If an amount, fee, or appendix is negative, fractional, non-finite, an unsafe
 * numeric integer, or a noncanonical decimal string.
 * @throws {Error} If the recipient owner is not 20 bytes or its subaccount name exceeds 12 bytes.
 */
export function mapMobileDraftSubmitTipParamsToWire(
  params: MobileDraftSubmitTipParams,
): MobileDraftWireSubmitTipRequest {
  return {
    type: 'submit_tip',
    chain_id: params.chainId,
    recipient_subaccount: subaccountToHex(params.recipientSubaccount),
    origin_post_id: params.originPostId,
    note: params.note,
    background_id: params.backgroundId,
    visibility: params.visibility,
    withdrawal: {
      sender: params.withdrawal.sender,
      productId: params.withdrawal.productId,
      amount: mapDraftInteger(params.withdrawal.amount, 'withdrawal.amount'),
      nonce: params.withdrawal.nonce,
      sendTo: params.withdrawal.sendTo,
      appendix: mapDraftInteger(
        params.withdrawal.appendix,
        'withdrawal.appendix',
      ),
    },
    withdrawal_signature: params.withdrawalSignature,
    max_fee_x18: mapDraftInteger(params.maxFeeX18, 'maxFeeX18'),
    ...(params.expectedVersion === undefined
      ? {}
      : { expected_version: params.expectedVersion }),
  };
}

/** Maps v1 submission state without promoting a failed or unknown attempt to success. */
export function mapMobileDraftSubmitTipResult(
  result: MobileDraftWireSubmitTipResult,
): MobileDraftSubmitTipResult {
  return {
    tipId: result.tip_id,
    tipStatus: result.tip_status,
    version: result.version,
    submittedAtMs: result.submitted_at_ms,
    gateway: mapDraftTipGatewayResult(result.gateway),
    processingReason: result.processing_reason,
  };
}

/**
 * Maps a v1 identity while preserving the participant's complete subaccount.
 * @throws {Error} If the participant subaccount cannot be decoded as 32 bytes.
 */
export function mapMobileDraftTipParticipant(
  participant: MobileDraftWireTipParticipant,
): MobileDraftTipParticipant {
  return {
    subaccount: subaccountFromHex(participant.subaccount),
    displayName: participant.display_name,
    avatarUrl: participant.avatar_url,
  };
}

/** Maps v1 sender costs in x18 units without replacing unknown fees with zero. */
export function mapMobileDraftTipSenderCost(
  cost: MobileDraftWireTipSenderCost,
): MobileDraftTipSenderCost {
  return {
    maxFeeX18: toBigNumber(cost.max_fee_x18),
    actualFeeX18: mapDraftNullableAmount(cost.actual_fee_x18),
    actualTotalX18: mapDraftNullableAmount(cost.actual_total_x18),
    displayFeeX18: toBigNumber(cost.display_fee_x18),
    displayTotalX18: toBigNumber(cost.display_total_x18),
    feeBasis: cost.fee_basis,
  };
}

/**
 * Maps v1 private detail without acknowledging a received Tip or mixing participant fields.
 * @throws {Error} If either participant subaccount cannot be decoded as 32 bytes.
 */
export function mapMobileDraftTipDetail(
  detail: MobileDraftWireTipDetail,
): MobileDraftTipDetail {
  const common = mapDraftTipDetailBase(detail);
  return detail.role === 'sender'
    ? {
        ...common,
        role: detail.role,
        senderCost: mapMobileDraftTipSenderCost(detail.sender_cost),
        gateway: mapDraftTipGatewayResult(detail.gateway),
        processingReason: detail.processing_reason,
      }
    : { ...common, role: detail.role, seenAt: detail.seen_at };
}

/**
 * Maps activity filters; null preserves the authorized default scope and default pagination explicitly.
 * @throws {Error} If the selected subaccount owner is not 20 bytes or its name exceeds 12 bytes.
 */
export function mapMobileDraftTipsHistoryParamsToWire(
  params: GetMobileDraftTipsHistoryParams,
): MobileDraftWireTipsHistoryRequest {
  return {
    type: 'tips_history',
    mode: 'list',
    direction: params.direction ?? 'all',
    subaccount:
      params.subaccount == null ? null : subaccountToHex(params.subaccount),
    cursor: params.cursor ?? null,
    limit: params.limit ?? null,
  };
}

/**
 * Maps a v1 activity page without acknowledging, filtering, or reordering its entries.
 * @throws {Error} If a participant subaccount cannot be decoded as 32 bytes.
 */
export function mapMobileDraftTipsHistoryPage(
  page: MobileDraftWireTipsHistoryPage,
): MobileDraftTipsHistoryPage {
  return {
    tips: page.tips.map(mapDraftTipHistoryRow),
    nextCursor: page.next_cursor,
  };
}

/**
 * Maps one v1 Indexer-page annotation request, preserving decimal indices exactly.
 * @throws {Error} If the target subaccount owner is not 20 bytes or its name exceeds 12 bytes.
 */
export function mapMobileDraftTipCollateralMappingsParamsToWire(
  params: GetMobileDraftTipCollateralMappingsParams,
): MobileDraftWireTipCollateralMappingsRequest {
  return {
    type: 'tips_history',
    mode: 'collateral_mapping',
    subaccount: subaccountToHex(params.subaccount),
    product_id: params.productId,
    direction: params.direction,
    submission_indices: [...params.submissionIndices],
  };
}

/**
 * Maps v1 collateral facts without guessing an unknown remainder or hiding entries locally.
 * @throws {Error} If a source subaccount cannot be decoded as 32 bytes.
 */
export function mapMobileDraftTipCollateralMappings(
  result: MobileDraftWireTipCollateralMappings,
): MobileDraftTipCollateralMappings {
  return { mappings: result.mappings.map(mapDraftTipCollateralMapping) };
}

/**
 * Maps unseen verified-credit cards, preserving server order and their explicit null seen time.
 * @throws {Error} If a sender subaccount cannot be decoded as 32 bytes.
 */
export function mapMobileDraftReceivedTipsPage(
  page: MobileDraftWireReceivedTipsPage,
): MobileDraftReceivedTipsPage {
  return {
    tips: page.tips.map((tip) => ({
      tipId: tip.tip_id,
      sender: mapMobileDraftTipParticipant(tip.sender),
      netAmountX18: toBigNumber(tip.net_amount_x18),
      note: tip.note,
      backgroundId: tip.background_id,
      backgroundVersion: tip.background_version,
      creditedAtMs: tip.credited_at_ms,
      seenAt: tip.seen_at,
    })),
    nextCursor: page.next_cursor,
  };
}

function mapDraftTipDetailBase(
  detail: MobileDraftWireTipDetailBase,
): MobileDraftTipDetailBase {
  return {
    tipId: detail.tip_id,
    tipStatus: detail.tip_status,
    version: detail.version,
    sender: mapMobileDraftTipParticipant(detail.sender),
    recipient: mapMobileDraftTipParticipant(detail.recipient),
    productId: detail.product_id,
    netAmountX18: toBigNumber(detail.net_amount_x18),
    visibility: detail.visibility,
    note: detail.note,
    backgroundId: detail.background_id,
    backgroundVersion: detail.background_version,
    originPostId: detail.origin_post_id,
    originAvailability: detail.origin_availability,
    feedItemId: detail.feed_item_id,
    submittedAtMs: detail.submitted_at_ms,
    creditedAtMs: detail.credited_at_ms,
    withdrawalSubmissionIdx: detail.withdrawal_submission_idx,
    depositSubmissionIdx: detail.deposit_submission_idx,
  };
}

function mapDraftTipHistoryRow(
  row: MobileDraftWireTipHistoryRow,
): MobileDraftTipHistoryRow {
  const common: MobileDraftTipHistoryRowBase = {
    tipId: row.tip_id,
    tipStatus: row.tip_status,
    sender: mapMobileDraftTipParticipant(row.sender),
    recipient: mapMobileDraftTipParticipant(row.recipient),
    productId: row.product_id,
    netAmountX18: toBigNumber(row.net_amount_x18),
    visibility: row.visibility,
    submittedAtMs: row.submitted_at_ms,
    creditedAtMs: row.credited_at_ms,
    withdrawalSubmissionIdx: row.withdrawal_submission_idx,
    depositSubmissionIdx: row.deposit_submission_idx,
    note: row.note,
  };
  return row.role === 'sender'
    ? { ...common, role: row.role }
    : { ...common, role: row.role, seenAt: row.seen_at };
}

function mapDraftTipCollateralMapping(
  mapping: MobileDraftWireTipCollateralMapping,
): MobileDraftTipCollateralMapping {
  return {
    subaccount: subaccountFromHex(mapping.subaccount),
    productId: mapping.product_id,
    direction: mapping.direction,
    submissionIdx: mapping.submission_idx,
    depositTotalX18: mapDraftNullableAmount(mapping.deposit_total_x18),
    mappingState: mapping.mapping_state,
    classification: mapping.classification,
    tipTotalX18: mapDraftNullableAmount(mapping.tip_total_x18),
    ordinaryAmountX18: mapDraftNullableAmount(mapping.ordinary_amount_x18),
  };
}

function mapDraftNullableAmount(value: string | null): BigNumber | null {
  return value === null ? null : toBigNumber(value);
}

function mapDraftTipGatewayResult(
  gateway: MobileDraftWireTipGatewayResult,
): MobileDraftTipGatewayResult {
  return {
    status: gateway.status,
    errorCode: gateway.error_code,
    errorName: gateway.error_name,
  };
}

function mapDraftInteger(value: BigNumberish, field: string): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new RangeError(
      `${field} must not use an unsafe or fractional number.`,
    );
  }
  const amount = toBigNumber(value);
  if (!amount.isFinite() || !amount.isInteger() || amount.isNegative()) {
    throw new RangeError(`${field} must be a finite non-negative integer.`);
  }
  if (typeof value === 'string') {
    if (!/^(0|[1-9]\d*)$/.test(value)) {
      throw new RangeError(
        `${field} must use a canonical decimal integer string.`,
      );
    }
    return value;
  }
  return amount.toFixed(0);
}
