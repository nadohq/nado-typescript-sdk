import { Subaccount } from '@nadohq/contracts';
import { BigDecimal } from '@nadohq/utils';
import {
  GetIndexerInterestFundingPaymentsParams,
  GetIndexerInterestFundingPaymentsResponse,
  GetIndexerLeaderboardParams,
  GetIndexerLeaderboardResponse,
  GetIndexerMatchEventsParams,
  GetIndexerOrdersParams,
  IndexerEventBalanceStateSnapshot,
  IndexerEventPerpStateSnapshot,
  IndexerEventSpotStateSnapshot,
  IndexerEventWithTx,
  IndexerMatchEvent,
  IndexerOrder,
} from './clientTypes';
import { CollateralEventType } from './collateralEventType';
import { NadoTx } from './NadoTx';

export interface IndexerPaginationParams {
  limit: number;
  // Retrieves events inclusive of this start cursor
  startCursor?: string;
}

export interface IndexerPaginationMeta {
  hasMore: boolean;
  nextCursor?: string;
}

export type WithPaginationMeta = { meta: IndexerPaginationMeta };

type BaseSubaccountPaginationParams = Subaccount &
  IndexerPaginationParams & {
    /**
     * If provided, only events with a timestamp in seconds <= this value will be returned
     * Specifying `startCursor` will supercede this value
     */
    maxTimestampInclusive?: number;
  };

export interface BaseIndexerPaginatedEvent extends Subaccount {
  timestamp: BigDecimal;
  submissionIndex: string;
  tx: NadoTx;
}

export interface PaginatedIndexerEventsResponse<
  T extends BaseIndexerPaginatedEvent,
> extends WithPaginationMeta {
  events: T[];
}

/**
 * Collateral
 */

export interface GetIndexerSubaccountCollateralEventsParams
  extends BaseSubaccountPaginationParams {
  eventTypes?: CollateralEventType[];
  // If not given, will return both isolated & non-iso events
  isolated?: boolean;
}

export interface IndexerCollateralEvent extends BaseIndexerPaginatedEvent {
  eventType: CollateralEventType;
  // Positive for deposits, negative for withdrawals
  amount: BigDecimal;
  // The collateral balance after the event
  newAmount: BigDecimal;
  snapshot: IndexerEventSpotStateSnapshot;
}

export type GetIndexerSubaccountCollateralEventsResponse =
  PaginatedIndexerEventsResponse<IndexerCollateralEvent>;

/**
 * VLP
 */
export type GetIndexerSubaccountVlpEventsParams =
  BaseSubaccountPaginationParams;

export interface IndexerVlpEvent extends BaseIndexerPaginatedEvent {
  vlpDelta: BigDecimal;
  primaryQuoteDelta: BigDecimal;
}

export type GetIndexerSubaccountVlpEventsResponse =
  PaginatedIndexerEventsResponse<IndexerVlpEvent>;

/**
 * Match events
 */

export type GetIndexerSubaccountMatchEventParams =
  BaseSubaccountPaginationParams &
    Pick<GetIndexerMatchEventsParams, 'productIds' | 'isolated'>;

export type GetIndexerSubaccountMatchEventsResponse =
  PaginatedIndexerEventsResponse<IndexerMatchEvent>;

/**
 * Orders
 */

export type GetIndexerPaginatedOrdersParams = BaseSubaccountPaginationParams &
  Pick<GetIndexerOrdersParams, 'productIds' | 'isolated'>;

export interface GetIndexerPaginatedOrdersResponse {
  orders: IndexerOrder[];
  meta: IndexerPaginationMeta;
}

/**
 * Liquidations
 */

export type GetIndexerSubaccountLiquidationEventsParams =
  BaseSubaccountPaginationParams;

type WithIndexerEvent<
  TData,
  TStateType extends IndexerEventBalanceStateSnapshot,
> = TData & {
  indexerEvent: IndexerEventWithTx<TStateType>;
};

export interface IndexerLiquidationEvent extends BaseIndexerPaginatedEvent {
  // Either spot or perp will then be liquidated if the subaccount maint. health is below 0
  // Both spot & perp can be liquidated in the same event from a spread liquidation
  spot?: WithIndexerEvent<
    {
      // The original balance that was liquidated
      // ex. if it was originally a short, amount is negative, but the net delta from the liquidation is positive
      amountLiquidated: BigDecimal;
    },
    IndexerEventSpotStateSnapshot
  >;
  perp?: WithIndexerEvent<
    {
      // The original balance that was liquidated
      // ex. if it was originally a short, amount is negative, but the net delta from the liquidation is positive
      amountLiquidated: BigDecimal;
    },
    IndexerEventPerpStateSnapshot
  >;
  // Quote delta for the subaccount
  // Only the SPOT QUOTE payment made for the liquidation. Does not include the perp vQuote balance change
  quote: WithIndexerEvent<
    {
      balanceDelta: BigDecimal;
    },
    IndexerEventSpotStateSnapshot
  >;
}

export type GetIndexerSubaccountLiquidationEventsResponse =
  PaginatedIndexerEventsResponse<IndexerLiquidationEvent>;

/**
 * Settlement
 */

export type GetIndexerSubaccountSettlementEventsParams =
  BaseSubaccountPaginationParams;

export interface IndexerSettlementEvent extends BaseIndexerPaginatedEvent {
  // Quote delta for the subaccount being settled
  quoteDelta: BigDecimal;
  snapshot: IndexerEventPerpStateSnapshot;
  isolated: boolean;
}

export type GetIndexerSubaccountSettlementEventsResponse =
  PaginatedIndexerEventsResponse<IndexerSettlementEvent>;

/**
 * Interest / Funding
 */

export type GetIndexerSubaccountInterestFundingPaymentsParams =
  BaseSubaccountPaginationParams &
    Pick<GetIndexerInterestFundingPaymentsParams, 'productIds' | 'startCursor'>;

export interface GetIndexerPaginatedInterestFundingPaymentsResponse
  extends GetIndexerInterestFundingPaymentsResponse {
  meta: IndexerPaginationMeta;
}

export type GetIndexerPaginatedLeaderboardParams = IndexerPaginationParams &
  Pick<GetIndexerLeaderboardParams, 'contestId' | 'rankType'>;

export type GetIndexerPaginatedLeaderboardResponse = WithPaginationMeta &
  GetIndexerLeaderboardResponse;
