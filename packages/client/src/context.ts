import { ENGINE_CLIENT_ENDPOINTS, EngineClient } from '@nadohq/engine-client';
import {
  INDEXER_CLIENT_ENDPOINTS,
  IndexerClient,
} from '@nadohq/indexer-client';
import { MOBILE_CLIENT_ENDPOINTS, MobileClient } from '@nadohq/mobile-client';
import {
  ChainEnv,
  NADO_ABIS,
  NADO_DEPLOYMENTS,
  NadoClientType,
  NadoContractName,
  NadoContracts,
  NadoDeploymentAddresses,
  WalletClientWithAccount,
} from '@nadohq/shared';
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
  mobileClient: MobileClient;
  // Identifies the calling client, sent as a header with every request made by the service clients above
  clientType?: NadoClientType;
}

/**
 * Args for creating a context with custom endpoints
 */
interface NadoClientContextOpts {
  contractAddresses: NadoDeploymentAddresses;
  engineEndpoint: string;
  indexerEndpoint: string;
  triggerEndpoint: string;
  mobileEndpoint: string;
  clientType?: NadoClientType;
}

/**
 * Args for creating a context with the default endpoints of a chain env
 */
interface NadoClientContextChainEnvOpts {
  chainEnv: ChainEnv;
  clientType?: NadoClientType;
}

/**
 * Args for signing configuration for creating a context
 */
export type CreateNadoClientContextAccountOpts = Pick<
  NadoClientContext,
  'walletClient' | 'linkedSignerWalletClient' | 'publicClient'
>;

/**
 * Args for creating a context, either fully custom endpoints or a chain env with default endpoints.
 * A bare {@link ChainEnv} is equivalent to `{ chainEnv }`.
 */
export type CreateNadoClientContextOpts =
  | NadoClientContextOpts
  | NadoClientContextChainEnvOpts
  | ChainEnv;

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
    mobileEndpoint,
    clientType,
  } = ((): NadoClientContextOpts => {
    // Custom endpoint options
    if (typeof opts === 'object' && !('chainEnv' in opts)) {
      return opts;
    }

    const { chainEnv, clientType }: NadoClientContextChainEnvOpts =
      typeof opts === 'object' ? opts : { chainEnv: opts };
    return {
      contractAddresses: NADO_DEPLOYMENTS[chainEnv],
      engineEndpoint: ENGINE_CLIENT_ENDPOINTS[chainEnv],
      indexerEndpoint: INDEXER_CLIENT_ENDPOINTS[chainEnv],
      triggerEndpoint: TRIGGER_CLIENT_ENDPOINTS[chainEnv],
      mobileEndpoint: MOBILE_CLIENT_ENDPOINTS[chainEnv],
      clientType,
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
    clientType,
    engineClient: new EngineClient({
      url: engineEndpoint,
      walletClient,
      linkedSignerWalletClient,
      clientType,
    }),
    indexerClient: new IndexerClient({
      url: indexerEndpoint,
      walletClient,
      linkedSignerWalletClient,
      clientType,
    }),
    triggerClient: new TriggerClient({
      url: triggerEndpoint,
      walletClient,
      linkedSignerWalletClient,
      clientType,
    }),
    mobileClient: new MobileClient({
      url: mobileEndpoint,
      walletClient,
      linkedSignerWalletClient,
      clientType,
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
