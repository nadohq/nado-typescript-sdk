import { ENGINE_CLIENT_ENDPOINTS, EngineClient } from '@nadohq/engine-client';
import {
  INDEXER_CLIENT_ENDPOINTS,
  IndexerClient,
} from '@nadohq/indexer-client';
import { MOBILE_CLIENT_ENDPOINTS, MobileClient } from '@nadohq/mobile-client';
import { NUANZE_CLIENT_ENDPOINTS, NuanzeClient } from '@nadohq/nuanze-client';
import { CHAIN_ENV_TO_CHAIN, NADO_DEPLOYMENTS } from '@nadohq/shared';
import {
  TRIGGER_CLIENT_ENDPOINTS,
  TriggerClient,
} from '@nadohq/trigger-client';
import { createPublicClient, createWalletClient, http } from 'viem';
import { nonceManager, privateKeyToAccount } from 'viem/accounts';
import { env } from './env';
import { RunContext } from './types';

/**
 * Creates a fully-initialized test context with wallet/public clients, endpoint
 * configuration, and pre-built service clients. Intended for use in `before()`
 * hooks.
 *
 * @returns A {@link RunContext} for the current chain environment.
 */
export function createTestContext(): RunContext {
  if (!env.privateKey) {
    throw new Error('No private key found. Please check .env');
  }

  const account = privateKeyToAccount(env.privateKey, { nonceManager });
  const chain = CHAIN_ENV_TO_CHAIN[env.chainEnv];

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  }) as RunContext['publicClient'];

  const endpoints = {
    engine: ENGINE_CLIENT_ENDPOINTS[env.chainEnv],
    indexer: INDEXER_CLIENT_ENDPOINTS[env.chainEnv],
    trigger: TRIGGER_CLIENT_ENDPOINTS[env.chainEnv],
    mobile: MOBILE_CLIENT_ENDPOINTS[env.chainEnv],
    nuanze: NUANZE_CLIENT_ENDPOINTS[env.chainEnv],
  };

  const contracts = NADO_DEPLOYMENTS[env.chainEnv];

  return {
    env,
    walletClient,
    walletClientAddress: walletClient.account.address,
    publicClient,
    chainId: chain.id,
    endpointAddr: contracts.endpoint,
    endpoints,
    contracts,
    engine: new EngineClient({
      url: endpoints.engine,
      walletClient,
    }),
    indexer: new IndexerClient({
      url: endpoints.indexer,
      walletClient,
    }),
    trigger: new TriggerClient({
      url: endpoints.trigger,
      walletClient,
    }),
    mobile: new MobileClient({
      url: endpoints.mobile,
      walletClient,
    }),
    // Nuanze is read-only and public, so it needs no wallet client
    nuanze: new NuanzeClient({
      url: endpoints.nuanze,
    }),
  };
}
