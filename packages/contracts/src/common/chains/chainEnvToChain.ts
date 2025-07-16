import { Chain } from 'viem';
import { arbitrum, arbitrumSepolia, localhost } from 'viem/chains';
import { ChainEnv } from '../types';

export const CHAIN_ENV_TO_CHAIN = {
  local: localhost,
  arbitrumTestnet: arbitrumSepolia,
  arbitrum: arbitrum,
} as const satisfies Record<ChainEnv, Chain>;

export const CHAIN_ID_TO_CHAIN_ENV = Object.fromEntries(
  Object.entries(CHAIN_ENV_TO_CHAIN).map(([chainEnv, chain]) => [
    chain.id,
    chainEnv,
  ]),
) as Record<number, ChainEnv>;
