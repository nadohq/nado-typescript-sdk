export interface NadoMatchOrdersTx {
  match_orders: {
    product_id: number;
  };
}

export interface NadoMatchOrdersRfqTx {
  match_orders_r_f_q: {
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

export interface NadoDepositCollateralTx {
  deposit_collateral: {
    sender: string;
    product_id: number;
    amount: string;
  };
}

export interface NadoTransferQuoteTx {
  transfer_quote: {
    sender: string;
    recipient: string;
    amount: string;
    nonce: number;
  };
}

export type NadoTx =
  | NadoMatchOrdersTx
  | NadoMatchOrdersRfqTx
  | NadoLiquidateSubaccountTx
  | NadoDepositCollateralTx
  | NadoTransferQuoteTx
  | NadoWithdrawCollateralTx
  | {
      // TODO: Populate all types
      [key: string]: never;
    };
