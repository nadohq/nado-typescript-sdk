import {
  GetMobileDraftReceivedTipsParams,
  GetMobileDraftTipCollateralMappingsParams,
  GetMobileDraftTipDetailParams,
  GetMobileDraftTipsHistoryParams,
  MobileDraftMarkTipsSeenParams,
  MobileDraftReceivedTipsPage,
  MobileDraftSubmitTipParams,
  MobileDraftSubmitTipResult,
  MobileDraftTipCollateralMappings,
  MobileDraftTipDetail,
  MobileDraftTipsHistoryPage,
} from './clientTypes';
import {
  mapMobileDraftReceivedTipsPage,
  mapMobileDraftSubmitTipParamsToWire,
  mapMobileDraftSubmitTipResult,
  mapMobileDraftTipCollateralMappings,
  mapMobileDraftTipCollateralMappingsParamsToWire,
  mapMobileDraftTipDetail,
  mapMobileDraftTipsHistoryPage,
  mapMobileDraftTipsHistoryParamsToWire,
} from './dataMappers';
import { MobileSendMoneyDraftTransport } from './wireTypes';

/**
 * Mock frontend adapter for the 22 November 2026 Send Money handoff. An explicit decoded-business
 * transport is required; this class has no default network, signer, fee retry, or Engine dispatch. It does
 * not register the v1 operations with the production MobileClient signing or capability protocols.
 */
export class MobileSendMoneyDraftClient {
  /** Caller-owned mock/business adapter, scoped to its authenticated wallet where applicable. */
  readonly transport: MobileSendMoneyDraftTransport;

  /** Creates a v1 adapter with an explicit mock/business transport. */
  constructor(transport: MobileSendMoneyDraftTransport) {
    this.transport = transport;
  }

  /**
   * Submits exactly the v1 business request once. A fee rejection or unknown result is returned as
   * business state; no fee cap increase, re-signing, or automatic retry is performed. For recovery, retain
   * the original withdrawal and signature. Only failed + FEE_TOO_LOW calls for a fresh quote and explicit
   * user confirmation; a Gateway error name alone may describe an older execution attempt.
   * @throws {RangeError} If an amount, fee, or appendix is negative, fractional, non-finite, an unsafe
   * numeric integer, or a noncanonical decimal string.
   * @throws {Error} If the recipient owner is not 20 bytes or its subaccount name exceeds 12 bytes.
   * @throws Propagates an injected transport rejection without retrying.
   */
  async submitTip(
    params: MobileDraftSubmitTipParams,
  ): Promise<MobileDraftSubmitTipResult> {
    return mapMobileDraftSubmitTipResult(
      await this.transport.submitTip(
        mapMobileDraftSubmitTipParamsToWire(params),
      ),
    );
  }

  /**
   * Reads one participant-visible Tip, including already-seen push targets, without acknowledging it.
   * @throws {Error} If either returned participant subaccount cannot be decoded as 32 bytes.
   * @throws Propagates an injected transport rejection.
   */
  async getTipDetail(
    params: GetMobileDraftTipDetailParams,
  ): Promise<MobileDraftTipDetail> {
    return mapMobileDraftTipDetail(
      await this.transport.getTipDetail({
        type: 'tip_detail',
        tip_id: params.tipId,
      }),
    );
  }

  /**
   * Reads activity in server order: sent entries use submission time, received entries verified credit
   * time. With no subaccount filter, owners read their wallet and linked signers their outer sender.
   * The injected adapter must enforce authorization on the outer sender and relevant participant.
   * @throws {Error} If the selected subaccount cannot be encoded as 32 bytes or a returned participant
   * subaccount cannot be decoded as 32 bytes.
   * @throws Propagates an injected transport rejection.
   */
  async getTipsHistory(
    params: GetMobileDraftTipsHistoryParams = {},
  ): Promise<MobileDraftTipsHistoryPage> {
    return mapMobileDraftTipsHistoryPage(
      await this.transport.getTipsHistory(
        mapMobileDraftTipsHistoryParamsToWire(params),
      ),
    );
  }

  /**
   * Annotates one active-chain Indexer page without hiding entries or calculating unknown remainders.
   * Continue using the Indexer cursor even when all returned entries are classified as tip_only.
   * Merge by source index within the same subaccount, product, and direction; retain complete rows and
   * requery pending deposits in batches of at most four.
   * Linked signers require current authorization for both the outer sender and target subaccount.
   * @throws {Error} If the target subaccount cannot be encoded as 32 bytes or a returned source subaccount
   * cannot be decoded as 32 bytes.
   * @throws Propagates an injected transport rejection.
   */
  async getTipCollateralMappings(
    params: GetMobileDraftTipCollateralMappingsParams,
  ): Promise<MobileDraftTipCollateralMappings> {
    return mapMobileDraftTipCollateralMappings(
      await this.transport.getTipCollateralMappings(
        mapMobileDraftTipCollateralMappingsParamsToWire(params),
      ),
    );
  }

  /**
   * Reads unseen verified-credit cards oldest first, including records subsequently placed under review.
   * A page length is not a total unseen count, and
   * this read never calls markTipsSeen. Keep loaded cards in screen state after explicit acknowledgement.
   * @throws {Error} If a returned sender subaccount cannot be decoded as 32 bytes.
   * @throws Propagates an injected transport rejection.
   */
  async getReceivedTips(
    params: GetMobileDraftReceivedTipsParams = {},
  ): Promise<MobileDraftReceivedTipsPage> {
    return mapMobileDraftReceivedTipsPage(
      await this.transport.getReceivedTips({
        type: 'received_tips',
        cursor: params.cursor ?? null,
        limit: params.limit ?? null,
      }),
    );
  }

  /**
   * Explicitly acknowledges only the supplied displayed Tip IDs. The adapter/server owns first-seen time;
   * this is separate from Inbox notification acknowledgements and has no implicit read side effect.
   * @throws Propagates an injected transport rejection.
   */
  async markTipsSeen(params: MobileDraftMarkTipsSeenParams): Promise<void> {
    await this.transport.markTipsSeen({
      type: 'mark_tips_seen',
      tip_ids: [...params.tipIds],
    });
  }
}
