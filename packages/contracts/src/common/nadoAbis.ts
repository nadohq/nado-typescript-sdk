import {
  CLEARINGHOUSE_ABI,
  ENDPOINT_ABI,
  PERP_ENGINE_ABI,
  QUERIER_ABI,
  SPOT_ENGINE_ABI,
  WITHDRAW_POOL_ABI,
} from './abis';

export const NADO_ABIS = {
  querier: QUERIER_ABI,
  endpoint: ENDPOINT_ABI,
  clearinghouse: CLEARINGHOUSE_ABI,
  spotEngine: SPOT_ENGINE_ABI,
  perpEngine: PERP_ENGINE_ABI,
  withdrawPool: WITHDRAW_POOL_ABI,
} as const;

export type NadoAbis = typeof NADO_ABIS;

export type NadoContractName = keyof NadoAbis;
