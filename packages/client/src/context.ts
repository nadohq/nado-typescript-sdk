import { ENGINE_CLIENT_ENDPOINTS, EngineClient } from '@nadohq/engine-client';
import {
  INDEXER_CLIENT_ENDPOINTS,
  IndexerClient,
  REWARDS_CLIENT_ENDPOINTS,
} from '@nadohq/indexer-client';
import { MOBILE_CLIENT_ENDPOINTS, MobileClient } from '@nadohq/mobile-client';
import { NUANZE_CLIENT_ENDPOINTS, NuanzeClient } from '@nadohq/nuanze-client';
import {
  ChainEnv,
  NADO_ABIS,
  NADO_DEPLOYMENTS,
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
  nuanzeClient: NuanzeClient;
  // If provided, identifies the calling client, sent as a header with every request made by the service clients above
  clientType?: string;
}

/**
 * Args for creating a context with custom endpoints
 */
interface NadoClientContextOpts {
  contractAddresses: NadoDeploymentAddresses;
  engineEndpoint: string;
  indexerEndpoint: string;
  // Rewards service base URL, including the version segment (ex. `https://api.prod.nado.xyz/rewards/v1`).
  // Defaults to `${indexerEndpoint}/rewards/v1`.
  rewardsEndpoint?: string;
  triggerEndpoint: string;
  mobileEndpoint: string;
  nuanzeEndpoint: string;
  clientType?: string;
}

/**
 * Args for creating a context with the default endpoints of a chain env
 */
interface NadoClientContextChainEnvOpts {
  chainEnv: ChainEnv;
  clientType?: string;
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
 */
export type CreateNadoClientContextOpts =
  | NadoClientContextOpts
  | NadoClientContextChainEnvOpts;

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
    rewardsEndpoint,
    triggerEndpoint,
    mobileEndpoint,
    nuanzeEndpoint,
    clientType,
  } = ((): NadoClientContextOpts => {
    // Custom endpoint options
    if (!('chainEnv' in opts)) {
      return opts;
    }

    const { chainEnv, clientType } = opts;
    return {
      contractAddresses: NADO_DEPLOYMENTS[chainEnv],
      engineEndpoint: ENGINE_CLIENT_ENDPOINTS[chainEnv],
      indexerEndpoint: INDEXER_CLIENT_ENDPOINTS[chainEnv],
      rewardsEndpoint: REWARDS_CLIENT_ENDPOINTS[chainEnv],
      triggerEndpoint: TRIGGER_CLIENT_ENDPOINTS[chainEnv],
      mobileEndpoint: MOBILE_CLIENT_ENDPOINTS[chainEnv],
      nuanzeEndpoint: NUANZE_CLIENT_ENDPOINTS[chainEnv],
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
      rewardsUrl: rewardsEndpoint,
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
    // Nuanze is read-only and credential-free, so it takes no signer or client type
    nuanzeClient: new NuanzeClient({
      url: nuanzeEndpoint,
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
