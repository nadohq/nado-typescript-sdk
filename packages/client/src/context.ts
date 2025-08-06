import {
  ChainEnv,
  NADO_ABIS,
  NADO_DEPLOYMENTS,
  NadoContractName,
  NadoContracts,
  NadoDeploymentAddresses,
  WalletClientWithAccount,
} from '@nadohq/contracts';
import { ENGINE_CLIENT_ENDPOINTS, EngineClient } from '@nadohq/engine-client';
import {
  INDEXER_CLIENT_ENDPOINTS,
  IndexerClient,
} from '@nadohq/indexer-client';
import {
  TRIGGER_CLIENT_ENDPOINTS,
  TriggerClient,
} from '@nadohq/trigger-client';
import { getContract, PublicClient } from 'viem';

/**
 * Context required to use the Nado client.
 */
export interface NadoClientContext {
  publicClient: PublicClient;
  walletClient?: WalletClientWithAccount;
  // If provided, this is used to sign engine transactions instead of the account associated with walletClient
  linkedSignerWalletClient?: WalletClientWithAccount;
  contracts: NadoContracts;
  contractAddresses: NadoDeploymentAddresses;
  engineClient: EngineClient;
  indexerClient: IndexerClient;
  triggerClient: TriggerClient;
}

/**
 * Args for creating a context
 */
interface NadoClientContextOpts {
  contractAddresses: NadoDeploymentAddresses;
  engineEndpoint: string;
  indexerEndpoint: string;
  triggerEndpoint: string;
}

/**
 * Args for signing configuration for creating a context
 */
export type CreateNadoClientContextAccountOpts = Pick<
  NadoClientContext,
  'walletClient' | 'linkedSignerWalletClient' | 'publicClient'
>;

export type CreateNadoClientContextOpts = NadoClientContextOpts | ChainEnv;

/**
 * Utility function to create client context from options
 *
 * @param opts
 * @param accountOpts
 */
export function createClientContext(
  opts: CreateNadoClientContextOpts,
  accountOpts: CreateNadoClientContextAccountOpts,
): NadoClientContext {
  const {
    contractAddresses,
    engineEndpoint,
    indexerEndpoint,
    triggerEndpoint,
  } = ((): NadoClientContextOpts => {
    // Custom options
    if (typeof opts === 'object') {
      return opts;
    }

    const chainEnv = opts;
    return {
      contractAddresses: NADO_DEPLOYMENTS[chainEnv],
      engineEndpoint: ENGINE_CLIENT_ENDPOINTS[chainEnv],
      indexerEndpoint: INDEXER_CLIENT_ENDPOINTS[chainEnv],
      triggerEndpoint: TRIGGER_CLIENT_ENDPOINTS[chainEnv],
    };
  })();
  const { publicClient, walletClient, linkedSignerWalletClient } = accountOpts;

  return {
    walletClient,
    linkedSignerWalletClient,
    publicClient,
    contracts: {
      querier: getNadoContract({
        contractAddresses,
        contractName: 'querier',
        walletClient,
        publicClient,
      }),
      clearinghouse: getNadoContract({
        contractAddresses,
        contractName: 'clearinghouse',
        walletClient,
        publicClient,
      }),
      endpoint: getNadoContract({
        contractAddresses,
        contractName: 'endpoint',
        walletClient,
        publicClient,
      }),
      spotEngine: getNadoContract({
        contractAddresses,
        contractName: 'spotEngine',
        walletClient,
        publicClient,
      }),
      perpEngine: getNadoContract({
        contractAddresses,
        contractName: 'perpEngine',
        walletClient,
        publicClient,
      }),
      withdrawPool: getNadoContract({
        contractAddresses,
        contractName: 'withdrawPool',
        walletClient,
        publicClient,
      }),
    },
    contractAddresses,
    engineClient: new EngineClient({
      url: engineEndpoint,
      walletClient,
      linkedSignerWalletClient,
    }),
    indexerClient: new IndexerClient({
      url: indexerEndpoint,
      walletClient,
    }),
    triggerClient: new TriggerClient({
      url: triggerEndpoint,
      walletClient,
      linkedSignerWalletClient,
    }),
  };
}

interface GetNadoContractParams<T extends NadoContractName> {
  contractAddresses: NadoDeploymentAddresses;
  contractName: T;
  walletClient?: WalletClientWithAccount;
  publicClient: PublicClient;
}

function getNadoContract<T extends NadoContractName>({
  contractAddresses,
  contractName,
  walletClient,
  publicClient,
}: GetNadoContractParams<T>): NadoContracts[T] {
  return getContract({
    address: contractAddresses[contractName],
    abi: NADO_ABIS[contractName],
    client: walletClient ?? publicClient,
  }) as NadoContracts[T];
}
