import { CLEARINGHOUSE_ABI } from './Clearinghouse';
import { ENDPOINT_ABI } from './Endpoint';
import { PERP_ENGINE_ABI } from './PerpEngine';
import { QUERIER_ABI } from './Querier';
import { SPOT_ENGINE_ABI } from './SpotEngine';
import { WITHDRAW_POOL_ABI } from './WithdrawPool';

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
