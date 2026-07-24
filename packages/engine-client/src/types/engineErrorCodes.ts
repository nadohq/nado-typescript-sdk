import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the engine service API. Codes shared across all Nado backend
 * services (see {@link NADO_ERROR_CODES}) are inlined via spread; engine-specific codes are in
 * the 2xxx range and come from the backend's `ResponseError` enum (see `nado-utils/src/error.rs`).
 *
 * These codes are returned in the `error_code` field of both `/query` and `/execute` failure
 * responses — see {@link EngineServerQueryFailureResponse} and
 * {@link EngineServerExecuteFailureResult}. The trigger service reuses the same 2xxx codes via
 * {@link TRIGGER_ERROR_CODES}.
 */
export const ENGINE_ERROR_CODES = {
  ...NADO_ERROR_CODES,

  // *** Query/Execute errors (2xxx) — engine & trigger ***
  /** Order price not divisible by the market's price increment. */
  INVALID_PRICE_INCREMENT: 2000,
  /** Order amount not divisible by the market's size increment. */
  INVALID_AMOUNT_INCREMENT: 2001,
  /** Order amount is zero. */
  ZERO_AMOUNT: 2002,
  /** Order amount is below the market's minimum size. */
  ORDER_AMOUNT_TOO_SMALL: 2003,
  /** Order has already expired. */
  ORDER_EXPIRED: 2004,
  /** Maximum open orders limit reached for the market. */
  MAX_ORDERS_LIMIT_REACHED: 2005,
  /** Order would lower account health below the required threshold. */
  UNHEALTHY_ORDER: 2006,
  /** Order price is outside the allowed oracle price deviation range. */
  ORACLE_PRICE_DIFFERENCE: 2007,
  /** Post-only order would cross the book. */
  POST_ONLY_ORDER_CROSSES_BOOK: 2008,
  /** Order type is not supported. */
  ORDER_TYPE_NOT_SUPPORTED: 2009,
  /** Taker health checks failed at match time. */
  INVALID_TAKER: 2010,
  /** Request received after its `recv_time`. */
  LATE_RECV_EXECUTION: 2011,
  /** Request received more than 100s before its `recv_time`. */
  EARLY_RECV_EXECUTION: 2012,
  /** An order with the same digest already exists. */
  DIGEST_ALREADY_EXISTS: 2013,
  /** Cancellation request targets an order from a different subaccount. */
  UNAUTHORIZED_SUBACCOUNT_CANCELLATION: 2014,
  /** Market for the given product/ticker ID was not found. */
  MARKET_NOT_FOUND: 2015,
  /** Invalid product ID. */
  INVALID_PRODUCT_ID: 2016,
  /** Spot execute without leverage would exceed the borrow limit. */
  SPOT_EXECUTE_EXCEEDS_BORROW_LIMIT: 2017,
  /** Product ID must refer to a spot market. */
  INVALID_SPOT_PRODUCT_ID: 2018,
  /** Spot leverage flag applied to a non-spot product. */
  INAPPROPRIATE_SPOT_LEVERAGE: 2019,
  /** Order with the given digest was not found. */
  ORDER_NOT_FOUND: 2020,
  /** Address risk too high. */
  ADDRESS_RISK_TOO_HIGH: 2021,
  /** Invalid nonce. */
  INVALID_NONCE: 2022,
  /** Address risk screening is still pending. */
  ADDRESS_SCREENING_PENDING: 2023,
  /** Address has no prior deposits. */
  NO_PRIOR_DEPOSIT: 2024,
  /** Single-signature session requires a minimum account value. */
  SINGLE_SIGNATURE_INSUFFICIENT_ACCOUNT_VALUE: 2025,
  /** Attempted to link the same signer address twice. */
  DUPLICATE_SIGNER_LINKING: 2026,
  /** Signature is the wrong length. */
  SIGNATURE_LENGTH: 2027,
  // 2028 INVALID_SIGNER is in NADO_ERROR_CODES (shared across all signed services).
  /** Signer address cannot be zero. */
  INVALID_SIGNER_ZERO: 2029,
  /** Linked signer update rate limit exceeded. */
  LINKED_SIGNER_UPDATE_LIMIT_EXCEEDED: 2030,
  /** Fill-or-kill order could not be fully filled. */
  FILL_OR_KILL_NOT_FILLED: 2031,
  /** No sender field in the signed payload. */
  SENDER_MISSING_IN_PAYLOAD: 2032,
  /** No nonce field in the signed payload. */
  NONCE_MISSING_IN_PAYLOAD: 2033,
  /** Invalid signature `v` value. */
  INVALID_SIGNATURE_V: 2034,
  /** Generic signature verification error. */
  SIGNATURE_ERROR: 2035,
  /** Subaccount health is too low for the operation. */
  SUBACCOUNT_HEALTH_TOO_LOW: 2036,
  /** Attempted to burn more LP tokens than owned. */
  EXCESSIVE_LP_TOKEN_BURN: 2037,
  /** Invalid execute message format. */
  INVALID_EXECUTE_MESSAGE: 2038,
  /** digests and product_ids arrays have mismatched lengths. */
  MISMATCHED_DIGESTS_AND_PRODUCT_IDS_LENGTH: 2039,
  /** Invalid boolean value in the request. */
  INVALID_BOOL: 2040,
  /** Rebate execute subaccounts/amounts arrays have mismatched lengths. */
  REBATE_EXECUTE_FORMATTING: 2041,
  /** Account is not eligible for liquidation. */
  NOT_LIQUIDATABLE: 2042,
  /** Liquidator's health is too low. */
  LIQUIDATOR_HEALTH_TOO_LOW: 2043,
  /** Liquidation amount exceeds the available amount. */
  LIQUIDATION_AMOUNT_TOO_MUCH: 2044,
  /** Invalid liquidation parameters. */
  INVALID_LIQUIDATION_PARAMETERS: 2045,
  /** Perp liquidation amount not divisible by size increment. */
  PERP_LIQUIDATION_SIZE_INCREMENT_MISMATCH: 2046,
  /** Liquidation amount is too small, too large, or has a sign mismatch. */
  INVALID_LIQUIDATION_AMOUNT: 2047,
  /** Cannot liquidate liabilities before perps. */
  LIABILITIES_BEFORE_PERPS_LIQUIDATION_ATTEMPT: 2048,
  /** ERC20 transfer failed on-chain. */
  TRANSFER_FAILED: 2049,
  /** Action is not authorized for the sender. */
  UNAUTHORIZED_ACTION: 2050,
  /** Subaccount is not eligible for finalization. */
  NOT_FINALIZABLE_SUBACCOUNT: 2051,
  /** Maker subaccount is invalid or failed the risk check. */
  INVALID_MAKER: 2052,
  /** Internal matching error: orders cannot be matched. */
  ORDERS_CANNOT_BE_MATCHED: 2053,
  /** Slippage exceeds the allowed maximum. */
  SLIPPAGE_TOO_HIGH: 2054,
  /** Price must be greater than zero. */
  INVALID_PRICE: 2055,
  /** Immediate-or-cancel order does not cross the book. */
  IMMEDIATE_OR_CANCEL_DOES_NOT_CROSS: 2056,
  /** Maximum trigger orders limit reached for the subaccount. */
  MAX_TRIGGER_ORDERS_LIMIT_REACHED: 2057,
  /** Trigger order with the given digest was not found. */
  TRIGGER_ORDER_NOT_FOUND: 2058,
  /** Submitted order is not a trigger order. */
  NOT_TRIGGER_ORDER: 2059,
  /** product_ids contains invalid or duplicate products. */
  INVALID_PRODUCT_IDS: 2060,
  /** product_type must be 'spot' or 'perp'. */
  INVALID_PRODUCT_TYPE: 2061,
  /** product_ids is empty. */
  MISSING_PRODUCT_IDS: 2062,
  /** Invalid query response. */
  INVALID_QUERY_RESPONSE: 2063,
  /** Reduce-only order would increase the position. */
  REDUCE_ONLY_INCREASES_POSITION: 2064,
  /** Bits 15-64 of the order appendix must be unset. */
  INVALID_APPENDIX_BITS: 2065,
  /** Cancel-and-place request has mismatched sender/signer between cancel and place. */
  CANCEL_AND_PLACE_DIFFERENT_SENDER_OR_SIGNER: 2066,
  /** Only taker orders can be reduce-only. */
  REDUCE_ONLY_NOT_TAKER: 2067,
  /** Invalid timestamp in spot/perp tick. */
  INVALID_TIME: 2068,
  /** Trading is blocked for this market. */
  MARKET_TRADING_BLOCKED: 2069,
  /** Market has reached its maximum open interest. */
  MARKET_MAX_OPEN_INTEREST: 2070,
  /** Product is at maximum utilization. */
  MAX_UTILIZATION: 2071,
  /** Order batch exceeds the maximum batch size. */
  ORDER_BATCH_EXCEED_LIMIT: 2072,
  /** Self-match (matching against own order) is not allowed. */
  SELF_MATCH_NOT_ALLOWED: 2073,
  /** Product IDs in the request do not match. */
  MISMATCHED_PRODUCT_IDS: 2074,
  // 2075-2076 are reserved/skipped in the backend.
  /** Transfer quote amount is below the 5 USDT0 minimum. */
  TRANSFER_QUOTE_AMOUNT_TOO_SMALL: 2077,
  /** New recipient limit for transfer quotes exceeded; wait 24h. */
  TRANSFER_QUOTE_NEW_RECIPIENT_LIMIT_EXCEEDED: 2078,
  /** Self-transfer quote is not allowed. */
  SELF_TRANSFER_QUOTE_NOT_ALLOWED: 2079,
  /** WebSocket requires `permessage-deflate` compression header. */
  WEBSOCKET_COMPRESSION_REQUIRED: 2080,
  /** Isolated subaccount cannot place orders. */
  ISOLATED_SUBACCOUNT_CANNOT_PLACE_ORDER: 2081,
  /** Invalid product ID for an isolated subaccount. */
  ISOLATED_SUBACCOUNT_INVALID_PRODUCT: 2082,
  /** Isolated orders cannot be placed on spot markets. */
  INVALID_ISOLATED_SPOT_ORDER: 2083,
  // 2084-2085 are reserved/skipped in the backend.
  /** Isolated margin must be non-negative. */
  INVALID_ISOLATED_MARGIN: 2086,
  /** Failed to create an isolated subaccount. */
  FAILED_TO_CREATE_ISOLATED_SUBACCOUNT: 2087,
  // 2088 is reserved/skipped in the backend.
  /** Cannot link a signer to an isolated subaccount. */
  INVALID_LINK_SIGNER_SENDER: 2089,
  /** NLP mint amount is below the 1 USDT0 minimum. */
  MINT_NLP_AMOUNT_TOO_SMALL: 2090,
  /** Order amount is too large. */
  AMOUNT_TOO_LARGE: 2091,
  /** N_ACCOUNT health is too low. */
  N_ACCOUNT_HEALTH_TOO_LOW: 2092,
  /** Cannot execute on a non-canonical chain. */
  NOT_CANONICAL_CHAIN: 2093,
  /** Order notional (amount * price) is below the minimum size. */
  ORDER_SIZE_TOO_SMALL: 2094,
  /** Order version in the appendix does not match the expected version. */
  INVALID_ORDER_VERSION: 2095,
  /** Not enough unlocked NLP to perform the operation. */
  UNLOCKED_NLP_INSUFFICIENT: 2096,
  /** Invalid trigger order appendix. */
  INVALID_TRIGGER_ORDER: 2097,
  /** Invalid TWAP order configuration. */
  INVALID_TWAP: 2098,
  /** TWAP order must be immediate-or-cancel. */
  INVALID_TWAP_ORDER_TYPE: 2099,
  /** TWAP number of times is out of range. */
  INVALID_TWAP_TIMES: 2100,
  /** TWAP amount is not divisible by the number of times. */
  INVALID_TWAP_AMOUNT_DISTRIBUTION: 2101,
  /** TWAP expiration exceeds the 25-hour maximum. */
  INVALID_TWAP_EXPIRATION: 2102,
  /** TWAP interval is out of range. */
  INVALID_TWAP_INTERVAL: 2103,
  /** TWAP total duration exceeds 86400 seconds. */
  INVALID_TWAP_TOTAL_DURATION: 2104,
  /** TWAP expiration is before the minimum required time. */
  INVALID_TWAP_EXPIRATION_TIMING: 2105,
  /** TWAP random configuration flags are mismatched. */
  INVALID_TWAP_RANDOM_CONFIGURATION: 2106,
  /** TWAP amount is zero or has a sign mismatch. */
  INVALID_TWAP_AMOUNT: 2107,
  /** TWAP individual amounts do not sum to the order amount. */
  INVALID_TWAP_AMOUNTS_SUM: 2108,
  /** TWAP trigger_amount configuration is mismatched. */
  INVALID_TWAP_TRIGGER_AMOUNT_CONFIGURATION: 2109,
  /** TWAP orders cannot be isolated. */
  INVALID_TWAP_ISOLATED: 2110,
  /** Cannot place more than 50 orders in a single batch. */
  MAX_ORDER_LIMIT_EXCEEDED: 2111,
  /** NLP pool accounts cannot place isolated orders. */
  NLP_POOL_ACCOUNTS_CANNOT_PLACE_ISOLATED_ORDER: 2112,
  /** NLP pool accounts cannot place trigger orders. */
  NLP_POOL_ACCOUNTS_CANNOT_PLACE_TRIGGER_ORDER: 2113,
  /** Batch orders must have the same sender. */
  BATCH_SENDER_MISMATCH: 2114,
  /** Liquidation was frontrun by an NLP account. */
  LIQUIDATION_FRONTRUN_BY_NLP: 2115,
  /** NLP burn amount is less than or equal to the burning fee. */
  BURN_NLP_AMOUNT_TOO_SMALL: 2116,
  /** Market is in post-only mode. */
  MARKET_POST_ONLY_MODE: 2117,
  /** Invalid builder ID or builder fee. */
  INVALID_BUILDER: 2118,
  /** Market is in reduce-only mode. */
  MARKET_REDUCE_ONLY_MODE: 2119,
  /** Cancel-and-place: place was aborted because the cancel was partially filled. */
  CANCEL_AND_PLACE_ORDER_FILLED: 2120,
  /** Cancel-and-place: place was aborted because the cancel failed. */
  CANCEL_AND_PLACE_CANCEL_FAILED: 2121,
  /** Market is in isolated-only mode. */
  MARKET_ISOLATED_ONLY_MODE: 2122,
  /** `required_unfilled_amount` is only valid for single-order cancellations. */
  REQUIRED_AMOUNT_MULTIPLE_CANCEL_ORDERS: 2123,
  /** Cancel order amount does not match the order's amount. */
  CANCEL_ORDER_AMOUNT_MISMATCH: 2124,
  /** Maximum of 10 isolated positions reached. */
  ISOLATED_SUBACCOUNT_LIMIT_REACHED: 2125,
  /** No eligible trigger found for the dependency digest. */
  NO_ELIGIBLE_TRIGGER: 2126,
} as const;

/**
 * Union of all known engine service API error codes.
 */
export type EngineErrorCode =
  (typeof ENGINE_ERROR_CODES)[keyof typeof ENGINE_ERROR_CODES];
