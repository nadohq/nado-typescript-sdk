export interface NadoMatchOrdersTx {
  match_orders: {
    product_id: number;
  };
}

export interface NadoLiquidateSubaccountTx {
  liquidate_subaccount: {
    sender: string;
    liquidatee: string;
    // Encodes both products for a spread liquidation: (perp_id << 16) | spot_id
    // u32::MAX (4294967295) finalizes the subaccount instead of liquidating a product
    product_id: number;
    // Whether `product_id` encodes a spread liquidation
    is_encoded_spread: boolean;
    amount: string;
    nonce: number;
  };
}

/**
 * An auto-deleverage (ADL) transaction: closes a position against a counterparty
 * at the oracle price, without going through the orderbook.
 */
export interface NadoDeleverageTx {
  deleverage: {
    /** Hex encoded bytes32 subaccount */
    subaccount: string;
    /** Hex encoded bytes32 counterparty subaccount */
    counterparty: string;
    product_id: number;
    /** Amount deleveraged, in base units (x18) */
    amount: string;
    /** Oracle price of the deleverage, x18 */
    price_x18: string;
  };
}

export interface NadoWithdrawCollateralTx {
  withdraw_collateral: {
    sender: string;
    product_id: number;
    amount: string;
    nonce: number;
  };
}

export interface NadoWithdrawCollateralV2Tx {
  withdraw_collateral_v2: {
    sender: string;
    product_id: number;
    amount: string;
    nonce: number;
    // 20-byte recipient address; zero address sends to the subaccount owner
    send_to: string;
    // Reserved uint128 for forward-compatible withdrawal features
    appendix: string;
  };
}

export interface NadoDepositCollateralTx {
  deposit_collateral: {
    sender: string;
    product_id: number;
    amount: string;
  };
}

/** A `transfer_quote` (V1) transaction: a quote transfer charged the flat fee. */
export interface NadoTransferQuoteTx {
  transfer_quote: {
    sender: string;
    recipient: string;
    amount: string;
    nonce: number;
  };
}

/** A `transfer_quote_v2` transaction: a quote transfer charged a dynamic fee. */
export interface NadoTransferQuoteV2Tx {
  transfer_quote_v2: {
    /** Hex encoded bytes32; address + subaccount identifier */
    sender: string;
    /** Hex encoded bytes32 transfer recipient */
    recipient: string;
    /** Transferred amount, in quote x18 units */
    amount: string;
    /** Nonce used when signing */
    nonce: number;
  };
}

export type NadoTx =
  | NadoMatchOrdersTx
  | NadoLiquidateSubaccountTx
  | NadoDeleverageTx
  | NadoDepositCollateralTx
  | NadoTransferQuoteTx
  | NadoTransferQuoteV2Tx
  | NadoWithdrawCollateralTx
  | NadoWithdrawCollateralV2Tx
  | {
      // TODO: Populate all types
      [key: string]: never;
    };
