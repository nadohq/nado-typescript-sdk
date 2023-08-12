export interface EngineServerSpotBalanceData {
  amount: string;
  last_cumulative_multiplier_x18: string;
}

export interface EngineServerSpotLpBalanceData {
  amount: string;
}

export interface EngineServerPerpBalanceData {
  amount: string;
  v_quote_balance: string;
  last_cumulative_funding_x18: string;
}

export interface EngineServerPerpLpBalanceData {
  amount: string;
  last_cumulative_funding_x18: string;
}

export interface EngineServerRisk {
  long_weight_initial_x18: string;
  short_weight_initial_x18: string;
  long_weight_maintenance_x18: string;
  short_weight_maintenance_x18: string;
  large_position_penalty_x18: string;
}

export interface EngineServerBookInfo {
  size_increment: string;
  price_increment_x18: string;
  min_size: string;
  collected_fees: string;
  lp_spread_x18: string;
}

export interface EngineServerSpotConfig {
  token: string;
  interest_inflection_util_x18: string;
  interest_floor_x18: string;
  interest_small_cap_x18: string;
  interest_large_cap_x18: string;
}

export interface EngineServerSpotState {
  cumulative_deposits_multiplier_x18: string;
  cumulative_borrows_multiplier_x18: string;
  total_deposits_normalized: string;
  total_borrows_normalized: string;
}

export interface EngineServerSpotLpState {
  supply: string;
  quote: EngineServerSpotBalanceData;
  base: EngineServerSpotBalanceData;
}

export interface EngineServerPerpState {
  cumulative_funding_long_x18: string;
  cumulative_funding_short_x18: string;
  available_settle: string;
  open_interest: string;
}

export interface EngineServerPerpLpState {
  supply: string;
  base: string;
  quote: string;
  last_cumulative_funding_x18: string;
  cumulative_funding_per_lp_x18: string;
}

export interface EngineServerSpotProduct {
  product_id: number;
  oracle_price_x18: string;
  risk: EngineServerRisk;
  config: EngineServerSpotConfig;
  state: EngineServerSpotState;
  lp_state: EngineServerSpotLpState;
  book_info: EngineServerBookInfo;
}

export interface EngineServerSpotBalance {
  product_id: number;
  balance: EngineServerSpotBalanceData;
  lp_balance: EngineServerSpotLpBalanceData;
}

export interface EngineServerPerpProduct {
  product_id: number;
  oracle_price_x18: string;
  index_price_x18: string;
  risk: EngineServerRisk;
  state: EngineServerPerpState;
  lp_state: EngineServerPerpLpState;
  book_info: EngineServerBookInfo;
}

export interface EngineServerPerpBalance {
  product_id: number;
  balance: EngineServerPerpBalanceData;
  lp_balance: EngineServerPerpLpBalanceData;
}

export type EngineServerProductType = 'perp' | 'spot';
