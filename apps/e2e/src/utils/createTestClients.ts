import { EngineClient } from '@nadohq/engine-client';
import { IndexerClient } from '@nadohq/indexer-client';
import { WalletClientWithAccount } from '@nadohq/shared';
import { TriggerClient } from '@nadohq/trigger-client';
import { Address } from 'viem';
import { createTestContext } from './runWithContext';
import { RunContext } from './types';

/**
 * Common test infrastructure returned by {@link createTestClients}.
 * Tests destructure only the fields they need.
 */
export interface TestClients {
  context: RunContext;
  walletClient: WalletClientWithAccount;
  walletClientAddress: string;
  chainId: number;
  endpointAddr: Address;
  engine: EngineClient;
  indexer: IndexerClient;
  trigger: TriggerClient;
}

/**
 * Creates the common set of clients and metadata shared by most E2E test
 * suites. Each suite can destructure only the fields it needs.
 *
 * @returns Fully-initialized test clients and wallet metadata.
 */
export function createTestClients(): TestClients {
  const context = createTestContext();
  const walletClient = context.getWalletClient();

  return {
    context,
    walletClient,
    walletClientAddress: walletClient.account.address,
    chainId: walletClient.chain.id,
    endpointAddr: context.contracts.endpoint,
    engine: new EngineClient({
      url: context.endpoints.engine,
      walletClient,
    }),
    indexer: new IndexerClient({
      url: context.endpoints.indexer,
      walletClient,
    }),
    trigger: new TriggerClient({
      url: context.endpoints.trigger,
      walletClient,
    }),
  };
}
