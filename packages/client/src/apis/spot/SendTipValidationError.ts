/** Stable reasons for a Tip helper validation failure before Mobile submission. */
export const SEND_TIP_VALIDATION_REASONS = Object.freeze({
  /** The connected wallet must own the sending subaccount. */
  OWNER_WALLET_REQUIRED: 'owner_wallet_required',
  /** The requested signing chain and endpoint must match the connected context. */
  SIGNING_CONTEXT_MISMATCH: 'signing_context_mismatch',
  /** The net amount must be a positive integer in native token units. */
  INVALID_AMOUNT: 'invalid_amount',
  /** The recipient must have a valid, nonzero deposit address. */
  RECIPIENT_DDA_UNAVAILABLE: 'recipient_dda_unavailable',
} as const);

/** Machine-readable reason for a {@link SendTipValidationError}. */
export type SendTipValidationReason =
  (typeof SEND_TIP_VALIDATION_REASONS)[keyof typeof SEND_TIP_VALIDATION_REASONS];

const SEND_TIP_VALIDATION_MESSAGES: Record<SendTipValidationReason, string> =
  Object.freeze({
    owner_wallet_required: "Connect the Tip sender's owner wallet.",
    signing_context_mismatch:
      'The Tip signing chain and endpoint must match the connected wallet and client.',
    invalid_amount:
      'Tip amount must be a positive integer in native token units.',
    recipient_dda_unavailable:
      'The Tip recipient deposit address is unavailable.',
  });

/** A Tip helper validation failure whose reason can be handled without parsing its message. */
export class SendTipValidationError extends Error {
  /** Stable failure reason, without wallet, signature, or withdrawal data. */
  readonly reason: SendTipValidationReason;

  /** Creates a local validation error for the specified Tip helper guard. */
  constructor(reason: SendTipValidationReason) {
    super(SEND_TIP_VALIDATION_MESSAGES[reason]);
    this.name = 'SendTipValidationError';
    this.reason = reason;
  }
}
