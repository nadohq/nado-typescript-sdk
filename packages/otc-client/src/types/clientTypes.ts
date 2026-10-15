import { EngineServerPlaceOrderParams } from '@nadohq/engine-client';
import { OtcQuoteSizeUnit } from './serverTypes';

/**
 * Signed Nado order the OTC service settles. An engine `place_order` payload without
 * `id`, `spot_leverage`, and `borrow_margin`.
 */
export type OtcServerTakerOrderParams = Omit<
  EngineServerPlaceOrderParams,
  'id' | 'spot_leverage' | 'borrow_margin'
>;

export interface OtcExecuteParams {
  /** Client-generated idempotency key, 1–128 bytes. Kept across retries of this intent. */
  dealId: string;
  taker: OtcServerTakerOrderParams;
  /** The route. The service requires it and has no default. */
  pricerId?: string;
}

export interface OtcGetExecutionStatusParams {
  dealId: string;
  takerDigest: string;
}

export interface OtcGetReadyParams {
  pricerId?: string;
}

export interface OtcGetAuthNonceParams {
  /** The 32-byte subaccount the login is bound to. */
  sender: string;
}

export interface OtcSiweMessageParams {
  /** Host of the page origin, e.g. `testnet.nado.xyz`. */
  domain: string;
  /** The page origin, with no path or trailing slash. */
  uri: string;
  /** The signing address, EIP-55 checksummed: the owner or the sender's linked signer. */
  address: string;
  chainId: number;
  nonce: string;
  /** `issued_at_ms` from the nonce response; a local clock can be rejected as future. */
  issuedAtMs: number;
  /** The same sender as the nonce request. */
  sender: string;
}

export interface OtcVerifyAuthParams {
  /** The SIWE text exactly as signed. */
  message: string;
  /** 65-byte hex `personal_sign` signature of `message`. */
  signature: string;
}

/**
 * Route coverage. HTTP 200 is ready; 400 and 503 are not. This does not guarantee liquidity
 * or that an order will be accepted.
 */
export interface OtcReadyResult {
  httpStatus: number;
  ready: boolean;
}

/**
 * One quote subscription. `wallet` is a 20-byte address, not a 32-byte subaccount.
 * `size` is a non-zero signed x18 integer string.
 */
export interface OtcQuoteStream {
  type: 'quote';
  productId: number;
  wallet: string;
  size: string;
  sizeUnit: OtcQuoteSizeUnit;
  /** The route. The service requires it and has no default. */
  pricerId?: string;
}

/** Subscribe or unsubscribe target: 1–100 streams, applied atomically. */
export interface OtcRfqSubscriptionParams {
  id: number;
  streams: OtcQuoteStream[];
}
