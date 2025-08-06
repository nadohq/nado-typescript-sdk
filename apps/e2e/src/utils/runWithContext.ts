import { CHAIN_ENV_TO_CHAIN, NADO_DEPLOYMENTS } from '@nadohq/contracts';
import { ENGINE_CLIENT_ENDPOINTS } from '@nadohq/engine-client';
import { INDEXER_CLIENT_ENDPOINTS } from '@nadohq/indexer-client';
import { TRIGGER_CLIENT_ENDPOINTS } from '@nadohq/trigger-client';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { env } from './env';
import { RunContext, RunFn } from './types';

export async function runWithContext(runFn: RunFn) {
  const getWalletClient = () => {
    if (!env.privateKey) {
      throw new Error('No private key found. Please check .env');
    }
    const account = privateKeyToAccount(env.privateKey);

    return createWalletClient({
      account,
      chain: CHAIN_ENV_TO_CHAIN[env.chainEnv],
      transport: http(),
    });
  };

  const publicClient = createPublicClient({
    chain: CHAIN_ENV_TO_CHAIN[env.chainEnv],
    transport: http(),
    // The cast below is needed for some reason
  }) as RunContext['publicClient'];

  const context: RunContext = {
    env,
    getWalletClient,
    publicClient,
    endpoints: {
      engine: ENGINE_CLIENT_ENDPOINTS[env.chainEnv],
      indexer: INDEXER_CLIENT_ENDPOINTS[env.chainEnv],
      trigger: TRIGGER_CLIENT_ENDPOINTS[env.chainEnv],
    },
    contracts: NADO_DEPLOYMENTS[env.chainEnv],
  };

  await runFn(context);
}
