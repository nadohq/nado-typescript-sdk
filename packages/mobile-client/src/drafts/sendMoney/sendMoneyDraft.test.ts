import { describe, expect, it, jest } from '@jest/globals';
import {
  getValidatedHex,
  subaccountFromHex,
  toBigNumber,
} from '@nadohq/shared';
import { MobileDraftSubmitTipParams } from './clientTypes';
import {
  mapMobileDraftSubmitTipParamsToWire,
  mapMobileDraftTipCollateralMappings,
  mapMobileDraftTipDetail,
  mapMobileDraftTipSenderCost,
} from './dataMappers';
import { MobileSendMoneyDraftClient } from './MobileSendMoneyDraftClient';
import {
  MobileDraftWireMarkTipsSeenRequest,
  MobileDraftWireReceivedTipDetail,
  MobileDraftWireReceivedTipHistoryRow,
  MobileDraftWireReceivedTipsPage,
  MobileDraftWireReceivedTipsRequest,
  MobileDraftWireSentTipDetail,
  MobileDraftWireSubmitTipRequest,
  MobileDraftWireSubmitTipResult,
  MobileDraftWireTipCollateralMappings,
  MobileDraftWireTipCollateralMappingsRequest,
  MobileDraftWireTipDetailRequest,
  MobileDraftWireTipHistoryRow,
  MobileDraftWireTipParticipant,
  MobileDraftWireTipsHistoryRequest,
  MobileSendMoneyDraftTransport,
} from './wireTypes';

type DraftScenario<TRequest, TResult> = { request: TRequest; result: TResult };
type DraftHandoffScenarios = Record<
  | 'fee_rejected'
  | 'reconfirmed_sending'
  | 'unknown_submission'
  | 'lost_response_recovery',
  DraftScenario<MobileDraftWireSubmitTipRequest, MobileDraftWireSubmitTipResult>
> &
  Record<
    'sender_sending_detail' | 'sender_credited_detail',
    DraftScenario<MobileDraftWireTipDetailRequest, MobileDraftWireSentTipDetail>
  > &
  Record<
    'recipient_credited_detail' | 'recipient_old_push_detail',
    DraftScenario<
      MobileDraftWireTipDetailRequest,
      MobileDraftWireReceivedTipDetail
    >
  > &
  Record<
    'received_before_seen' | 'received_after_seen',
    DraftScenario<
      MobileDraftWireReceivedTipsRequest,
      MobileDraftWireReceivedTipsPage
    >
  > &
  Record<
    | 'deposit_mapping_pending'
    | 'deposit_mapping_complete'
    | 'withdrawal_mapping_tip_only',
    DraftScenario<
      MobileDraftWireTipCollateralMappingsRequest,
      MobileDraftWireTipCollateralMappings
    >
  > & {
    recipient_history: DraftScenario<
      MobileDraftWireTipsHistoryRequest,
      {
        tips: MobileDraftWireReceivedTipHistoryRow[];
        next_cursor: string | null;
      }
    >;
    mark_seen: DraftScenario<MobileDraftWireMarkTipsSeenRequest, null>;
  };

// This checked-in synthetic fixture is trusted test data, not an unknown live response or signing vector.
// requireActual avoids adding a test-only JSON import to the composite TypeScript project's file list.
const fixtures = jest.requireActual<{ scenarios: DraftHandoffScenarios }>(
  './fixtures/send-money-frontend-mocks.json',
);
const requestFixture = fixtures.scenarios.fee_rejected.request;
const recipientSubaccount = subaccountFromHex(
  requestFixture.recipient_subaccount,
);

function createSubmitParams(
  overrides: Partial<MobileDraftSubmitTipParams> = {},
): MobileDraftSubmitTipParams {
  return {
    chainId: requestFixture.chain_id,
    recipientSubaccount,
    originPostId: requestFixture.origin_post_id,
    note: requestFixture.note,
    backgroundId: requestFixture.background_id,
    visibility: 'private',
    withdrawal: {
      ...requestFixture.withdrawal,
      sender: getValidatedHex(requestFixture.withdrawal.sender),
      sendTo: getValidatedHex(requestFixture.withdrawal.sendTo),
    },
    withdrawalSignature: requestFixture.withdrawal_signature,
    maxFeeX18: requestFixture.max_fee_x18,
    ...overrides,
  };
}

function createSubmitResult(
  scenario:
    | 'fee_rejected'
    | 'reconfirmed_sending'
    | 'unknown_submission'
    | 'lost_response_recovery' = 'fee_rejected',
): MobileDraftWireSubmitTipResult {
  const result = fixtures.scenarios[scenario].result;
  return {
    ...result,
    tip_status:
      scenario === 'fee_rejected'
        ? 'failed'
        : scenario === 'unknown_submission'
          ? 'reconciling'
          : 'sending',
    gateway: {
      ...result.gateway,
      status:
        scenario === 'fee_rejected'
          ? 'rejected'
          : scenario === 'unknown_submission'
            ? 'unknown'
            : 'accepted',
    },
  };
}

function createParticipant(participant: {
  subaccount: string;
  display_name: string | null;
  avatar_url: string | null;
}): MobileDraftWireTipParticipant {
  return {
    ...participant,
    subaccount: getValidatedHex(participant.subaccount),
  };
}

function createSenderDetail(
  overrides: Partial<MobileDraftWireSentTipDetail> = {},
): MobileDraftWireSentTipDetail {
  const detail = fixtures.scenarios.sender_sending_detail.result;
  return {
    ...detail,
    sender: createParticipant(detail.sender),
    recipient: createParticipant(detail.recipient),
    role: 'sender',
    tip_status: 'sending',
    visibility: 'private',
    sender_cost: { ...detail.sender_cost, fee_basis: 'execution_cap' },
    ...overrides,
  };
}

function createReceivedPage(
  afterSeen = false,
): MobileDraftWireReceivedTipsPage {
  const result = afterSeen
    ? fixtures.scenarios.received_after_seen.result
    : fixtures.scenarios.received_before_seen.result;
  return {
    ...result,
    tips: result.tips.map((tip) => ({
      ...tip,
      sender: createParticipant(tip.sender),
    })),
  };
}

function createMappings(
  scenario:
    | 'deposit_mapping_pending'
    | 'deposit_mapping_complete'
    | 'withdrawal_mapping_tip_only',
): MobileDraftWireTipCollateralMappings {
  return {
    mappings: fixtures.scenarios[scenario].result.mappings.map((mapping) => ({
      ...mapping,
      subaccount: getValidatedHex(mapping.subaccount),
      direction:
        scenario === 'withdrawal_mapping_tip_only' ? 'withdrawal' : 'deposit',
      mapping_state:
        scenario === 'deposit_mapping_pending' ? 'pending' : 'complete',
    })),
  };
}

function createTransport() {
  return {
    submitTip: jest
      .fn<MobileSendMoneyDraftTransport['submitTip']>()
      .mockResolvedValue(createSubmitResult()),
    getTipDetail: jest
      .fn<MobileSendMoneyDraftTransport['getTipDetail']>()
      .mockResolvedValue(createSenderDetail()),
    getTipsHistory: jest
      .fn<MobileSendMoneyDraftTransport['getTipsHistory']>()
      .mockResolvedValue({ tips: [], next_cursor: null }),
    getTipCollateralMappings: jest
      .fn<MobileSendMoneyDraftTransport['getTipCollateralMappings']>()
      .mockResolvedValue(createMappings('deposit_mapping_pending')),
    getReceivedTips: jest
      .fn<MobileSendMoneyDraftTransport['getReceivedTips']>()
      .mockResolvedValue(createReceivedPage()),
    markTipsSeen: jest
      .fn<MobileSendMoneyDraftTransport['markTipsSeen']>()
      .mockResolvedValue(null),
  } satisfies MobileSendMoneyDraftTransport;
}

describe('MobileSendMoneyDraftClient', () => {
  describe('submitTip', () => {
    it('returns the admitted fee rejection and waits for an explicit same-ID fee reconfirmation', async () => {
      const transport = createTransport();
      transport.submitTip
        .mockResolvedValueOnce(createSubmitResult())
        .mockResolvedValueOnce(createSubmitResult('reconfirmed_sending'));
      const client = new MobileSendMoneyDraftClient(transport);
      const original = createSubmitParams();
      const failed = await client.submitTip(original);
      expect(failed).toMatchObject({
        tipStatus: 'failed',
        gateway: { status: 'rejected', errorCode: 2135 },
        processingReason: 'FEE_TOO_LOW',
      });
      expect(transport.submitTip).toHaveBeenCalledTimes(1);
      expect(transport.submitTip).toHaveBeenNthCalledWith(1, requestFixture);

      const retry = createSubmitParams({
        maxFeeX18: fixtures.scenarios.reconfirmed_sending.request.max_fee_x18,
        expectedVersion: failed.version,
      });
      const sending = await client.submitTip(retry);
      expect(sending.tipId).toBe(failed.tipId);
      expect(sending.tipStatus).toBe('sending');
      expect(transport.submitTip).toHaveBeenNthCalledWith(
        2,
        fixtures.scenarios.reconfirmed_sending.request,
      );
      expect(original).toEqual(createSubmitParams());
      expect(retry.withdrawal).toEqual(original.withdrawal);
      expect(retry.withdrawalSignature).toBe(original.withdrawalSignature);
    });

    it('recovers an unknown result with identical inner nonce, signature, fields, and fee cap', async () => {
      const transport = createTransport();
      transport.submitTip
        .mockResolvedValueOnce(createSubmitResult('unknown_submission'))
        .mockResolvedValueOnce(createSubmitResult('lost_response_recovery'));
      const client = new MobileSendMoneyDraftClient(transport);
      const params = createSubmitParams({
        withdrawal: {
          ...createSubmitParams().withdrawal,
          nonce: fixtures.scenarios.unknown_submission.request.withdrawal.nonce,
        },
        withdrawalSignature:
          fixtures.scenarios.unknown_submission.request.withdrawal_signature,
      });
      const unknown = await client.submitTip(params);
      expect(unknown.tipStatus).toBe('reconciling');
      expect(transport.submitTip).toHaveBeenCalledTimes(1);
      const recovered = await client.submitTip(params);
      expect(recovered.tipId).toBe(unknown.tipId);
      expect(transport.submitTip).toHaveBeenNthCalledWith(
        1,
        fixtures.scenarios.unknown_submission.request,
      );
      expect(transport.submitTip).toHaveBeenNthCalledWith(
        2,
        fixtures.scenarios.lost_response_recovery.request,
      );
    });

    it('preserves explicit zero fees, large integers, original signed bytes32 spelling, and omitted retry version', async () => {
      const transport = createTransport();
      const client = new MobileSendMoneyDraftClient(transport);
      const params = createSubmitParams({
        chainId: '9007199254740993',
        maxFeeX18: 0,
        withdrawal: {
          ...createSubmitParams().withdrawal,
          sender:
            '0xABCDEF111111111111111111111111111111111164656661756c740000000000',
          amount: toBigNumber('9007199254740993123456789'),
          nonce: '9007199254740993',
        },
      });
      await client.submitTip(params);
      expect(transport.submitTip).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id: '9007199254740993',
          max_fee_x18: '0',
          withdrawal: expect.objectContaining({
            sender: params.withdrawal.sender,
            amount: '9007199254740993123456789',
            nonce: '9007199254740993',
          }),
        }),
      );
      expect(mapMobileDraftSubmitTipParamsToWire(params)).not.toHaveProperty(
        'expected_version',
      );
    });

    it.each(['1.5', '-1', 'NaN', 'Infinity', '00', '01', ' 1', '+1', '1e3'])(
      'rejects non-integer or invalid signed amounts without calling the adapter (%s)',
      async (amount) => {
        const transport = createTransport();
        const client = new MobileSendMoneyDraftClient(transport);
        await expect(
          client.submitTip(
            createSubmitParams({
              withdrawal: { ...createSubmitParams().withdrawal, amount },
            }),
          ),
        ).rejects.toBeInstanceOf(RangeError);
        expect(transport.submitTip).not.toHaveBeenCalled();
      },
    );

    it('rejects unsafe numeric inputs for native amount, appendix, and fee cap before adapter dispatch', async () => {
      const transport = createTransport();
      const client = new MobileSendMoneyDraftClient(transport);
      const unsafe = Number.MAX_SAFE_INTEGER + 1;
      const original = createSubmitParams();
      for (const params of [
        createSubmitParams({ maxFeeX18: unsafe }),
        createSubmitParams({
          withdrawal: { ...original.withdrawal, amount: unsafe },
        }),
        createSubmitParams({
          withdrawal: { ...original.withdrawal, appendix: unsafe },
        }),
      ]) {
        await expect(client.submitTip(params)).rejects.toBeInstanceOf(
          RangeError,
        );
      }
      expect(transport.submitTip).not.toHaveBeenCalled();
    });

    it('propagates adapter failures without retrying or substituting a fixture result', async () => {
      const transport = createTransport();
      const failure = new Error('Adapter failed before admission');
      transport.submitTip.mockRejectedValue(failure);
      await expect(
        new MobileSendMoneyDraftClient(transport).submitTip(
          createSubmitParams(),
        ),
      ).rejects.toBe(failure);
      expect(transport.submitTip).toHaveBeenCalledTimes(1);
    });

    it('preserves withheld dispatch and open processing reasons without retrying', async () => {
      const transport = createTransport();
      transport.submitTip.mockResolvedValue({
        ...createSubmitResult(),
        gateway: {
          status: 'not_submitted',
          error_code: null,
          error_name: null,
        },
        processing_reason: 'NONCE_SPENT_AFTER_FEE_REJECTION',
      });
      const result = await new MobileSendMoneyDraftClient(transport).submitTip(
        createSubmitParams(),
      );
      expect(result.gateway.status).toBe('not_submitted');
      expect(result.processingReason).toBe('NONCE_SPENT_AFTER_FEE_REJECTION');
      expect(transport.submitTip).toHaveBeenCalledTimes(1);
    });
  });

  describe('participant reads', () => {
    it('preserves nullable profiles and verified credit when sender detail enters review', () => {
      const result = mapMobileDraftTipDetail(
        createSenderDetail({
          tip_status: 'review_required',
          credited_at_ms: 1794992520000,
          sender: {
            ...createSenderDetail().sender,
            display_name: null,
            avatar_url: null,
          },
          gateway: { status: 'unknown', error_code: null, error_name: null },
          processing_reason: 'RECIPIENT_DEPOSIT_ADDRESS_CHANGED',
          origin_post_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          origin_availability: 'unavailable',
        }),
      );
      expect(result).toMatchObject({
        role: 'sender',
        tipStatus: 'review_required',
        creditedAtMs: 1794992520000,
        sender: { displayName: null, avatarUrl: null },
        gateway: { status: 'unknown', errorCode: null, errorName: null },
        processingReason: 'RECIPIENT_DEPOSIT_ADDRESS_CHANGED',
        originAvailability: 'unavailable',
      });
      expect(result).not.toHaveProperty('seenAt');
    });

    it('distinguishes an unknown sender fee from verified actual debit and a known zero charge', () => {
      const pending = mapMobileDraftTipDetail(createSenderDetail());
      expect(pending.role).toBe('sender');
      if (pending.role !== 'sender') throw new Error('Expected sender detail.');
      expect(pending.senderCost.actualFeeX18).toBeNull();
      expect(pending.senderCost.displayTotalX18.toFixed()).toBe(
        '5030000000000000000',
      );

      const credited = fixtures.scenarios.sender_credited_detail.result;
      const delivered = mapMobileDraftTipDetail(
        createSenderDetail({
          tip_status: 'credited',
          version: credited.version,
          credited_at_ms: credited.credited_at_ms,
          withdrawal_submission_idx: credited.withdrawal_submission_idx,
          deposit_submission_idx: credited.deposit_submission_idx,
          sender_cost: { ...credited.sender_cost, fee_basis: 'actual' },
        }),
      );
      if (delivered.role !== 'sender')
        throw new Error('Expected sender detail.');
      expect(delivered.senderCost.actualFeeX18?.toFixed()).toBe(
        '25000000000000000',
      );
      expect(delivered.senderCost.actualTotalX18?.toFixed()).toBe(
        '5025000000000000000',
      );
      const free = mapMobileDraftTipSenderCost({
        max_fee_x18: '0',
        actual_fee_x18: '0',
        actual_total_x18: '0',
        display_fee_x18: '0',
        display_total_x18: '0',
        fee_basis: 'not_executed',
      });
      expect(free.actualFeeX18?.isZero()).toBe(true);
      expect(free.actualTotalX18?.isZero()).toBe(true);
    });

    it('keeps loaded cards after explicit acknowledgement and still opens a previously seen push target', async () => {
      const transport = createTransport();
      transport.getReceivedTips
        .mockResolvedValueOnce(createReceivedPage())
        .mockResolvedValueOnce(createReceivedPage(true));
      const previous = fixtures.scenarios.recipient_old_push_detail.result;
      transport.getTipDetail.mockResolvedValue({
        ...previous,
        tip_status: 'review_required',
        visibility: 'private',
        role: 'recipient',
        sender: createParticipant(previous.sender),
        recipient: createParticipant(previous.recipient),
      });
      const client = new MobileSendMoneyDraftClient(transport);
      const loaded = await client.getReceivedTips({ limit: 10 });
      expect(loaded.tips.map((tip) => tip.tipId)).toEqual(
        fixtures.scenarios.received_before_seen.result.tips.map(
          (tip) => tip.tip_id,
        ),
      );
      expect(transport.markTipsSeen).not.toHaveBeenCalled();
      await client.markTipsSeen({ tipIds: [loaded.tips[0].tipId] });
      expect(transport.markTipsSeen).toHaveBeenCalledWith(
        fixtures.scenarios.mark_seen.request,
      );
      expect(loaded.tips).toHaveLength(2);
      const remaining = await client.getReceivedTips({ limit: 10 });
      expect(remaining.tips).toHaveLength(1);
      const detail = await client.getTipDetail({ tipId: previous.tip_id });
      expect(detail).toMatchObject({
        role: 'recipient',
        tipStatus: 'review_required',
        creditedAtMs: previous.credited_at_ms,
        seenAt: previous.seen_at,
      });
      expect(detail).not.toHaveProperty('senderCost');
      expect(detail).not.toHaveProperty('gateway');
      expect(detail).not.toHaveProperty('processingReason');
      expect(transport.markTipsSeen).toHaveBeenCalledTimes(1);
    });

    it('keeps equal-time mixed history in backend order and maps only recipient acknowledgement fields', async () => {
      const transport = createTransport();
      const received = fixtures.scenarios.recipient_history.result.tips[0];
      const tips: MobileDraftWireTipHistoryRow[] = [
        {
          ...received,
          sender: createParticipant(received.sender),
          recipient: createParticipant(received.recipient),
          tip_id: '44444444-4444-4444-8444-444444444444',
          role: 'sender',
          submitted_at_ms: 1794992520000,
          credited_at_ms: null,
        },
        {
          ...received,
          sender: createParticipant(received.sender),
          recipient: createParticipant(received.recipient),
          role: 'recipient',
          submitted_at_ms: 1794992400000,
          credited_at_ms: 1794992520000,
        },
      ];
      transport.getTipsHistory.mockResolvedValue({
        tips,
        next_cursor: 'mixed-page-2',
      });
      const page = await new MobileSendMoneyDraftClient(
        transport,
      ).getTipsHistory();
      expect(page.tips.map((tip) => tip.tipId)).toEqual(
        tips.map((tip) => tip.tip_id),
      );
      expect(page.nextCursor).toBe('mixed-page-2');
      expect(page.tips[0]).not.toHaveProperty('seenAt');
      expect(page.tips[1]).toHaveProperty('seenAt', null);
      expect(transport.markTipsSeen).not.toHaveBeenCalled();
    });

    it('preserves wallet-wide pagination defaults and received history order without acknowledgement', async () => {
      const transport = createTransport();
      const tips: MobileDraftWireReceivedTipHistoryRow[] =
        fixtures.scenarios.recipient_history.result.tips.map((row) => ({
          ...row,
          role: 'recipient',
          tip_status: 'credited',
          visibility: 'private',
          sender: createParticipant(row.sender),
          recipient: createParticipant(row.recipient),
        }));
      transport.getTipsHistory.mockResolvedValue({
        tips,
        next_cursor: 'opaque-page-2',
      });
      const client = new MobileSendMoneyDraftClient(transport);
      await client.getTipsHistory();
      expect(transport.getTipsHistory).toHaveBeenNthCalledWith(1, {
        type: 'tips_history',
        mode: 'list',
        direction: 'all',
        subaccount: null,
        cursor: null,
        limit: null,
      });
      const history = await client.getTipsHistory({
        direction: 'received',
        subaccount: recipientSubaccount,
        limit: 20,
      });
      expect(transport.getTipsHistory).toHaveBeenNthCalledWith(
        2,
        fixtures.scenarios.recipient_history.request,
      );
      expect(history.nextCursor).toBe('opaque-page-2');
      expect(history.tips.map((tip) => tip.tipId)).toEqual(
        tips.map((tip) => tip.tip_id),
      );
      expect(history.tips[0].netAmountX18.toFixed()).toBe(
        '5000000000000000000',
      );
      expect(transport.markTipsSeen).not.toHaveBeenCalled();
    });
  });

  describe('collateral mapping', () => {
    it('deduplicates exact indices in first-occurrence order without changing caller-owned input', async () => {
      const transport = createTransport();
      const client = new MobileSendMoneyDraftClient(transport);
      const indices = [
        '18446744073709551615',
        '9007199254740993',
        '18446744073709551615',
        '0',
      ];
      const original = [...indices];
      await client.getTipCollateralMappings({
        subaccount: recipientSubaccount,
        productId: 0,
        direction: 'deposit',
        submissionIndices: indices,
      });
      expect(transport.getTipCollateralMappings).toHaveBeenCalledWith({
        type: 'tips_history',
        mode: 'collateral_mapping',
        subaccount:
          fixtures.scenarios.deposit_mapping_pending.request.subaccount,
        product_id: 0,
        direction: 'deposit',
        submission_indices: ['18446744073709551615', '9007199254740993', '0'],
      });
      expect(indices).toEqual(original);
    });

    it('keeps an unknown remainder pending and maps the complete mixed deposit to the server remainder', async () => {
      const transport = createTransport();
      transport.getTipCollateralMappings
        .mockResolvedValueOnce(createMappings('deposit_mapping_pending'))
        .mockResolvedValueOnce(createMappings('deposit_mapping_complete'));
      const client = new MobileSendMoneyDraftClient(transport);
      const params = {
        subaccount: recipientSubaccount,
        productId: 0,
        direction: 'deposit',
        submissionIndices: ['501'],
      } as const;
      const pending = await client.getTipCollateralMappings({
        ...params,
        submissionIndices: [...params.submissionIndices],
      });
      expect(pending.mappings[0].ordinaryAmountX18).toBeNull();
      expect(pending.mappings[0].tipTotalX18).toBeNull();
      const complete = await client.getTipCollateralMappings({
        ...params,
        submissionIndices: [...params.submissionIndices],
      });
      expect(complete.mappings[0].classification).toBe('split');
      expect(complete.mappings[0].depositTotalX18?.toFixed()).toBe(
        '22000000000000000000',
      );
      expect(complete.mappings[0].tipTotalX18?.toFixed()).toBe(
        '10000000000000000000',
      );
      expect(complete.mappings[0].ordinaryAmountX18?.toFixed()).toBe(
        '12000000000000000000',
      );
      expect(transport.getTipCollateralMappings).toHaveBeenNthCalledWith(
        1,
        fixtures.scenarios.deposit_mapping_pending.request,
      );
      expect(transport.getTipCollateralMappings).toHaveBeenNthCalledWith(
        2,
        fixtures.scenarios.deposit_mapping_complete.request,
      );
      const withdrawal = mapMobileDraftTipCollateralMappings(
        createMappings('withdrawal_mapping_tip_only'),
      );
      expect(withdrawal.mappings[0].classification).toBe('tip_only');
      expect(withdrawal.mappings[0].ordinaryAmountX18).toBeNull();
    });

    it('preserves review-required nulls, source index precision, and caller-owned arrays', async () => {
      const transport = createTransport();
      transport.getTipCollateralMappings.mockImplementation((request) => {
        request.submission_indices.push('adapter-local');
        return Promise.resolve({
          mappings: [
            {
              ...createMappings('deposit_mapping_pending').mappings[0],
              submission_idx: '9007199254740993',
              mapping_state: 'review_required',
              classification: 'pending',
            },
          ],
        });
      });
      const client = new MobileSendMoneyDraftClient(transport);
      const indices = ['9007199254740993'];
      const result = await client.getTipCollateralMappings({
        subaccount: recipientSubaccount,
        productId: 0,
        direction: 'deposit',
        submissionIndices: indices,
      });
      expect(indices).toEqual(['9007199254740993']);
      expect(result.mappings[0].submissionIdx).toBe('9007199254740993');
      expect(result.mappings[0].ordinaryAmountX18).toBeNull();
      expect(result.mappings[0].mappingState).toBe('review_required');
    });
  });
});
