export interface NadoMatchOrdersTx {
  match_orders: {
    product_id: number;
  };
}

export interface NadoLiquidateSubaccountTx {
  liquidate_subaccount: {
    sender: string;
    liquidatee: string;
    mode: number;
    // Also encodes health group for spread liquidation: (perp_id << 16) | spot_id
    product_id: number;
    amount: string;
    nonce: number;
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
  | NadoDepositCollateralTx
  | NadoTransferQuoteTx
  | NadoTransferQuoteV2Tx
  | NadoWithdrawCollateralTx
  | NadoWithdrawCollateralV2Tx
  | {
      // TODO: Populate all types
      [key: string]: never;
    };
