import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the OTC service API. OTC-specific codes use the service-owned
 * 70xxx range and mirror the backend's `execution_error_code` module; the remaining codes are
 * shared cross-service codes from the backend's common error enum, inlined via spread from
 * {@link NADO_ERROR_CODES}. A rejection returned directly by the Nado Gateway keeps its
 * original Gateway code instead (see `ENGINE_ERROR_CODES` in `@nadohq/engine-client`).
 *
 * These codes are returned in the `error_code` field of execution responses — see
 * {@link OtcServerExecutionFailure} and {@link OtcServerExecutionPendingResolution}. Branch on
 * `recovery_action` first; a code never authorizes resending a signed order.
 */
export const OTC_ERROR_CODES = {
  ...NADO_ERROR_CODES,

  // *** Request (700xx) ***
  INVALID_EXECUTION_REQUEST: 70000,
  TAKER_ORDER_CONFLICT: 70020,
  DEAL_ID_CONFLICT: 70021,
  /** The deal is still executing, even when `status` is `failure`. Poll `getExecutionStatus` again after `retry_after_ms`. */
  EXECUTION_IN_PROGRESS: 70022,
  /** No execution record for this deal. Settlement is unknown: resolve the position from Nado and never resubmit. */
  EXECUTION_NOT_FOUND: 70023,

  // *** OTC capacity and timing (701xx) ***
  OTC_CAPACITY_EXCEEDED: 70100,
  OTC_WORKER_UNAVAILABLE: 70101,
  EXECUTOR_SESSION_CAPACITY_EXCEEDED: 70102,
  EXECUTION_WORKER_FAILED: 70103,
  OTC_ADMISSION_LIMITED: 70104,
  OTC_EXECUTION_UNAVAILABLE: 70105,
  EXECUTION_EXPIRED: 70110,
  EXECUTION_WINDOW_TOO_SHORT: 70111,

  // *** Taker capacity (702xx) ***
  TAKER_INSUFFICIENT_CAPACITY: 70200,
  SPOT_QUOTE_CAPACITY_INSUFFICIENT: 70201,
  SPOT_BASE_CAPACITY_INSUFFICIENT: 70202,
  PERP_MARGIN_INSUFFICIENT: 70203,

  // *** Pricer and maker plan (703xx) ***
  PRICER_UNAVAILABLE: 70300,
  PRICE_NOT_ACCEPTABLE: 70301,
  INSUFFICIENT_LIQUIDITY: 70302,
  PRICER_CAPACITY_EXCEEDED: 70303,
  PRICER_IDEMPOTENCY_CONFLICT: 70304,
  PRICER_REQUEST_AMOUNT_INVALID: 70305,
  PRICER_PLAN_DEADLINE_INVALID: 70306,
  PRICER_EMPTY_PLAN: 70310,
  PRICER_TOO_MANY_MAKERS: 70311,
  PRICER_MAKER_PRODUCT_MISMATCH: 70312,
  PRICER_MAKER_SENDER_INVALID: 70313,
  PRICER_MAKER_SIGNATURE_INVALID: 70314,
  PRICER_MAKER_AMOUNT_INVALID: 70315,
  PRICER_MAKER_PRICE_INVALID: 70316,
  PRICER_MAKER_EXPIRED: 70317,
  PRICER_MAKER_NONCE_INVALID: 70318,
  PRICER_MAKER_APPENDIX_INVALID: 70319,
  PRICER_MAKER_SIDE_MISMATCH: 70320,
  PRICER_MAKER_LEVERAGE_INVALID: 70321,
  PRICER_MAKER_BORROW_MARGIN_INVALID: 70322,
  PRICER_SELF_TRADE: 70323,
  PRICER_DUPLICATE_MAKER: 70324,
  PRICER_MAKER_RECV_TIME_INVALID: 70325,
  PRICER_MAKER_AMOUNT_OFF_INCREMENT: 70326,
  PRICER_MAKER_PRICE_OFF_INCREMENT: 70327,
  PRICER_MAKER_BELOW_MINIMUM_NOTIONAL: 70328,
  PRICER_AMOUNT_MISMATCH: 70329,
  PRICER_LIMIT_VIOLATED: 70330,
  PRICER_MAKER_DIGEST_INVALID: 70331,
  PRICER_HEDGE_CAPACITY_INSUFFICIENT: 70332,

  // *** Order validation and Nado precheck (704xx) ***
  INVALID_ORDER_PRICE_INCREMENT: 70400,
  INVALID_ORDER_AMOUNT_INCREMENT: 70401,
  ORDER_BELOW_MINIMUM_NOTIONAL: 70402,
  ORDER_EXPIRED: 70403,
  ACCOUNT_INSUFFICIENT_HEALTH: 70404,
  ORDER_PRICE_OUTSIDE_ORACLE_RANGE: 70405,
  NADO_LATE_RECEIVE: 70406,
  NADO_EARLY_RECEIVE: 70407,
  INVALID_NONCE: 70408,
  INVALID_SIGNATURE: 70409,
  FOK_NOT_FILLED: 70410,
  ORDERS_CANNOT_BE_MATCHED: 70411,
  OTC_AMOUNT_MISMATCH: 70412,
  ORDERS_DO_NOT_CROSS: 70413,
  OTC_ORDER_TYPE_INVALID: 70414,
  OTC_SELF_TRADE: 70415,
  OTC_DUPLICATE_MAKER: 70416,
  NADO_INTERNAL_ERROR: 70417,
  NADO_PRECHECK_UNAVAILABLE: 70418,
  NADO_REJECTED: 70419,
  REDUCE_ONLY_INCREASES_POSITION: 70420,
  SIGNER_LOOKUP_UNAVAILABLE: 70421,

  // *** Settlement and unknown (705xx, 70999) ***
  /** Settlement outcome is unknown; returned with `status: "pending_resolution"`. Resolve the position from Nado and never resubmit. */
  SETTLEMENT_OUTCOME_UNKNOWN: 70500,
  /** Unclassified OTC error. */
  UNKNOWN: 70999,
} as const;

/**
 * Union of all known OTC service API error codes.
 */
export type OtcErrorCode =
  (typeof OTC_ERROR_CODES)[keyof typeof OTC_ERROR_CODES];
