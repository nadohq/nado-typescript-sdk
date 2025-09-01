import { Address } from 'viem';
import { NadoContractName } from '../abis/nadoAbis';

import { ChainEnv } from '../types';
import { getValidatedAddress } from '../utils/getValidatedAddress';
import ArbitrumOneCoreDeployment from './core/deployment.arbitrumOne.json' with { type: 'json' };
import InkSepoliaCoreDeployment from './core/deployment.InkSepolia.json' with { type: 'json' };
import LocalCoreDeployment from './core/deployment.localhost.json' with { type: 'json' };

export type NadoDeploymentAddresses = {
  [name in NadoContractName]: Address;
};

/**
 * Known deployment addresses for the Nado contracts
 */
export const NADO_DEPLOYMENTS: Record<ChainEnv, NadoDeploymentAddresses> = {
  arbitrum: validateDeployment({
    ...ArbitrumOneCoreDeployment,
  }),
  inkTestnet: validateDeployment({
    ...InkSepoliaCoreDeployment,
  }),
  local: validateDeployment({
    ...LocalCoreDeployment,
  }),
};

function validateDeployment(
  deployment: Record<NadoContractName, string>,
): Record<NadoContractName, Address> {
  return {
    clearinghouse: getValidatedAddress(deployment.clearinghouse),
    endpoint: getValidatedAddress(deployment.endpoint),
    perpEngine: getValidatedAddress(deployment.perpEngine),
    querier: getValidatedAddress(deployment.querier),
    spotEngine: getValidatedAddress(deployment.spotEngine),
    withdrawPool: getValidatedAddress(deployment.withdrawPool),
  };
}
