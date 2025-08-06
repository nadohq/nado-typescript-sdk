import { NadoAbis, NadoContractName } from '../nadoAbis';
import { WriteableContractInstance } from './viemTypes';

/**
 * Encapsulates the set of Nado contracts required for querying and executing, assumes that a wallet client is connected
 */
export type NadoContracts = {
  [name in NadoContractName]: WriteableContractInstance<NadoAbis[name]>;
};

// Utility types to bundle parameters with contracts
export type WithContracts<T> = T & NadoContracts;
export type WithContract<TContractName extends keyof NadoContracts, T> = T &
  Pick<NadoContracts, TContractName>;
