import { getValidatedAddress } from '@nadohq/utils';
import { Address } from 'viem';
import ArbitrumOneCoreDeployment from './core/deployment.arbitrumOne.json' with { type: 'json' };
import ArbitrumSepoliaCoreDeployment from './core/deployment.arbitrumSepolia.json' with { type: 'json' };
import LocalCoreDeployment from './core/deployment.localhost.json' with { type: 'json' };

import { ChainEnv } from '../types';
import { NadoContractName } from '../nadoAbis';

export type NadoDeploymentAddresses = {
  [name in NadoContractName]: Address;
};

/**
 * Known deployment addresses for the Nado contracts
 */
export const NADO_DEPLOYMENTS: Record<ChainEnv, NadoDeploymentAddresses> = {
  arbitrumTestnet: validateDeployment({
    ...ArbitrumSepoliaCoreDeployment,
  }),
  arbitrum: validateDeployment({
    ...ArbitrumOneCoreDeployment,
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
