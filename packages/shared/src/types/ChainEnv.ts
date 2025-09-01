export const LOCAL_CHAIN_ENVS = ['local'] as const satisfies string[];

export const TESTNET_CHAIN_ENVS = ['inkTestnet'] as const satisfies string[];

export const MAINNET_CHAIN_ENVS = ['arbitrum'] as const satisfies string[];

export const ALL_CHAIN_ENVS = [
  ...LOCAL_CHAIN_ENVS,
  ...TESTNET_CHAIN_ENVS,
  ...MAINNET_CHAIN_ENVS,
] as const satisfies string[];

export type ChainEnv = (typeof ALL_CHAIN_ENVS)[number];
